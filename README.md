# PanStock API - Backend MVP

PanStock es un sistema de gestión de inventario para una sucursal de la franquicia **Dulce Hora**. El objetivo del MVP es centralizar el registro de productos, controlar stock por lotes, visualizar vencimientos, registrar mermas y calcular pérdidas económicas.

Este README sirve como documentación inicial para que todo el equipo pueda levantar el backend, cargar la misma base de datos mock y probar los endpoints principales.

---

## 1. Estado actual del backend

En esta etapa el backend ya cuenta con una primera versión funcional de:

- Productos.
- Categorías y proveedores precargados en la base.
- Stock por lotes o partidas.
- Ingreso de mercadería.
- Consulta de stock actual.
- Consulta de lotes.
- Consulta de productos próximos a vencer.
- Dashboard de semaforización de vencimientos.
- Registro de mermas.
- Cálculo de pérdida económica por merma.

Por ahora no se implementó seguridad con JWT. Los roles existen a nivel de modelo/datos, pero todavía no se bloquean endpoints por rol.

---

## 2. Tecnologías usadas

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

---

## 3. Estructura general del proyecto

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
```

---

## 4. Arquitectura usada

Se está usando una arquitectura por capas:

```text
Controller -> Service -> Repository propio -> Repository JPA -> Base de datos
```

Ejemplo:

```text
ProductController
  -> ProductService
    -> ProductServiceImpl
      -> ProductRepository
        -> ProductRepositoryImpl
          -> ProductJpaRepository
            -> MySQL/MariaDB
```

La decisión importante es que el `Service` no depende directamente de `JpaRepository`, sino de una interfaz propia del proyecto. Esto permite explicar mejor la separación entre lógica de negocio y acceso a datos.

---

## 5. Requisitos previos

Todos los integrantes deberían tener instalado:

1. Java 21.
2. Un motor de base de datos compatible: preferentemente MariaDB o MySQL.
3. Un cliente para administrar la base de datos.
4. Git.
5. VS Code, IntelliJ IDEA o el IDE que prefieran.

---

# 6. Instalación por sistema operativo

## 6.1. Windows

### Opción recomendada

Instalar:

- Java 21.
- Git.
- MariaDB Server o MySQL Server.
- DBeaver o MySQL Workbench.
- VS Code.

### Verificar Java

Abrir PowerShell o CMD:

```powershell
java -version
```

Debería aparecer Java 21.

### Verificar MySQL/MariaDB

Si usan MySQL:

```powershell
mysql --version
```

Si el comando no funciona, probablemente haya que usar la ruta completa, por ejemplo:

```powershell
"C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" --version
```

---

## 6.2. Mac

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

---

## 6.3. Linux Debian / Ubuntu

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

Si tienen LAMPP instalado, puede haber dos clientes `mysql` distintos:

```bash
type -a mysql
type -a mariadb
```

Para usar el MariaDB del sistema y no el de LAMPP, usar explícitamente:

```bash
/usr/bin/mariadb
```

---

# 7. Clonar el proyecto

```bash
git clone URL_DEL_REPOSITORIO
cd panstock-api
```

Si el repositorio padre tiene varias carpetas, entrar a la carpeta del backend:

```bash
cd panstock-api
```

---

# 8. Cargar la base de datos mock

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
- lotes de stock;
- movimientos;
- mermas;
- promociones;
- alertas;
- configuración inicial.

> Importante: si la base `panstock_db` ya existe, el script puede borrarla y recrearla. No usar con datos reales.

---

## 8.1. Cargar usando DBeaver o MySQL Workbench

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

## 8.2. Cargar desde terminal en Windows

Desde la carpeta del backend:

```powershell
mysql -u root -p < database\panstock_schema_mock.sql
```

Si `mysql` no está en el PATH, usar la ruta completa:

```powershell
"C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" -u root -p < database\panstock_schema_mock.sql
```

---

## 8.3. Cargar desde terminal en Mac

Desde la carpeta del backend:

```bash
mariadb -u root -p < database/panstock_schema_mock.sql
```

Si el root local no tiene contraseña, puede funcionar así:

```bash
mariadb < database/panstock_schema_mock.sql
```

---

## 8.4. Cargar desde terminal en Linux Debian / Ubuntu

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

# 9. Crear usuario para Spring Boot

Para no usar `root` desde Spring Boot, todos usamos el mismo usuario local:

```text
Usuario: panstock_user
Contraseña: panstock123
Base: panstock_db
```

Ejecutar en MySQL/MariaDB:

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

En Linux Debian, si el comando `mariadb` apunta a LAMPP, usar:

```bash
/usr/bin/mariadb -u panstock_user -p panstock_db
```

---

# 10. Configuración de Spring Boot

Editar:

```text
src/main/resources/application.properties
```

## 10.1. Configuración recomendada si usan MariaDB

```properties
spring.datasource.url=jdbc:mariadb://localhost:3306/panstock_db
spring.datasource.username=panstock_user
spring.datasource.password=panstock123
spring.datasource.driver-class-name=org.mariadb.jdbc.Driver

