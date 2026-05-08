# PanStock API - Backend MVP

PanStock es una API REST para la gestión de inventario de una sucursal de la franquicia **Dulce Hora**, ubicada en Avellaneda.

El objetivo del MVP es centralizar el control de productos, proveedores, stock por lotes, vencimientos, mermas, promociones y reportes básicos para reducir pérdidas económicas y operativas.

Este README está pensado para que cualquier integrante del equipo pueda:

- entender qué problema resuelve el proyecto;
- instalar las herramientas necesarias según su sistema operativo;
- cargar la misma base de datos mock;
- correr el backend localmente;
- probar los endpoints implementados;
- entender las reglas de negocio principales sin depender de documentación externa.

---

## 1. Problema que resuelve PanStock

Actualmente la panadería trabaja con una combinación de:

- sistema de franquicia;
- planillas Excel;
- remitos;
- etiquetas de colores;
- control visual;
- conocimiento operativo del dueño o encargado.

Esto genera problemas como:

- vencimientos no detectados a tiempo;
- desperdicio de mercadería;
- mermas poco trazables;
- dificultad para controlar productos externos;
- pérdida de información sobre proveedores no oficiales;
- dependencia del encargado para saber qué productos están próximos a vencer;
- falta de reportes claros para tomar decisiones.

El sistema de franquicia puede cubrir parte de los productos oficiales, pero no resuelve bien el control de productos externos como bebidas, café, productos Sin TACC, chocolates, insumos u otros proveedores.

PanStock busca resolver ese vacío con un backend simple, claro y defendible para un MVP universitario.

---

## 2. Estado actual del backend

En esta versión el backend ya cuenta con:

- CRUD de productos.
- CRUD de categorías.
- CRUD de proveedores.
- CRUD básico de usuarios, sin JWT.
- Ingreso de mercadería.
- Stock por lotes o partidas.
- Consulta de stock actual agrupado por producto.
- Consulta de lotes.
- Consulta de lotes próximos a vencer.
- Consulta de lotes vencidos.
- Semáforo de vencimientos.
- Registro de mermas.
- Cálculo de pérdida económica por merma.
- Ventas manuales con lógica FEFO.
- Ajustes manuales de stock.
- Promociones.
- Sugerencias de promociones para lotes próximos a vencer.
- Reportes básicos.
- Configuraciones editables desde API.
- Alertas básicas.
- Historial de movimientos de stock.

Por ahora **no se implementó JWT ni Spring Security completo**. Los usuarios y roles existen para trazabilidad y preparación futura, pero los endpoints todavía no están protegidos por autenticación.

---

## 3. Tecnologías usadas

- Java 21.
- Spring Boot.
- Spring Web.
- Spring Data JPA.
- Hibernate.
- MariaDB / MySQL.
- Maven.
- Lombok.
- Jakarta Validation.
- API REST.

### Nota importante sobre MariaDB

Durante el desarrollo se detectó un problema al usar el driver de MySQL contra MariaDB con versiones nuevas de Spring Boot / Hibernate. El error observado fue similar a:

```text
Unknown column 'RESERVED' in 'WHERE'
Unable to determine Dialect without JDBC metadata
```

Se resolvió usando el driver oficial de MariaDB.

Por eso, para que todos trabajemos igual, se recomienda usar:

```xml
<dependency>
    <groupId>org.mariadb.jdbc</groupId>
    <artifactId>mariadb-java-client</artifactId>
    <scope>runtime</scope>
</dependency>
```

Y en `application.properties`:

```properties
spring.datasource.url=jdbc:mariadb://localhost:3306/panstock_db
spring.datasource.driver-class-name=org.mariadb.jdbc.Driver
```

---

## 4. Estructura general del proyecto

```text
panstock-api/
  database/
    panstock_schema_mock.sql
  src/
    main/
      java/
        com/panstock/api/
          config/
          controller/
          dto/
            request/
            response/
          entity/
          enums/
          exception/
          mapper/
          repository/
          repository/jpa/
          repository/impl/
          service/
          service/impl/
      resources/
        application.properties
  pom.xml
  mvnw
  mvnw.cmd
  README.md
```

---

## 5. Arquitectura usada

Se usa una arquitectura por capas:

```text
Controller -> Service -> Repository propio -> Repository JPA -> Base de datos
```

Ejemplo con productos:

```text
ProductController
  -> ProductService
    -> ProductServiceImpl
      -> ProductRepository
        -> ProductRepositoryImpl
          -> ProductJpaRepository
            -> MariaDB / MySQL
```

La decisión importante es que los services no dependen directamente de `JpaRepository`, sino de interfaces propias del proyecto.

Esto permite explicar mejor la separación entre:

- capa HTTP;
- lógica de negocio;
- contratos de acceso a datos;
- implementación técnica con Spring Data JPA;
- base de datos.

También se usan DTOs y mappers:

```text
Entity -> Mapper -> Response DTO
Request DTO -> Service -> Entity
```

No se devuelven entidades JPA directamente desde los controllers porque eso puede generar:

- exposición innecesaria de campos internos;
- problemas con relaciones `LAZY`;
- JSON demasiado grandes;
- ciclos infinitos entre relaciones;
- acoplamiento entre API y modelo de persistencia.

---

## 6. Requisitos previos

Todos los integrantes deberían tener instalado:

1. Java 21.
2. Git.
3. MariaDB Server, recomendado.
4. Un cliente para administrar la base, por ejemplo DBeaver, MySQL Workbench o phpMyAdmin.
5. VS Code, IntelliJ IDEA u otro IDE compatible con Java.
6. Maven Wrapper incluido en el proyecto, por lo que no es obligatorio instalar Maven globalmente.

---

# 7. Instalación por sistema operativo

## 7.1. Windows

### Herramientas recomendadas

Instalar:

