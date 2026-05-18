# PEQUEÑO CÉSAR - GUÍA DE PRODUCCIÓN

## 1. PRE-REQUISITOS

### Hardware mínimo:
- **CPU**: 2 cores
- **RAM**: 4GB
- **Disco**: 100GB (SSD recomendado)
- **OS**: Ubuntu 22.04 LTS o similar

### Software:
```bash
docker --version      # >= 24.0
docker-compose --version  # >= 2.0
```

### AWS (Opcional, pero RECOMENDADO para backups off-site):
- Crear bucket S3: `pcesar-backups`
- IAM user con permisos S3
- Credenciales en `.env`

---

## 2. INSTALACIÓN INICIAL

### 2.1 Clonar/preparar el proyecto
```bash
cd /opt/pequeno-cesar  # o tu path de producción
```

### 2.2 Crear estructura de directorios
```bash
mkdir -p backups/{logical,physical,logs} \
         monitoring \
         nginx/{ssl,logs} \
         postgres
```

### 2.3 Copiar archivos de configuración
```bash
# Copia docker-compose-production.yml como docker-compose.yml
cp docker-compose-production.yml docker-compose.yml

# Copia init.sql
cp postgres/init.sql ./postgres/

# Copia configuraciones de monitoreo
cp monitoring/* ./monitoring/
```

### 2.4 Configurar .env
```bash
cp .env.production .env

# Editar con valores reales
nano .env
```

**Variables CRÍTICAS a cambiar:**
```bash
POSTGRES_PASSWORD=CAMBIAR_ESTO_AHORA_32_CARACTERES_FUERTE
JWT_SECRET=CAMBIAR_ESTO_AHORA_32_CARACTERES_FUERTE
DECOLECTA_API_TOKEN=TU_TOKEN_REAL_AQUI
GRAFANA_PASSWORD=CAMBIAR_ESTO_AHORA

# Si tienes AWS:
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
S3_BUCKET=pcesar-backups
```

### 2.5 Crear certificados SSL (si usas HTTPS con Nginx)
```bash
mkdir -p nginx/ssl
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout nginx/ssl/private.key \
  -out nginx/ssl/certificate.crt
```

---

## 3. DESPLIEGUE

### 3.1 Levantar servicios
```bash
docker-compose up -d
```

### 3.2 Verificar que todo está en línea
```bash
docker-compose ps

# Debe mostrar:
# postgres           UP (healthy)
# app                UP (healthy)
# postgres-exporter  UP
# prometheus         UP
# grafana            UP
# backup-logical     UP
# backup-physical    UP
# backup-s3-sync     UP (si AWS está configurado)
```

### 3.3 Ver logs
```bash
# Todos los servicios
docker-compose logs -f

# Un servicio específico
docker-compose logs -f app
docker-compose logs -f postgres
```

---

## 4. VERIFICACIÓN POST-DESPLIEGUE

### 4.1 Base de datos
```bash
# Conectar a PostgreSQL
docker exec -it cesar_db psql -U postgres -d cesar_db

# Dentro de psql:
\dt              # Ver tablas
\l               # Ver bases de datos
SELECT * FROM pg_stat_replication;  # Ver estado replicación
```

### 4.2 Aplicación Spring Boot
```bash
# Verificar actuator
curl http://localhost:8080/actuator/health

# Debe responder JSON con "status": "UP"
```

### 4.3 Grafana
```bash
# Acceder a Grafana
# http://localhost:3000
# Usuario: admin
# Password: (la de .env GRAFANA_PASSWORD)

# Crear dashboards desde Prometheus como datasource
```

### 4.4 Backups
```bash
# Ver logs de backup
tail -f backups/logs/logical.log
tail -f backups/logs/physical.log

# Listar respaldos
ls -lh backups/logical/
ls -lh backups/physical/

# Si está sincronizando a S3:
tail -f backups/logs/s3.log
```

---

## 5. MANTENIMIENTO DIARIO

### 5.1 Monitoreo
```bash
# Ver estado general
docker-compose ps

# Ver logs en tiempo real
docker-compose logs -f --tail=50

# Ver métricas en Grafana
# http://localhost:3000/d/postgres (si creaste el dashboard)
```

### 5.2 Backups
```bash
# Verificar que se ejecutan
ls -lh backups/logical/ | tail -5      # Debe tener un dump del día
ls -lh backups/physical/ | head -3     # Debe tener backup semanal

# Chequear logs
grep "ERROR" backups/logs/*.log
```

### 5.3 Espacio en disco
```bash
# Chequear disco
df -h

# Si llena: limpiar respaldos viejos manualmente
find backups/logical -type f -mtime +30 -delete
find backups/physical -type d -mtime +90 -exec rm -rf {} + 2>/dev/null
```

---

## 6. OPERACIONES COMUNES

### 6.1 Reiniciar PostgreSQL (sin perder datos)
```bash
docker-compose restart postgres
# Espera a que sea healthy: docker-compose logs postgres
```

