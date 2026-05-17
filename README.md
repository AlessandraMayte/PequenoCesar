# Pequeno Cesar

Sistema web para la gestion operativa de una tienda Little Caesars. El proyecto integra autenticacion por roles, control de empleados, clientes, pedidos, cocina, inventario, recetas, proveedores, ordenes de compra, alertas y reportes.

## Stack

- Java 17
- Spring Boot 3.2.5
- Spring Security con JWT
- Spring Data JPA
- PostgreSQL 16
- Thymeleaf
- HTML, CSS y JavaScript
- Docker y Docker Compose

## Modulos Principales

- Autenticacion y autorizacion por roles.
- Dashboard con KPIs operativos.
- Gestion de empleados con roles `GERENTE`, `CAJERO` y `COCINA`.
- Gestion de clientes y busqueda por DNI usando Decolecta.
- Registro y seguimiento de pedidos.
- Vista de cocina para atender pedidos.
- Inventario con stock minimo, alertas y control de vencimiento.
- Recetas con ingredientes por tamano.
- Proveedores y ordenes de compra.
- Reportes generales y reportes de pedidos.
- Backups periodicos de PostgreSQL en la carpeta `backups/`.

## Requisitos

- Docker Desktop
- Git

Para desarrollo local sin Docker tambien se requiere:

- JDK 17
- PostgreSQL
- Maven Wrapper incluido en el proyecto

## Configuracion

El proyecto usa variables de entorno. No subas archivos `.env` reales al repositorio.

1. Crea tu archivo local desde el ejemplo:

```powershell
Copy-Item .env.example .env
```

2. Edita `.env` y cambia los valores sensibles:

```env
POSTGRES_PASSWORD=change-me-with-a-strong-password
POSTGRES_HOST_PORT=5433
JWT_SECRET=change-me-with-at-least-32-characters
DECOLECTA_API_TOKEN=change-me
APP_HOST_PORT=8081
JWT_EXPIRATION_MS=900000
BACKUP_INTERVAL_SECONDS=86400
DEFAULT_ADMIN_ENABLED=false
DEFAULT_ADMIN_USER=admin
DEFAULT_ADMIN_PASSWORD=change-me-before-first-login
```

Variables importantes:

- `POSTGRES_PASSWORD`: contrasena del usuario `postgres`.
- `POSTGRES_HOST_PORT`: puerto local para PostgreSQL. Por defecto es `5433` para evitar conflictos con otro PostgreSQL local.
- `JWT_SECRET`: secreto usado para firmar tokens JWT. Usa al menos 32 caracteres.
- `DECOLECTA_API_TOKEN`: token para consultar DNI en Decolecta.
- `APP_HOST_PORT`: puerto local de la aplicacion. Por defecto es `8081`.
- `DEFAULT_ADMIN_ENABLED`: activa la creacion automatica del administrador inicial.

## Ejecucion con Docker

Levanta la base de datos, la aplicacion y el servicio de backup:

```powershell
docker-compose -f "docker-compose.yml" -p pequeocesar up -d
```

Verifica el estado:

```powershell
docker-compose -f "docker-compose.yml" -p pequeocesar ps
```

Con la configuracion por defecto, abre:

```text
http://localhost:8081
```

PostgreSQL queda disponible localmente en:

```text
localhost:5433
```

Dentro de Docker, la aplicacion se conecta a PostgreSQL por `postgres:5432`.

## Crear el Primer Administrador

Para crear un usuario administrador inicial, edita `.env` temporalmente:

```env
DEFAULT_ADMIN_ENABLED=true
DEFAULT_ADMIN_USER=admin
DEFAULT_ADMIN_PASSWORD=Admin123*
```

Recrea la aplicacion:

```powershell
docker-compose -f "docker-compose.yml" -p pequeocesar up -d --force-recreate app
```

Luego ingresa con el usuario configurado. El usuario se crea con rol `GERENTE`.

Cuando confirmes que puedes iniciar sesion, desactiva la creacion automatica:

```env
DEFAULT_ADMIN_ENABLED=false
```

Y reinicia otra vez:

```powershell
docker-compose -f "docker-compose.yml" -p pequeocesar up -d --force-recreate app
```

## Comandos Utiles

Ver logs de la aplicacion:

```powershell
docker logs -f pequeno_cesar
```

Detener servicios:

```powershell
docker-compose -f "docker-compose.yml" -p pequeocesar down
```

Detener servicios y borrar volumen de PostgreSQL:

```powershell
docker-compose -f "docker-compose.yml" -p pequeocesar down -v
```

Compilar localmente:

```powershell
.\mvnw.cmd clean package
```

Ejecutar pruebas:

```powershell
.\mvnw.cmd test
```

## Estructura

```text
src/main/java/utp/pequenoCesar
  config/        Configuracion de seguridad, JWT, mapeos y usuario inicial
  controller/    Controladores REST y controladores web
  dto/           Objetos request y response
  entity/        Entidades JPA
  exception/     Manejo global de errores
  repository/    Repositorios Spring Data JPA
  service/       Logica de negocio

src/main/resources
  static/         CSS, JavaScript e imagenes
  templates/      Vistas Thymeleaf
  application*.yml Configuracion por ambiente
```

## Notas de Seguridad

- `.env` esta ignorado por Git y no debe subirse.
- `.env.example` solo debe contener valores de ejemplo.
- Cambia `JWT_SECRET`, `POSTGRES_PASSWORD`, `DECOLECTA_API_TOKEN` y la contrasena del administrador antes de usar el sistema.
- No dejes `DEFAULT_ADMIN_ENABLED=true` despues de crear el primer administrador.