- Java 21.
- Git for Windows.
- MariaDB Server o MySQL Server.
- DBeaver o MySQL Workbench.
- VS Code o IntelliJ IDEA.

### Verificar Java

Abrir PowerShell o CMD:

```powershell
java -version
```

Debe aparecer Java 21.

### Verificar MySQL/MariaDB

Si el comando está en el PATH:

```powershell
mysql --version
```

O:

```powershell
mariadb --version
```

Si no funciona, usar la ruta completa. Ejemplo con MySQL:

```powershell
"C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" --version
```

Ejemplo con MariaDB:

```powershell
"C:\Program Files\MariaDB 11.4\bin\mariadb.exe" --version
```

La ruta exacta puede cambiar según la versión instalada.

### Iniciar el servicio de base de datos en Windows

Opción gráfica:

1. Abrir `Servicios`.
2. Buscar `MariaDB` o `MySQL`.
3. Verificar que esté iniciado.
4. Si está detenido, hacer clic derecho y elegir `Iniciar`.

Opción PowerShell como administrador, si el servicio se llama `MariaDB`:

```powershell
net start MariaDB
```

Si se llama distinto, revisar el nombre exacto desde `Servicios`.

---

## 7.2. macOS

### Instalar con Homebrew

Si usan Homebrew:

```bash
brew install openjdk@21
brew install mariadb
brew install git
```

Iniciar MariaDB:

```bash
brew services start mariadb
```

Verificar Java:

```bash
java -version
```

Verificar MariaDB:

```bash
mariadb --version
```

Si Java 21 no queda como versión por defecto, puede ser necesario configurar `JAVA_HOME` según la instalación local.

---

## 7.3. Linux Debian / Ubuntu

Instalar Java, Git y MariaDB:

```bash
sudo apt update
sudo apt install openjdk-21-jdk git mariadb-server mariadb-client
```

Iniciar MariaDB:

```bash
sudo systemctl start mariadb
```

Verificar estado:

```bash
sudo systemctl status mariadb
```

Salir del estado con `q`.

### Nota para quienes tengan LAMPP/XAMPP

Si tienen LAMPP/XAMPP instalado, puede haber dos clientes distintos de MySQL/MariaDB.

Para revisar cuál se está usando:

```bash
type -a mysql
type -a mariadb
```

Para usar el MariaDB del sistema y no el de LAMPP:

```bash
/usr/bin/mariadb
```

Esto evita mezclar el proyecto con una instalación local usada para otros trabajos, como Bondarea.

---

# 8. Clonar el proyecto

```bash
git clone URL_DEL_REPOSITORIO
cd panstock-api
```

Si el repositorio padre tiene varias carpetas, entrar a la carpeta del backend:

```bash
cd panstock-api
```

---

# 9. Cargar la base de datos mock

El archivo principal es:

```text
database/panstock_schema_mock.sql
```

Este script crea:

- base de datos `panstock_db`;
- tablas principales del MVP;
- usuarios mock;
- categorías;
- proveedores;
- productos de franquicia;
- productos externos mock;
- reglas de duración de productos;
- lotes de stock;
- movimientos de stock;
- mermas;
- promociones;
- alertas;
- configuración inicial.

> Importante: si la base `panstock_db` ya existe, el script puede borrarla y recrearla. No usar con datos reales.

---

## 9.1. Cargar usando DBeaver o MySQL Workbench

1. Abrir DBeaver o MySQL Workbench.
2. Conectarse al servidor local.
3. Abrir el archivo:

```text
database/panstock_schema_mock.sql
```

4. Ejecutar todo el script.
5. Verificar que exista la base:

```sql
SHOW DATABASES;
```

6. Usar la base:

```sql
USE panstock_db;
SHOW TABLES;
```

---

## 9.2. Cargar desde terminal en Windows

Desde la carpeta del backend:

```powershell
mysql -u root -p < database\panstock_schema_mock.sql
```

O si usan MariaDB:

```powershell
mariadb -u root -p < database\panstock_schema_mock.sql
```

Si el comando no está en el PATH, usar la ruta completa. Ejemplo:

```powershell
"C:\Program Files\MariaDB 11.4\bin\mariadb.exe" -u root -p < database\panstock_schema_mock.sql
```

---

## 9.3. Cargar desde terminal en macOS

Desde la carpeta del backend:

```bash
mariadb -u root -p < database/panstock_schema_mock.sql
```

Si el root local no tiene contraseña, puede funcionar así:

```bash
mariadb < database/panstock_schema_mock.sql
```

---

## 9.4. Cargar desde terminal en Linux Debian / Ubuntu

Desde la carpeta del backend:

```bash
sudo /usr/bin/mariadb < database/panstock_schema_mock.sql
```

Verificar:

```bash
sudo /usr/bin/mariadb
```

Dentro de MariaDB:

```sql
USE panstock_db;
SHOW TABLES;
SELECT id, name, origin, perishable FROM products LIMIT 10;
EXIT;
```

---

# 10. Crear usuario para Spring Boot

Para no usar `root` desde Spring Boot, todos usamos el mismo usuario local:

```text
Usuario: panstock_user
Contraseña: panstock123
Base: panstock_db
```

Ejecutar dentro de MySQL/MariaDB:

```sql
CREATE USER IF NOT EXISTS 'panstock_user'@'localhost' IDENTIFIED BY 'panstock123';
GRANT ALL PRIVILEGES ON panstock_db.* TO 'panstock_user'@'localhost';
FLUSH PRIVILEGES;
```

Verificar conexión:

```bash
mariadb -u panstock_user -p panstock_db
```

Contraseña:

```text
panstock123
```

Dentro:

```sql
SHOW TABLES;
SELECT COUNT(*) FROM products;
EXIT;
```

En Linux Debian / Ubuntu, si el comando `mariadb` apunta a LAMPP/XAMPP, usar:

