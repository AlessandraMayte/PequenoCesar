-- ============================================================
-- PEQUEÑO CÉSAR - Inicialización de Base de Datos (Producción)
-- Script basado EXACTAMENTE en las entidades de tu proyecto
-- 
-- SECCIÓN 8.b: ADMINISTRACIÓN Y REPLICACIÓN
-- - Archivado WAL para PITR
-- - Configuración pg_dump (lógico) diario
-- - Configuración pg_basebackup (físico) semanal
-- - Replicación streaming
-- ============================================================

-- ============================================================
-- EXTENSIONES POSTGRESQL
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- ============================================================
-- VERIFICACIÓN: CONFIGURACIÓN DE REPLICACIÓN Y WAL
-- 
-- IMPORTANTE: Las siguientes opciones DEBEN estar en:
-- - docker-compose.yml (sección command: de postgres)
-- - O en postgresql.conf si ejecutas PostgreSQL nativo
--
-- REQUERIDAS PARA pg_dump, pg_basebackup Y REPLICACIÓN:
-- ============================================================

-- Ver configuración actual:
-- SELECT name, setting FROM pg_settings 
-- WHERE name LIKE '%wal%' OR name LIKE '%archive%' OR name LIKE '%replication%';

-- Las siguientes líneas documentan qué DEBE estar configurado:
-- 
-- wal_level = replica                    ← REQUERIDO
-- max_wal_senders = 5                    ← REQUERIDO para replicación
-- wal_keep_size = 1GB                    ← REQUERIDO para retener WAL
-- archive_mode = on                      ← REQUERIDO para archivado
-- archive_command = 'cp %p /wal_archive/%f'  ← REQUERIDO para archivar WAL
-- max_connections = 200                  ← Aumentado para carga
-- shared_buffers = 256MB                 ← Aumentado para performance
-- 
-- Ver docker-compose.yml en la sección postgres → command:
-- para verificar que estas opciones estén presentes

-- ============================================================
-- USUARIO DE REPLICACIÓN (para pg_basebackup)
-- ============================================================

DO $$
BEGIN
    CREATE ROLE replicator WITH REPLICATION LOGIN ENCRYPTED PASSWORD 'replication-password-strong';
    GRANT REPLICATION ON DATABASE cesar_db TO replicator;
    GRANT EXECUTE ON FUNCTION pg_start_backup(text, boolean) TO replicator;
    GRANT EXECUTE ON FUNCTION pg_stop_backup() TO replicator;
EXCEPTION WHEN OTHERS THEN
    NULL;  -- El usuario ya existe
END
$$;

-- ============================================================
-- ÍNDICES PARA OPTIMIZACIÓN
-- (Las tablas serán creadas por Hibernate, estos son índices adicionales)
-- ============================================================

-- Índices en CLIENTES
CREATE INDEX IF NOT EXISTS idx_clientes_dni ON clientes(dni);
CREATE INDEX IF NOT EXISTS idx_clientes_creacion ON clientes(fecha_creacion DESC);

-- Índices en EMPLEADOS
CREATE INDEX IF NOT EXISTS idx_empleados_usuario ON empleados(usuario);
CREATE INDEX IF NOT EXISTS idx_empleados_estado ON empleados(estado);
CREATE INDEX IF NOT EXISTS idx_empleados_creacion ON empleados(fecha_creacion DESC);

-- Índices en PEDIDOS
CREATE INDEX IF NOT EXISTS idx_pedidos_cliente ON pedidos(id_cliente);
CREATE INDEX IF NOT EXISTS idx_pedidos_empleado ON pedidos(id_empleado);
CREATE INDEX IF NOT EXISTS idx_pedidos_fecha ON pedidos(fecha_hora DESC);
CREATE INDEX IF NOT EXISTS idx_pedidos_estado ON pedidos(estado);

-- Índices en PEDIDO_RECETAS
CREATE INDEX IF NOT EXISTS idx_pedido_recetas_pedido ON pedido_recetas(id_pedido);
CREATE INDEX IF NOT EXISTS idx_pedido_recetas_receta ON pedido_recetas(id_receta);

-- Índices en INVENTARIO
CREATE INDEX IF NOT EXISTS idx_inventario_estado ON inventario(estado);
CREATE INDEX IF NOT EXISTS idx_inventario_caducidad ON inventario(fecha_caducidad);
CREATE INDEX IF NOT EXISTS idx_inventario_creacion ON inventario(fecha_creacion DESC);