spring.jpa.hibernate.ddl-auto=validate
spring.jpa.show-sql=true
spring.jpa.properties.hibernate.format_sql=true
spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.MariaDBDialect
```

## 10.2. Puerto del backend

Por defecto Spring Boot corre en:

```text
http://localhost:8080
```

Si el puerto 8080 está ocupado, agregar:

```properties
server.port=8081
```

Entonces la API queda en:

```text
http://localhost:8081
```

---

# 11. Dependencia de MariaDB en Maven

En el `pom.xml`, para usar MariaDB, debe existir esta dependencia:

```xml
<dependency>
    <groupId>org.mariadb.jdbc</groupId>
    <artifactId>mariadb-java-client</artifactId>
    <scope>runtime</scope>
</dependency>
```

Si se usa MySQL Server puro con driver de MySQL, se puede usar esta dependencia alternativa:

```xml
<dependency>
    <groupId>com.mysql</groupId>
    <artifactId>mysql-connector-j</artifactId>
    <scope>runtime</scope>
</dependency>
```

Pero para que todos trabajemos igual, se recomienda mantener la configuración de MariaDB.

---

# 12. Correr el backend

## Linux / Mac

```bash
./mvnw spring-boot:run
```

## Windows

```powershell
.\mvnw.cmd spring-boot:run
```

También se puede correr desde VS Code o IntelliJ usando la clase principal:

```text
com.panstock.api.PanstockApiApplication
```

---

# 13. Extensiones recomendadas para VS Code

Instalar:

- Extension Pack for Java.
- Spring Boot Extension Pack.
- Lombok Annotations Support for VS Code.

En VS Code:

1. Abrir Extensions con `Ctrl + Shift + X`.
2. Buscar cada extensión.
3. Instalar.
4. Cerrar y abrir VS Code.
5. Abrir la carpeta `panstock-api`.

---

# 14. URL base de la API

Si no cambiaron el puerto:

```text
http://localhost:8080
```

Si cambiaron a 8081:

```text
http://localhost:8081
```

Importante: el backend no tiene una página principal en `/`. Si entran a:

```text
http://localhost:8080/
```

puede aparecer la Whitelabel Error Page. Eso no significa que la API esté rota. Hay que probar los endpoints `/api/...`.

---

# 15. Endpoints disponibles en esta etapa

## Productos

| Método | URL | Descripción |
|---|---|---|
| GET | `/api/products` | Lista productos activos |
| GET | `/api/products?activeOnly=false` | Lista todos los productos |
| GET | `/api/products?origin=FRANCHISE` | Lista productos de franquicia |
| GET | `/api/products?origin=EXTERNAL` | Lista productos externos |
| GET | `/api/products?categoryId=1` | Lista productos por categoría |
| GET | `/api/products/{id}` | Obtiene un producto por id |
| POST | `/api/products` | Crea un producto |
| PUT | `/api/products/{id}` | Actualiza un producto |
| DELETE | `/api/products/{id}` | Baja lógica de un producto |

## Stock

| Método | URL | Descripción |
|---|---|---|
| GET | `/api/stock` | Stock actual agrupado por producto |
| GET | `/api/stock/batches` | Lista todos los lotes |
| GET | `/api/stock/batches/{id}` | Obtiene un lote por id |
| POST | `/api/stock/entries` | Registra ingreso de mercadería |
| GET | `/api/stock/expiring` | Lista lotes próximos a vencer según configuración |
| GET | `/api/stock/expiring?days=5` | Lista lotes que vencen dentro de 5 días |
| GET | `/api/stock/expired` | Lista lotes vencidos |

## Dashboard

| Método | URL | Descripción |
|---|---|---|
| GET | `/api/dashboard/expiration-semaphore` | Dashboard con semáforo de vencimientos |

## Mermas

| Método | URL | Descripción |
|---|---|---|
| GET | `/api/waste-records` | Lista mermas registradas |
| GET | `/api/waste-records/{id}` | Obtiene una merma por id |
| POST | `/api/waste-records` | Registra una merma y descuenta stock |

---

# 16. Pruebas rápidas con navegador

Abrir en el navegador:

```text
http://localhost:8080/api/products
```

```text
http://localhost:8080/api/stock
```

```text
http://localhost:8080/api/stock/batches
```

```text
http://localhost:8080/api/stock/expiring
```

```text
http://localhost:8080/api/stock/expired
```

```text
http://localhost:8080/api/dashboard/expiration-semaphore
```

```text
http://localhost:8080/api/waste-records
```

Si usan puerto 8081, reemplazar `8080` por `8081`.

---

# 17. Pruebas rápidas con curl

## Listar productos

```bash
curl http://localhost:8080/api/products
```

## Ver stock

```bash
curl http://localhost:8080/api/stock
```

## Ver lotes

```bash
curl http://localhost:8080/api/stock/batches
```

## Ver próximos a vencer

```bash
curl http://localhost:8080/api/stock/expiring
```

## Ver dashboard

```bash
curl http://localhost:8080/api/dashboard/expiration-semaphore
```

---

# 18. Ejemplos de requests POST

## 18.1. Crear producto externo

```bash
curl -X POST http://localhost:8080/api/products \
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