```bash
/usr/bin/mariadb -u panstock_user -p panstock_db
```

---

# 11. Configuración de Spring Boot

Editar:

```text
src/main/resources/application.properties
```

## 11.1. Configuración recomendada con MariaDB

```properties
spring.datasource.url=jdbc:mariadb://localhost:3306/panstock_db
spring.datasource.username=panstock_user
spring.datasource.password=panstock123
spring.datasource.driver-class-name=org.mariadb.jdbc.Driver

spring.jpa.hibernate.ddl-auto=validate
spring.jpa.show-sql=true
spring.jpa.properties.hibernate.format_sql=true
spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.MariaDBDialect

server.port=8081
```

### Sobre `ddl-auto=validate`

La opción:

```properties
spring.jpa.hibernate.ddl-auto=validate
```

significa que Hibernate valida que las entidades Java coincidan con las tablas existentes. No crea ni modifica la base automáticamente.

Esto es bueno para trabajar en equipo porque obliga a que todos tengan el mismo esquema cargado desde el SQL.

Si aparece un error de validación, normalmente significa que:

- no se cargó el SQL actualizado;
- se está apuntando a otra base;
- falta una tabla;
- falta una columna;
- una entidad Java no coincide con el esquema.

---

## 11.2. Puerto del backend

Por defecto Spring Boot corre en:

```text
http://localhost:8080
```

En este proyecto se puede usar:

```properties
server.port=8081
```

Entonces la API queda en:

```text
http://localhost:8081
```

Esto ayuda a evitar conflictos con otros servicios que usen el puerto 8080, como Apache, LAMPP/XAMPP u otros proyectos.

---

# 12. Dependencias importantes en Maven

En `pom.xml`, debe existir la dependencia del driver de MariaDB:

```xml
<dependency>
    <groupId>org.mariadb.jdbc</groupId>
    <artifactId>mariadb-java-client</artifactId>
    <scope>runtime</scope>
</dependency>
```

También se usan dependencias como:

- Spring Web.
- Spring Data JPA.
- Lombok.
- Jakarta Validation.
- DevTools, si está configurado.

Para que todos trabajemos igual, se recomienda mantener MariaDB y no cambiar a otro driver salvo que todo el equipo lo acuerde.

---

# 13. Correr el backend

## Linux / macOS

Desde la carpeta `panstock-api`:

```bash
./mvnw spring-boot:run
```

## Windows

Desde la carpeta `panstock-api`:

```powershell
.\mvnw.cmd spring-boot:run
```

También se puede correr desde VS Code o IntelliJ usando la clase principal:

```text
com.panstock.api.PanstockApiApplication
```

Si todo está bien, debería aparecer en consola que Tomcat levantó en el puerto configurado, por ejemplo:

```text
Tomcat started on port 8081
```

---

# 14. Extensiones recomendadas para VS Code

Instalar:

- Extension Pack for Java.
- Spring Boot Extension Pack.
- Lombok Annotations Support for VS Code.

Pasos:

1. Abrir Extensions con `Ctrl + Shift + X`.
2. Buscar cada extensión.
3. Instalar.
4. Cerrar y abrir VS Code.
5. Abrir la carpeta `panstock-api`.

---

# 15. URL base de la API

Si usan puerto 8080:

```text
http://localhost:8080
```

Si usan puerto 8081:

```text
http://localhost:8081
```

En los ejemplos de este README se usa `8081`, porque fue el puerto configurado para evitar conflictos.

Importante: el backend no tiene una página principal en `/`.

Si entran a:

```text
http://localhost:8081/
```

puede aparecer la Whitelabel Error Page. Eso no significa que la API esté rota. Hay que probar endpoints `/api/...`, por ejemplo:

```text
http://localhost:8081/api/products
```

---

# 16. Convenciones generales de la API

## 16.1. Formato

La API recibe y devuelve JSON.

En requests `POST`, `PUT` y `PATCH`, usar header:

```http
Content-Type: application/json
```

## 16.2. Bajas lógicas

En varios módulos, el `DELETE` no borra físicamente la fila, sino que desactiva el registro.

Ejemplos:

- productos: `active = false`;
- categorías: `active = false`;
- proveedores: `active = false`;
- usuarios: `enabled = false`.

Esto conserva historial y evita romper relaciones existentes.

## 16.3. Fechas

Fechas simples:

```text
YYYY-MM-DD
```

Ejemplo:

```text
2026-05-08
```

Fechas con hora:

```text
YYYY-MM-DDTHH:mm:ss
```

Ejemplo:

```text
2026-05-08T16:00:00
```

## 16.4. Enums principales

### `ProductOrigin`

```text
FRANCHISE
EXTERNAL
```

### `SupplierType`

```text
FRANCHISE
WHOLESALER
EXTERNAL
```

### `UnitType`

```text
UNIT
KG
GRAM
LITER
ML
PACKAGE
BOX
```

Los valores exactos deben coincidir con el enum definido en el código.

### `StorageType`

Ejemplos usados:

```text
FRIDGE
FREEZER
DISPLAY
STORAGE
ROOM_TEMPERATURE
```

### `BatchStatus`

```text
AVAILABLE
DEPLETED
EXPIRED
DISCARDED
```

### `StockMovementType`

```text
ENTRY
WASTE
SALE
ADJUSTMENT_IN
ADJUSTMENT_OUT
```

### `WasteReason`

Ejemplos:

```text
EXPIRED
DAMAGED
BROKEN_COLD_CHAIN
QUALITY_ISSUE
OTHER
```

### `Role`

```text
ADMIN_OWNER
MANAGER
EMPLOYEE
```

---

# 17. Documentación de endpoints

En los ejemplos se usa:

```text
http://localhost:8081
```

Si el proyecto corre en `8080`, reemplazar `8081` por `8080`.

---

## 17.1. Productos