-- Índices en ALERTAS
CREATE INDEX IF NOT EXISTS idx_alertas_insumo ON alertas(id_insumo);
CREATE INDEX IF NOT EXISTS idx_alertas_estado ON alertas(estado);
CREATE INDEX IF NOT EXISTS idx_alertas_fecha ON alertas(fecha_hora DESC);

-- Índices en PROVEEDORES
CREATE INDEX IF NOT EXISTS idx_proveedores_ruc ON proveedores(ruc);
CREATE INDEX IF NOT EXISTS idx_proveedores_creacion ON proveedores(fecha_creacion DESC);

-- Índices en ORDENES_COMPRA
CREATE INDEX IF NOT EXISTS idx_oc_proveedor ON ordenes_compra(id_proveedor);
CREATE INDEX IF NOT EXISTS idx_oc_empleado ON ordenes_compra(id_empleado);
CREATE INDEX IF NOT EXISTS idx_oc_fecha ON ordenes_compra(fecha DESC);
CREATE INDEX IF NOT EXISTS idx_oc_estado ON ordenes_compra(estado);

-- Índices en ORDEN_COMPRA_INSUMOS
CREATE INDEX IF NOT EXISTS idx_oc_insumos_orden ON orden_compra_insumos(id_orden);
CREATE INDEX IF NOT EXISTS idx_oc_insumos_insumo ON orden_compra_insumos(id_insumo);

-- Índices en RECETAS
CREATE INDEX IF NOT EXISTS idx_recetas_estado ON recetas(estado);
CREATE INDEX IF NOT EXISTS idx_recetas_nombre ON recetas(nombre);

-- Índices en RECETA_INGREDIENTES
CREATE INDEX IF NOT EXISTS idx_recing_receta ON receta_ingredientes(id_receta);
CREATE INDEX IF NOT EXISTS idx_recing_insumo ON receta_ingredientes(id_insumo);

-- ============================================================
-- FUNCIONES Y TRIGGERS DE NEGOCIO
-- ============================================================

-- Trigger automático de alerta por stock mínimo
CREATE OR REPLACE FUNCTION fn_alerta_stock_minimo()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.stock_actual <= NEW.stock_minimo AND NEW.estado = 'Activo' THEN
        INSERT INTO alertas (tipo, fecha_hora, estado, id_insumo)
        VALUES ('STOCK_MINIMO', CURRENT_TIMESTAMP, 'Pendiente', NEW.id_insumo);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_alerta_stock ON inventario;
CREATE TRIGGER trg_alerta_stock
AFTER UPDATE OF stock_actual ON inventario
FOR EACH ROW EXECUTE FUNCTION fn_alerta_stock_minimo();

-- ============================================================
-- VISTAS ÚTILES PARA REPORTES Y ANÁLISIS
-- ============================================================

-- Vista 1: Ventas por día (para dashboard)
CREATE OR REPLACE VIEW v_ventas_por_dia AS
SELECT 
    DATE(p.fecha_hora) as fecha,
    COUNT(*) as total_pedidos,
    SUM(p.total) as monto_total,
    AVG(p.total) as ticket_promedio,
    COUNT(DISTINCT p.id_cliente) as clientes_unicos
FROM pedidos p
GROUP BY DATE(p.fecha_hora)
ORDER BY fecha DESC;

-- Vista 2: Inventario con stock bajo
CREATE OR REPLACE VIEW v_inventario_bajo AS
SELECT 
    i.id_insumo,
    i.nombre_insumo,
    i.stock_actual,
    i.stock_minimo,
    (i.stock_minimo - i.stock_actual) as deficit,
    i.unidad,
    i.fecha_caducidad,
    (SELECT COUNT(*) FROM alertas a WHERE a.id_insumo = i.id_insumo AND a.estado = 'Pendiente') as alertas_pendientes
FROM inventario i
WHERE i.stock_actual < i.stock_minimo
AND i.estado = 'Activo'
ORDER BY deficit DESC;

-- Vista 3: Productos más vendidos
CREATE OR REPLACE VIEW v_productos_populares AS
SELECT 
    r.id_receta,
    r.nombre,
    COUNT(pr.id_pedido_receta) as veces_vendido,
    SUM(pr.cantidad) as total_unidades,
    ROUND(AVG(pr.precio_unitario)::numeric, 2) as precio_promedio,
    SUM(pr.cantidad * pr.precio_unitario) as ingresos_totales
FROM recetas r
LEFT JOIN pedido_recetas pr ON r.id_receta = pr.id_receta
WHERE r.estado = 'Activo'
GROUP BY r.id_receta, r.nombre
ORDER BY veces_vendido DESC;