## 18.2. Registrar ingreso de mercadería

```bash
curl -X POST http://localhost:8080/api/stock/entries \
  -H "Content-Type: application/json" \
  -d '{
    "productId": 1,
    "supplierId": 1,
    "receivedDate": "2026-05-07",
    "expirationDate": "2026-05-10",
    "quantity": 20,
    "unitCost": 250.00,
    "unitSalePrice": 700.00,
    "storageType": "FRIDGE",
    "notes": "Ingreso de prueba"
  }'
```

## 18.3. Registrar merma

Usar un `batchId` existente.

```bash
curl -X POST http://localhost:8080/api/waste-records \
  -H "Content-Type: application/json" \
  -d '{
    "batchId": 1,
    "userId": 3,
    "quantity": 2,
    "reason": "EXPIRED",
    "notes": "Merma de prueba"
  }'
```

Esto debería:

- crear una merma;
- calcular la pérdida económica;
- descontar stock del lote;
- crear un movimiento de stock tipo `WASTE`.

---

# 19. Reglas de negocio implementadas en esta etapa

## Productos perecederos

Si un producto es perecedero, al registrar ingreso de stock debe tener fecha de vencimiento.

## Stock por lote

El stock se guarda en `inventory_batches`, no directamente en `products`.

Esto permite que un mismo producto tenga diferentes partidas con diferentes fechas de vencimiento.

Ejemplo:

```text
Medialuna de manteca
  Lote 1: 20 unidades, vence mañana
  Lote 2: 40 unidades, vence en 3 días
```

## Semaforización

Con configuración default de 2 días:

| Estado | Regla |
|---|---|
| EXPIRED | fecha de vencimiento anterior a hoy |
| RED | vence hoy |
| YELLOW | vence dentro del umbral configurable |
| GREEN | vence después del umbral |
| NOT_APPLICABLE | no tiene vencimiento |

La configuración se guarda en `app_settings` con clave:

```text
expiration_alert_days
```

## Registro de merma

Al registrar una merma:

1. Se valida que el lote exista.
2. Se valida que la cantidad sea mayor a cero.
3. Se valida que la cantidad no supere el stock disponible del lote.
4. Se calcula pérdida económica.
5. Se descuenta stock.
6. Se crea movimiento de stock tipo `WASTE`.

## Cálculo de pérdida económica

Por ahora:

```text
economicLoss = quantity * unitSalePrice
```

---

# 20. Datos mock cargados

La base mock incluye:

- productos de franquicia;
- productos externos;
- proveedores de franquicia;
- proveedores externos;
- categorías;
- usuarios de prueba;
- lotes con vencimientos variados;
- mermas precargadas;
- promociones mock;
- alertas mock.

Los productos externos sirven para representar el punto central del problema: bebidas, café, productos Sin TACC, chocolates u otros proveedores que el sistema actual de la franquicia no registra bien.

---

# 21. Usuarios mock

La base puede incluir usuarios de prueba como:

```text
Dueño/Admin
Encargado
Empleado
```

Por ahora no hay JWT ni login real protegido. Los usuarios se usan principalmente para trazabilidad, por ejemplo en mermas.

---

# 22. Errores frecuentes

## 22.1. Whitelabel Error Page en `/`

Si aparece al entrar a:

```text
http://localhost:8080/
```

no significa que la API esté rota.

Probar:

```text
http://localhost:8080/api/products
```

---

## 22.2. Puerto 8080 ocupado

Ver qué proceso usa el puerto:

### Linux / Mac

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

## 22.3. Error de conexión a la base

Verificar que la base esté encendida.

### Linux

```bash
sudo systemctl start mariadb
sudo systemctl status mariadb
```

### Mac

```bash
brew services start mariadb
```

### Windows

Abrir `Servicios` y verificar que MySQL/MariaDB esté iniciado.

---

## 22.4. Error `Unable to determine Dialect`

Puede pasar si Hibernate no logra leer correctamente la metadata de la base.

Verificar que `application.properties` tenga:

```properties
spring.datasource.url=jdbc:mariadb://localhost:3306/panstock_db
spring.datasource.driver-class-name=org.mariadb.jdbc.Driver
spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.MariaDBDialect
```

Y que en el `pom.xml` esté:

```xml
<dependency>
    <groupId>org.mariadb.jdbc</groupId>
    <artifactId>mariadb-java-client</artifactId>
    <scope>runtime</scope>
</dependency>
```

---

## 22.5. Error con `ddl-auto=validate`

Si aparece un error diciendo que falta una columna o tabla, significa que las entidades Java no coinciden con la base cargada.

Soluciones:

1. Verificar que se haya ejecutado el script actualizado.
2. Volver a cargar `panstock_schema_mock.sql`.
3. Confirmar que se está usando la base correcta: `panstock_db`.

Para desarrollo temporal se puede usar:

```properties
spring.jpa.hibernate.ddl-auto=update
```

Pero para que todo el equipo trabaje igual, conviene volver a:

```properties
spring.jpa.hibernate.ddl-auto=validate
```

---

## 22.6. Lombok no funciona en VS Code

Instalar:

```text
Lombok Annotations Support for VS Code
```

Después reiniciar VS Code.

---

# 23. Flujo recomendado para trabajar en equipo

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

- carpetas `target/`;
- archivos temporales del IDE;
- credenciales reales;
- bases de datos binarias;
- archivos `.env` con datos sensibles.

---

# 24. Próximas etapas del backend

Pendiente para próximas etapas:

1. Endpoints de categorías.
2. Endpoints de proveedores.
3. Seguridad simple o JWT.
4. Promociones.
5. Reportes.
6. Ajustes de stock manuales.
7. Ventas manuales o integración futura con caja.
8. Mejoras en dashboard.

---

# 25. Resumen rápido para levantar todo

## Linux / Mac

```bash
git pull
sudo systemctl start mariadb
./mvnw spring-boot:run
```

En Mac, si usan Homebrew:

```bash
brew services start mariadb
./mvnw spring-boot:run
```

## Windows

```powershell
git pull
.\mvnw.cmd spring-boot:run
```

Después probar:

```text
http://localhost:8080/api/products
```