### Endpoints

| Método | URL | Descripción |
|---|---|---|
| GET | `/api/products` | Lista productos. |
| GET | `/api/products?activeOnly=true` | Lista productos activos. |
| GET | `/api/products?activeOnly=false` | Lista todos los productos. |
| GET | `/api/products?origin=FRANCHISE` | Lista productos de franquicia. |
| GET | `/api/products?origin=EXTERNAL` | Lista productos externos. |
| GET | `/api/products?categoryId=1` | Lista productos por categoría. |
| GET | `/api/products/{id}` | Obtiene un producto por ID. |
| POST | `/api/products` | Crea un producto. |
| PUT | `/api/products/{id}` | Actualiza un producto. |
| DELETE | `/api/products/{id}` | Baja lógica de un producto. |

### Crear producto externo

```bash
curl -X POST http://localhost:8081/api/products \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Barrita de cereal externa",
    "description": "Producto externo mock",
    "categoryId": 7,
    "defaultSupplierId": 6,
    "origin": "EXTERNAL",
    "perishable": true,
    "unitType": "UNIT",
    "costPrice": 500.00,
    "salePrice": 1200.00,
    "minimumStock": 10,
    "active": true
  }'
```

### Regla importante

Un producto no guarda stock total en la tabla `products`. El stock se calcula a partir de sus lotes disponibles en `inventory_batches`.

---

## 17.2. Categorías

### Endpoints

| Método | URL | Descripción |
|---|---|---|
| GET | `/api/categories` | Lista categorías. |
| GET | `/api/categories?activeOnly=true` | Lista solo categorías activas. |
| GET | `/api/categories/{id}` | Obtiene una categoría por ID. |
| POST | `/api/categories` | Crea una categoría. |
| PUT | `/api/categories/{id}` | Actualiza una categoría. |
| DELETE | `/api/categories/{id}` | Baja lógica de una categoría. |

### Crear categoría

```bash
curl -X POST http://localhost:8081/api/categories \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Lácteos",
    "description": "Productos refrigerados derivados de leche",
    "active": true
  }'
```

### Actualizar categoría

```bash
curl -X PUT http://localhost:8081/api/categories/1 \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Panadería",
    "description": "Productos principales de panadería",
    "active": true
  }'
```

---

## 17.3. Proveedores

### Endpoints

| Método | URL | Descripción |
|---|---|---|
| GET | `/api/suppliers` | Lista proveedores. |
| GET | `/api/suppliers?activeOnly=true` | Lista proveedores activos. |
| GET | `/api/suppliers?supplierType=EXTERNAL` | Lista proveedores por tipo. |
| GET | `/api/suppliers/{id}` | Obtiene un proveedor por ID. |
| POST | `/api/suppliers` | Crea un proveedor. |
| PUT | `/api/suppliers/{id}` | Actualiza un proveedor. |
| DELETE | `/api/suppliers/{id}` | Baja lógica de un proveedor. |

### Crear proveedor

```bash
curl -X POST http://localhost:8081/api/suppliers \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Distribuidora La Nueva",
    "supplierType": "EXTERNAL",
    "contactName": "Carlos Pérez",
    "phone": "11-4444-5555",
    "email": "ventas@lanueva.com",
    "notes": "Proveedor externo de bebidas y snacks.",
    "active": true
  }'
```

### Tipos de proveedor

```text
FRANCHISE   -> proveedor oficial de franquicia
WHOLESALER  -> mayorista
EXTERNAL    -> proveedor externo directo
```

---

## 17.4. Usuarios básicos

### Endpoints

| Método | URL | Descripción |
|---|---|---|
| GET | `/api/users` | Lista usuarios. |
| GET | `/api/users?enabledOnly=true` | Lista usuarios habilitados. |
| GET | `/api/users?role=MANAGER` | Lista usuarios por rol. |
| GET | `/api/users/{id}` | Obtiene un usuario por ID. |
| POST | `/api/users` | Crea un usuario. |
| PUT | `/api/users/{id}` | Actualiza un usuario. |
| DELETE | `/api/users/{id}` | Deshabilita un usuario. |

### Crear usuario

```bash
curl -X POST http://localhost:8081/api/users \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Sofía",
    "lastName": "Gómez",
    "email": "sofia@panstock.local",
    "password": "1234",
    "role": "EMPLOYEE",
    "enabled": true
  }'
```

### Actualizar usuario sin cambiar contraseña

```bash
curl -X PUT http://localhost:8081/api/users/4 \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Sofía",
    "lastName": "Gómez",
    "email": "sofia@panstock.local",
    "password": null,
    "role": "MANAGER",
    "enabled": true
  }'
```

### Nota de seguridad

Por ahora las contraseñas son parte del modelo mock y no se implementó autenticación real. En una versión posterior deberían guardarse hasheadas con BCrypt y proteger endpoints con Spring Security/JWT.

---

## 17.5. Stock e ingresos de mercadería

### Endpoints

| Método | URL | Descripción |
|---|---|---|
| GET | `/api/stock` | Stock actual agrupado por producto. |
| GET | `/api/stock/batches` | Lista todos los lotes. |
| GET | `/api/stock/batches/{id}` | Obtiene un lote por ID. |
| POST | `/api/stock/entries` | Registra ingreso de mercadería. |
| GET | `/api/stock/expiring` | Lotes próximos a vencer según configuración. |
| GET | `/api/stock/expiring?days=5` | Lotes que vencen dentro de 5 días. |
| GET | `/api/stock/expired` | Lotes vencidos. |

### Registrar ingreso de mercadería

```bash
curl -X POST http://localhost:8081/api/stock/entries \
  -H "Content-Type: application/json" \
  -d '{
    "productId": 1,
    "supplierId": 1,
    "receivedDate": "2026-05-08",
    "expirationDate": "2026-05-10",
    "quantity": 20,
    "unitCost": 250.00,
    "unitSalePrice": 700.00,
    "storageType": "FRIDGE",
    "notes": "Ingreso de prueba"
  }'
```