-- Vista 4: Ventas por empleado
CREATE OR REPLACE VIEW v_ventas_por_empleado AS
SELECT 
    e.id_empleado,
    e.nombres,
    e.apellidos,
    e.rol,
    COUNT(p.id_pedido) as total_pedidos,
    SUM(p.total) as monto_total,
    AVG(p.total) as ticket_promedio
FROM empleados e
LEFT JOIN pedidos p ON e.id_empleado = p.id_empleado
WHERE e.estado = 'Activo'
GROUP BY e.id_empleado, e.nombres, e.apellidos, e.rol
ORDER BY monto_total DESC;

-- Vista 5: Órdenes por proveedor
CREATE OR REPLACE VIEW v_ordenes_por_proveedor AS
SELECT 
    pr.id_proveedor,
    pr.nombre,
    COUNT(oc.id_orden) as total_ordenes,
    SUM(oci.cantidad) as total_insumos,
    MAX(oc.fecha) as ultima_orden,
    oc.estado
FROM proveedores pr
LEFT JOIN ordenes_compra oc ON pr.id_proveedor = oc.id_proveedor
LEFT JOIN orden_compra_insumos oci ON oc.id_orden = oci.id_orden
GROUP BY pr.id_proveedor, pr.nombre, oc.estado
ORDER BY total_ordenes DESC;

-- ============================================================
-- CONFIGURACIÓN DE PERFORMANCE Y AUTOVACUUM
-- ============================================================

-- Recolecta estadísticas iniciales
ANALYZE;

-- Configurar autovacuum más agresivo en tablas críticas (para mantener índices)
ALTER TABLE IF EXISTS pedidos SET (autovacuum_vacuum_scale_factor = 0.01);
ALTER TABLE IF EXISTS pedido_recetas SET (autovacuum_vacuum_scale_factor = 0.01);
ALTER TABLE IF EXISTS inventario SET (autovacuum_vacuum_scale_factor = 0.01);
ALTER TABLE IF EXISTS ordenes_compra SET (autovacuum_vacuum_scale_factor = 0.01);

-- ============================================================
-- ESTRATEGIA DE BACKUPS (Documentación)
-- 
-- BACKUP LÓGICO (pg_dump):
-- - Frecuencia: Diario a las 02:00
-- - Formato: CUSTOM (-Fc) comprimido
-- - Retención: 30 días
-- - Comando: pg_dump -h postgres -U postgres -d cesar_db -Fc -f backup.dump
-- - Servicio Docker: backup-logical
--
-- BACKUP FÍSICO (pg_basebackup):
-- - Frecuencia: Semanal (domingo a las 03:00)
-- - Tipo: Full cluster backup
-- - Retención: 90 días
-- - Comando: pg_basebackup -h postgres -U replicator -D /backups/physical/backup_DIR -Ft -z -P
-- - Servicio Docker: backup-physical
-- - REQUISITO: wal_level=replica en PostgreSQL
--
-- OFF-SITE (AWS S3):
-- - Frecuencia: Diario a las 04:00
-- - Destino: S3 bucket pcesar-backups
-- - Cifrado: AES256
-- - Servicio Docker: backup-s3-sync
-- - REQUISITO: Credenciales AWS en .env
--
-- ============================================================

-- ============================================================
-- MONITOREO Y LOGS
-- ============================================================

-- Habilitar logs detallados (ya configurado en docker-compose command:)
-- log_min_duration_statement = 1000  (queries > 1 segundo)
-- log_connections = on
-- log_disconnections = on
-- log_statement = all

-- Ver logs de archivado de WAL:
-- SELECT * FROM pg_stat_archiver;

-- Ver estado de replicación:
-- SELECT * FROM pg_stat_replication;

-- ============================================================
-- VERIFICACIÓN POST-INIT
-- ============================================================

-- Ejecutar estas consultas para verificar que todo está bien:
-- 
-- SELECT version();                                    -- Ver versión
-- SELECT name, setting FROM pg_settings 
--   WHERE name LIKE '%wal%' OR name LIKE '%replication%';  -- Ver config WAL
-- SELECT * FROM pg_stat_archiver;                     -- Ver archivado WAL
-- \l+                                                   -- Ver bases de datos
-- \dt+ public.*                                         -- Ver tablas
-- \di+ public.*                                         -- Ver índices

-- ============================================================
-- FIN DEL SCRIPT DE INICIALIZACIÓN
-- Las tablas serán creadas por Hibernate en el primer startup
-- ============================================================