### 6.2 Actualizar la aplicación
```bash
# Rebuild de app
docker-compose build app
docker-compose up -d app

# Espera a que sea healthy
docker-compose logs app
```

### 6.3 Restaurar desde backup
```bash
# Parar la aplicación (para no tener escrituras)
docker-compose down app

# Restaurar desde dump
docker exec -i cesar_db pg_restore \
  -U postgres -d cesar_db \
  < backups/logical/cesar_db_20250517_020000.dump

# Levantar de nuevo
docker-compose up -d app
```

### 6.4 Limpiar espacios en disco
```bash
# Limpiar logs comprimidos
docker system prune -a --volumes

# Limpiar backups > 30 días (CUIDADO)
find backups/logical -type f -mtime +30 -delete
find backups/physical -type d -mtime +90 -exec rm -rf {} + 2>/dev/null
```

---

## 7. ESCALADO (cuando crece el tráfico)

### 7.1 Aumentar recursos PostgreSQL
Editar `docker-compose.yml`, sección `postgres` → `command`:
```yaml
- "-c"
- "shared_buffers=512MB"    # Aumentar si tienes RAM
- "-c"
- "max_connections=400"      # Si aumentan conexiones
```

### 7.2 Agregar réplica (lectura)
Ver sección **Opción Avanzada: Replicación** al final.

### 7.3 Pasar a Patroni (failover automático)
Consultar: `8.b.ii Configuración de Alta Disponibilidad` (documento anterior)

---

## 8. ALERTAS Y TROUBLESHOOTING

### 8.1 PostgreSQL lento
```bash
# Ver queries lentas
docker exec cesar_db psql -U postgres -d cesar_db -c \
  "SELECT query, calls, mean_exec_time FROM pg_stat_statements \
   ORDER BY mean_exec_time DESC LIMIT 10;"

# Ejecutar VACUUM
docker exec cesar_db psql -U postgres -d cesar_db -c "VACUUM ANALYZE;"
```

### 8.2 Backup falló
```bash
# Chequear logs
cat backups/logs/logical.log | grep ERROR

# Verificar espacio en disco
df -h

# Reintentar manualmente
docker exec cesar_db_backup pg_dump -h postgres -U postgres -d cesar_db -Fc -f /backups/logical/manual_backup.dump
```

### 8.3 Aplicación desconectada
```bash
# Ver logs
docker logs pequeno_cesar | tail -50

# Verificar conectividad a BD
docker exec pequeno_cesar ping postgres

# Reiniciar
docker-compose restart app
```

### 8.4 S3 sync falla
```bash
# Chequear credenciales AWS
cat .env | grep AWS

# Probar conexión
docker run --rm amazon/aws-cli:latest s3 ls pcesar-backups/ \
  --access-key-id $AWS_ACCESS_KEY_ID \
  --secret-access-key $AWS_SECRET_ACCESS_KEY
```

---

## 9. SEGURIDAD

### 9.1 Cambiar contraseñas iniciales
```bash
# PostgreSQL
docker exec cesar_db psql -U postgres -d cesar_db \
  -c "ALTER USER postgres WITH PASSWORD 'nueva-password-fuerte';"

# Grafana
# Ir a http://localhost:3000 → Settings → Users → admin
```

### 9.2 Firewall
```bash
# Abrir solo puertos necesarios (ejemplo UFW)
sudo ufw allow 80/tcp      # HTTP
sudo ufw allow 443/tcp     # HTTPS
sudo ufw allow 22/tcp      # SSH (para admin)
# NO abrir 5432 (PostgreSQL) desde afuera
# NO abrir 9090 (Prometheus) desde afuera
```

### 9.3 Backups cifrados
```bash
# Los backups a S3 van con AES256 automático
# Verificar en aws.log que incluye: --sse AES256
```

---

## 10. MONITOREO EN PRODUCCIÓN

### Checklist diario:
- [ ] `docker-compose ps` → todos "Up"
- [ ] `df -h` → disco > 20% libre
- [ ] `tail backups/logs/logical.log` → sin errores
- [ ] `curl http://localhost:8080/actuator/health` → UP
- [ ] Grafana: revisar dashboards de PostgreSQL

### Checklist semanal:
- [ ] Backup físico ejecutado (domingo)
- [ ] S3 sync completado (sin errores)
- [ ] Top 10 queries lentas en Prometheus
- [ ] Espacio en disco del servidor

### Checklist mensual:
- [ ] Prueba de restauración desde backup
- [ ] Review de logs de seguridad
- [ ] Actualización de certificados SSL
- [ ] Análisis de capacidad (¿próxima escalada?)

---

## 11. SOPORTE Y CONTACTO

En caso de problemas:

1. **Revisar logs**: `docker-compose logs -f`
2. **Contactar DBA**: [correo equipo]
3. **Documentación**: https://docs.postgresql.org/16/
4. **Grafana**: http://localhost:3000 (métricas)

---

**Última actualización**: 2025-05-17  
**Versión**: 1.0  
**Responsable**: DevOps Team