### Reglas implementadas

- Si el producto es perecedero, el ingreso debe tener `expirationDate`.
- Si no es perecedero, `expirationDate` puede ser `null`.
- La cantidad debe ser mayor a cero.
- La fecha de vencimiento no puede ser anterior a la fecha de ingreso.
- Cada ingreso crea un lote nuevo.
- Cada ingreso crea un movimiento de stock `ENTRY`.

---

## 17.6. Ventas manuales y ajustes de stock

### Endpoints

| Método | URL | Descripción |
|---|---|---|
| POST | `/api/stock/sales` | Registra una venta manual y descuenta stock con FEFO. |
| POST | `/api/stock/adjustments` | Registra un ajuste manual de stock. |

### Venta manual

```bash
curl -X POST http://localhost:8081/api/stock/sales \
  -H "Content-Type: application/json" \
  -d '{
    "productId": 1,
    "userId": 2,
    "quantity": 5,
    "notes": "Venta manual de prueba"
  }'
```

### Regla FEFO

Para ventas manuales se usa FEFO:

```text
First Expired, First Out
```

Esto significa que se descuenta primero del lote que vence antes.

Si hay lotes sin fecha de vencimiento, se usan después de los lotes con vencimiento, ordenados por fecha de ingreso.

La venta:

- no permite vender más stock del disponible;
- no vende lotes vencidos;
- puede descontar de más de un lote;
- crea movimientos `SALE`.

### Ajuste positivo

```bash
curl -X POST http://localhost:8081/api/stock/adjustments \
  -H "Content-Type: application/json" \
  -d '{
    "batchId": 1,
    "userId": 2,
    "adjustmentType": "IN",
    "quantity": 3,
    "notes": "Corrección por recuento físico"
  }'
```

### Ajuste negativo

```bash
curl -X POST http://localhost:8081/api/stock/adjustments \
  -H "Content-Type: application/json" \
  -d '{
    "batchId": 1,
    "userId": 2,
    "adjustmentType": "OUT",
    "quantity": 2,
    "notes": "Diferencia detectada en recuento físico"
  }'
```

El ajuste negativo no permite dejar el lote con stock negativo.

---

## 17.7. Historial de movimientos de stock

### Endpoints

| Método | URL | Descripción |
|---|---|---|
| GET | `/api/stock/movements` | Lista movimientos de stock. |
| GET | `/api/stock/movements/{id}` | Obtiene un movimiento por ID. |
| GET | `/api/stock/movements?productId=1` | Filtra por producto. |
| GET | `/api/stock/movements?batchId=1` | Filtra por lote. |
| GET | `/api/stock/movements?movementType=SALE` | Filtra por tipo de movimiento. |
| GET | `/api/stock/movements?from=2026-05-08&to=2026-05-08` | Filtra por rango de fechas. |

### Ejemplos

```bash
curl "http://localhost:8081/api/stock/movements"
```

```bash
curl "http://localhost:8081/api/stock/movements?productId=1&movementType=SALE"
```

```bash
curl "http://localhost:8081/api/stock/movements?from=2026-05-08&to=2026-05-08"
```

### Tipos de movimiento

```text
ENTRY           -> ingreso de mercadería
WASTE           -> merma
SALE            -> venta manual
ADJUSTMENT_IN   -> ajuste positivo
ADJUSTMENT_OUT  -> ajuste negativo
```

Este módulo permite trazabilidad: saber qué pasó, cuándo pasó y sobre qué producto/lote pasó.

---

## 17.8. Mermas

### Endpoints

| Método | URL | Descripción |
|---|---|---|
| GET | `/api/waste-records` | Lista mermas registradas. |
| GET | `/api/waste-records/{id}` | Obtiene una merma por ID. |
| POST | `/api/waste-records` | Registra una merma y descuenta stock. |

### Registrar merma

Usar un `batchId` existente.

```bash
curl -X POST http://localhost:8081/api/waste-records \
  -H "Content-Type: application/json" \
  -d '{
    "batchId": 1,
    "userId": 3,
    "quantity": 2,
    "reason": "EXPIRED",
    "notes": "Merma de prueba"
  }'
```

### Reglas implementadas

Al registrar una merma:

1. Se valida que el lote exista.
2. Se valida que la cantidad sea mayor a cero.
3. Se valida que la cantidad no supere el stock disponible del lote.
4. Se calcula la pérdida económica.
5. Se descuenta stock del lote.
6. Si el lote queda en cero, se marca como `DEPLETED`.
7. Se crea un movimiento de stock `WASTE`.

### Cálculo de pérdida económica

Por ahora:

```text
economicLoss = quantity * unitSalePrice
```

Se usa el precio de venta del lote. Si no existe, se usa el precio del producto.

---

## 17.9. Dashboard

### Endpoints

| Método | URL | Descripción |
|---|---|---|
| GET | `/api/dashboard/expiration-semaphore` | Dashboard con semáforo de vencimientos. |

### Ejemplo

```bash
curl http://localhost:8081/api/dashboard/expiration-semaphore
```

El dashboard resume lotes según su estado de vencimiento.

---

## 17.10. Promociones

### Endpoints

| Método | URL | Descripción |
|---|---|---|
| GET | `/api/promotions/suggestions` | Sugiere promociones para lotes próximos a vencer. |
| POST | `/api/promotions` | Crea una promoción. |
| GET | `/api/promotions` | Lista promociones. |
| GET | `/api/promotions/active` | Lista promociones activas. |
| PATCH | `/api/promotions/{id}/cancel` | Cancela una promoción. |

### Ver sugerencias

```bash
curl http://localhost:8081/api/promotions/suggestions
```

El sistema sugiere promociones para lotes que:

- tienen stock disponible;
- no están vencidos;
- vencen dentro del umbral configurado;
- no tienen ya una promoción activa.

### Crear promoción por porcentaje

```bash
curl -X POST http://localhost:8081/api/promotions \
  -H "Content-Type: application/json" \
  -d '{
    "productId": 2,
    "batchId": 2,
    "createdById": 2,
    "title": "Promo medialunas jamón y queso",
    "description": "Promoción para vender stock próximo a vencer.",
    "discountType": "PERCENTAGE",
    "discountPercentage": 15,
    "promotionalPrice": null,
    "startDate": "2026-05-08T16:00:00",
    "endDate": "2026-05-09T16:00:00",
    "suggestedBySystem": true
  }'
```

### Crear promoción por precio fijo

```bash
curl -X POST http://localhost:8081/api/promotions \
  -H "Content-Type: application/json" \
  -d '{
    "productId": 5,
    "batchId": 4,
    "createdById": 2,
    "title": "Promo prepizzas",
    "description": "Precio promocional para stock próximo a vencer.",
    "discountType": "FIXED_PRICE",
    "discountPercentage": null,
    "promotionalPrice": 1400,
    "startDate": "2026-05-08T16:00:00",
    "endDate": "2026-05-09T16:00:00",
    "suggestedBySystem": true
  }'
```

### Cancelar promoción

```bash
curl -X PATCH http://localhost:8081/api/promotions/1/cancel
```

### Reglas implementadas

- Las promociones pueden ser por porcentaje o por precio fijo.
- Si es por porcentaje, debe usar `discountPercentage`.
- Si es por precio fijo, debe usar `promotionalPrice`.
- La fecha de fin debe ser posterior a la fecha de inicio.
- No se permite crear promoción sobre lote vencido.
- No se permite crear promoción sobre lote sin stock.
- No se permite crear promoción activa duplicada sobre el mismo lote.

---

## 17.11. Reportes básicos

### Endpoints

| Método | URL | Descripción |
|---|---|---|
| GET | `/api/reports/waste-summary?from=YYYY-MM-DD&to=YYYY-MM-DD` | Resumen de mermas. |
| GET | `/api/reports/economic-loss?from=YYYY-MM-DD&to=YYYY-MM-DD` | Pérdida económica total y promedio. |
| GET | `/api/reports/waste-by-category?from=YYYY-MM-DD&to=YYYY-MM-DD` | Mermas agrupadas por categoría. |
| GET | `/api/reports/waste-by-supplier?from=YYYY-MM-DD&to=YYYY-MM-DD` | Mermas agrupadas por proveedor. |
| GET | `/api/reports/stock-status` | Estado general de stock por producto. |

### Ejemplos

```bash
curl "http://localhost:8081/api/reports/waste-summary?from=2026-05-08&to=2026-05-08"
```

```bash
curl "http://localhost:8081/api/reports/economic-loss?from=2026-05-08&to=2026-05-08"
```

```bash
curl "http://localhost:8081/api/reports/waste-by-category?from=2026-05-08&to=2026-05-08"
```

```bash
curl "http://localhost:8081/api/reports/waste-by-supplier?from=2026-05-08&to=2026-05-08"
```

```bash
curl "http://localhost:8081/api/reports/stock-status"
```

### Qué permite responder

Estos reportes ayudan a responder preguntas como:

- ¿Cuánta plata se perdió por mermas?
- ¿Cuántos registros de merma hubo?
- ¿Qué categoría genera más desperdicio?
- ¿Qué proveedor está asociado a más pérdidas?
- ¿Qué productos están debajo del stock mínimo?
- ¿Qué productos tienen stock cero?

No se creó una entidad `Report` porque los reportes se calculan a partir de datos existentes.

---

## 17.12. Settings / configuraciones

### Endpoints

| Método | URL | Descripción |
|---|---|---|
| GET | `/api/settings/expiration-alert-days` | Obtiene el umbral del semáforo de vencimientos. |
| PUT | `/api/settings/expiration-alert-days` | Actualiza el umbral del semáforo. |
| GET | `/api/settings/promotion-suggestion-days` | Obtiene el umbral de sugerencias de promoción. |
| PUT | `/api/settings/promotion-suggestion-days` | Actualiza el umbral de sugerencias. |

### Ver configuración de vencimientos

```bash
curl http://localhost:8081/api/settings/expiration-alert-days
```

### Actualizar configuración de vencimientos

```bash
curl -X PUT http://localhost:8081/api/settings/expiration-alert-days \
  -H "Content-Type: application/json" \
  -d '{
    "value": 5
  }'
```

### Ver configuración de promociones

```bash
curl http://localhost:8081/api/settings/promotion-suggestion-days
```

### Actualizar configuración de promociones

```bash
curl -X PUT http://localhost:8081/api/settings/promotion-suggestion-days \
  -H "Content-Type: application/json" \
  -d '{
    "value": 4
  }'
```

### Reglas

- El valor debe ser mayor a cero.
- El valor no puede superar 30.
- Se guarda en la tabla `app_settings`.
- Permite cambiar comportamiento sin tocar código.

---

## 17.13. Alertas

### Endpoints

| Método | URL | Descripción |
|---|---|---|
| GET | `/api/alerts` | Lista todas las alertas. |
| GET | `/api/alerts/active` | Lista alertas activas. |
| POST | `/api/alerts/generate` | Genera alertas según el estado actual. |
| PATCH | `/api/alerts/{id}/resolve` | Marca una alerta como resuelta. |

### Listar alertas activas

```bash
curl http://localhost:8081/api/alerts/active
```

### Generar alertas

```bash
curl -X POST http://localhost:8081/api/alerts/generate
```

Este endpoint revisa:

- lotes vencidos;
- lotes próximos a vencer;
- productos por debajo del stock mínimo.

Si ya existe una alerta activa equivalente, no la duplica.

### Resolver alerta

```bash
curl -X PATCH http://localhost:8081/api/alerts/1/resolve
```

### Tipos de alerta

```text
EXPIRING_SOON  -> producto/lote próximo a vencer
EXPIRED        -> producto/lote vencido
LOW_STOCK      -> producto debajo del stock mínimo
```

### Severidades

```text
INFO
YELLOW
RED
```

---

# 18. Reglas de negocio principales

## 18.1. Stock por lote

El stock no se guarda como un número fijo en `products`.

Se calcula sumando `currentQuantity` de los lotes disponibles.

Ejemplo:

```text
Medialuna de manteca
  Lote 1: 20 unidades, vence hoy
  Lote 2: 40 unidades, vence en 3 días

Stock total = 60 unidades
```

Esto permite controlar vencimientos por partida.

---

## 18.2. Semaforización de vencimientos

Con configuración default de 2 días:

| Estado | Regla |
|---|---|
| EXPIRED | Fecha de vencimiento anterior a hoy. |
| RED | Vence hoy. |
| YELLOW | Vence dentro del umbral configurable. |
| GREEN | Vence después del umbral. |
| NOT_APPLICABLE | No tiene vencimiento. |

La configuración se guarda en `app_settings` con clave:

```text
expiration_alert_days
```

---

## 18.3. Productos perecederos

Si un producto es perecedero:

```text
perishable = true
```

entonces al ingresar mercadería debe tener fecha de vencimiento.

Si no es perecedero, puede tener `expirationDate = null`.

---

## 18.4. Mermas

Una merma siempre se registra contra un lote específico.

Al registrar una merma:

- se valida stock disponible;
- se descuenta cantidad del lote;
- se calcula pérdida económica;
- se crea un movimiento `WASTE`;
- si el lote queda en cero, se marca como `DEPLETED`.

---

## 18.5. Ventas manuales con FEFO

Las ventas manuales descuentan stock usando FEFO:

```text
First Expired, First Out
```

Primero se consume el lote que vence antes.

Esto es importante para reducir pérdidas por vencimiento.

---

## 18.6. Ajustes de stock

Los ajustes permiten corregir diferencias entre el stock real y el stock del sistema.

Tipos:

```text
IN   -> suma stock
OUT  -> resta stock
```

Internamente generan movimientos:

```text
ADJUSTMENT_IN
ADJUSTMENT_OUT
```

---

## 18.7. Promociones

El sistema puede sugerir promociones para lotes próximos a vencer.

Las promociones pueden ser:

```text
PERCENTAGE   -> porcentaje de descuento
FIXED_PRICE  -> precio fijo promocional
```

---

## 18.8. Alertas

Las alertas sirven para que el encargado detecte problemas sin revisar manualmente todos los reportes.

Por ahora se generan manualmente con:

```text
POST /api/alerts/generate
```

En una versión futura podrían generarse automáticamente con una tarea programada.

---

# 19. Datos mock cargados

La base mock incluye:

- usuarios de prueba;
- categorías;
- proveedores;
- productos de franquicia;
- productos externos;
- reglas de duración;
- lotes con vencimientos variados;
- movimientos de ingreso;
- mermas iniciales;
- promociones iniciales;
- alertas iniciales;
- settings iniciales.

Los productos externos representan el punto central del problema: bebidas, café, productos Sin TACC, chocolates e insumos que no siempre quedan bien controlados por el sistema de franquicia.

---

# 20. Flujo recomendado para probar el MVP

Este flujo sirve para una demo o para verificar que todo funciona.

## 20.1. Ver datos base

```bash
curl http://localhost:8081/api/products
curl http://localhost:8081/api/categories
curl http://localhost:8081/api/suppliers
curl http://localhost:8081/api/users
```

## 20.2. Ver stock inicial

```bash
curl http://localhost:8081/api/stock
curl http://localhost:8081/api/stock/batches
```

## 20.3. Ver vencimientos

```bash
curl http://localhost:8081/api/stock/expiring
curl http://localhost:8081/api/stock/expired
curl http://localhost:8081/api/dashboard/expiration-semaphore
```

## 20.4. Registrar una venta manual

```bash
curl -X POST http://localhost:8081/api/stock/sales \
  -H "Content-Type: application/json" \
  -d '{
    "productId": 1,
    "userId": 2,
    "quantity": 2,
    "notes": "Venta demo"
  }'
```

## 20.5. Registrar una merma

```bash
curl -X POST http://localhost:8081/api/waste-records \
  -H "Content-Type: application/json" \
  -d '{
    "batchId": 1,
    "userId": 3,
    "quantity": 1,
    "reason": "EXPIRED",
    "notes": "Merma demo"
  }'
```

## 20.6. Ver movimientos

```bash
curl http://localhost:8081/api/stock/movements
```

## 20.7. Ver promociones sugeridas

```bash
curl http://localhost:8081/api/promotions/suggestions
```

## 20.8. Generar alertas

```bash
curl -X POST http://localhost:8081/api/alerts/generate
curl http://localhost:8081/api/alerts/active
```

## 20.9. Ver reportes

Ajustar fecha según el día de prueba:

```bash
curl "http://localhost:8081/api/reports/waste-summary?from=2026-05-08&to=2026-05-08"
curl "http://localhost:8081/api/reports/economic-loss?from=2026-05-08&to=2026-05-08"
curl "http://localhost:8081/api/reports/stock-status"
```

---

# 21. Errores frecuentes

## 21.1. Whitelabel Error Page en `/`

Si aparece al entrar a:

```text
http://localhost:8081/
```

no significa que la API esté rota.

Probar:

```text
http://localhost:8081/api/products
```

---

## 21.2. Puerto 8080 ocupado

Ver qué proceso usa el puerto.

### Linux / macOS

```bash
sudo lsof -i :8080
```

O:

```bash
sudo ss -ltnp | grep :8080
```

### Windows PowerShell

```powershell
netstat -ano | findstr :8080
```

Solución: cambiar el puerto en `application.properties`:

```properties
server.port=8081
```

---

## 21.3. Error de conexión a la base

Ejemplo de error:

```text
Socket fail to connect to localhost. Connection refused
Unable to open JDBC Connection for DDL execution
```

Significa que MariaDB/MySQL no está levantado o no escucha en el puerto configurado.

### Linux

```bash
sudo systemctl start mariadb
sudo systemctl status mariadb
```

Verificar puerto:

```bash
sudo ss -ltnp | grep 3306
```

### macOS

```bash
brew services start mariadb
```

### Windows

Abrir `Servicios` y verificar que MySQL/MariaDB esté iniciado.

---

## 21.4. Error `Unable to determine Dialect`

Puede pasar si Hibernate no logra conectarse bien a la base.

Verificar que `application.properties` tenga:

```properties
spring.datasource.url=jdbc:mariadb://localhost:3306/panstock_db
spring.datasource.driver-class-name=org.mariadb.jdbc.Driver
spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.MariaDBDialect
```

Y que en `pom.xml` esté:

```xml
<dependency>
    <groupId>org.mariadb.jdbc</groupId>
    <artifactId>mariadb-java-client</artifactId>
    <scope>runtime</scope>
</dependency>
```

---

## 21.5. Error con `ddl-auto=validate`

Si aparece un error diciendo que falta una columna o tabla, significa que las entidades Java no coinciden con la base cargada.

Soluciones:

1. Verificar que se haya ejecutado el script actualizado.
2. Volver a cargar `database/panstock_schema_mock.sql`.
3. Confirmar que se está usando la base correcta: `panstock_db`.
4. Confirmar que el backend se conecta con `panstock_user` a la base local correcta.

Para desarrollo temporal se puede usar:

```properties
spring.jpa.hibernate.ddl-auto=update
```

Pero para que todo el equipo trabaje igual, conviene volver a:

```properties
spring.jpa.hibernate.ddl-auto=validate
```

---

## 21.6. Lombok no funciona en VS Code

Instalar:

```text
Lombok Annotations Support for VS Code
```

Después reiniciar VS Code.

---

## 21.7. Error por enum inválido

Si un request devuelve error al enviar un valor como `SALE`, `EXTERNAL`, `FRIDGE`, etc., revisar que el texto coincida exactamente con el enum en Java.

Los enums son sensibles a mayúsculas y minúsculas.

Correcto:

```json
{
  "origin": "EXTERNAL"
}
```

Incorrecto:

```json
{
  "origin": "external"
}
```

---

## 21.8. Error al crear promoción sobre un lote

Si aparece:

```text
El lote ya tiene una promoción activa.
```

significa que el lote ya está asociado a una promoción activa. Para probar otra promoción:

- usar otro lote;
- cancelar la promoción existente;
- o revisar `GET /api/promotions/active`.

---

# 22. Flujo recomendado para trabajar en equipo

Antes de empezar a programar:

```bash
git pull
```

Después de cambios:

```bash
git status
git add .
git commit -m "Mensaje claro del cambio"
git push
```

No subir:

- carpeta `target/`;
- archivos temporales del IDE;
- credenciales reales;
- bases de datos binarias;
- archivos `.env` con datos sensibles;
- dumps personales de la base con datos reales.

El archivo SQL mock sí puede estar versionado porque permite que todos trabajen con la misma base inicial.

---

# 23. Resumen rápido para levantar todo

## Linux Debian / Ubuntu

```bash
git pull
sudo systemctl start mariadb
sudo /usr/bin/mariadb < database/panstock_schema_mock.sql
./mvnw spring-boot:run
```

Si la base ya está cargada, no hace falta ejecutar de nuevo el SQL.

## macOS

```bash
git pull
brew services start mariadb
mariadb -u root -p < database/panstock_schema_mock.sql
./mvnw spring-boot:run
```

## Windows

```powershell
git pull
.\mvnw.cmd spring-boot:run
```

Si todavía no cargaron la base:

```powershell
mariadb -u root -p < database\panstock_schema_mock.sql
```

Después probar:

```text
http://localhost:8081/api/products
```

---

# 24. Alcance futuro fuera del MVP

Queda para futuras versiones:

- Spring Security.
- JWT.
- Contraseñas hasheadas con BCrypt.
- Frontend web.
- Integración con caja registradora.
- Integración con sistema de franquicia.
- Tareas automáticas con `@Scheduled` para generar alertas diarias.
- Notificaciones por email, WhatsApp o Telegram.
- Dashboard visual avanzado.
- Predicción de demanda.
- Microservicios reales si el proyecto crece.
- Docker para estandarizar entornos.

Estas cosas no son necesarias para el MVP actual, pero se pueden defender como evolución natural del sistema.

---

# 25. Estado final del MVP backend

El MVP backend permite:

1. Cargar y administrar productos.
2. Diferenciar productos de franquicia y externos.
3. Administrar categorías.
4. Administrar proveedores.
5. Administrar usuarios básicos.
6. Registrar ingresos de mercadería.
7. Controlar stock por lote.
8. Detectar vencimientos.
9. Semaforizar lotes.
10. Registrar mermas.
11. Calcular pérdidas económicas.
12. Registrar ventas manuales.
13. Aplicar FEFO en ventas.
14. Registrar ajustes de stock.
15. Sugerir promociones.
16. Registrar y cancelar promociones.
17. Generar reportes básicos.
18. Configurar umbrales desde API.
19. Generar y resolver alertas.
20. Consultar historial de movimientos.

Con esto PanStock queda como un backend MVP funcional, presentable y defendible para la materia.
