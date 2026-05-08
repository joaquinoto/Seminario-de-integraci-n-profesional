# PanStock - Configuración de Base de Datos Local

Este README explica cómo cargar la base de datos inicial de **PanStock** en una computadora local, usando el archivo:

```text
panstock_schema_mock.sql
```

El script crea la base de datos `panstock_db`, las tablas principales del MVP y datos mock para probar productos, proveedores, lotes de stock, vencimientos, mermas, promociones y alertas.

> ⚠️ **Importante:** el script borra y vuelve a crear la base `panstock_db`.
>
> Si ya tenían datos cargados en esa base, se van a perder.
>
> No usar este script sobre una base con datos reales.

---

## 1. Ubicación recomendada del archivo

Dentro del repositorio del backend, guardar el archivo SQL en una carpeta `database`:

```text
panstock-api/
  database/
    panstock_schema_mock.sql
  src/
  pom.xml
```

Si la carpeta no existe, crearla.

---

## 2. Datos de conexión que vamos a usar

La base se va a llamar:

```text
panstock_db
```

El usuario recomendado para Spring Boot será:

```text
Usuario: panstock_user
Contraseña: panstock123
```

No es obligatorio usar ese usuario, pero conviene que todos usemos el mismo para evitar problemas de configuración entre computadoras.

---

## 3. Configuración de Spring Boot

En el archivo:

```text
src/main/resources/application.properties
```

usar esta configuración:

```properties
spring.datasource.url=jdbc:mysql://localhost:3306/panstock_db?useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=America/Argentina/Buenos_Aires
spring.datasource.username=panstock_user
spring.datasource.password=panstock123

spring.jpa.hibernate.ddl-auto=validate
spring.jpa.show-sql=true
spring.jpa.properties.hibernate.format_sql=true
```

La propiedad importante es:

```properties
spring.jpa.hibernate.ddl-auto=validate
```

Esto hace que Spring Boot valide que las entidades coincidan con las tablas, pero **no modifica ni borra la base automáticamente**.

Durante desarrollo, si todavía estamos acomodando entidades y la validación molesta, se puede usar temporalmente:

```properties
spring.jpa.hibernate.ddl-auto=update
```

Pero para trabajar todos con la misma base, lo más ordenado es usar `validate`.

---

# Opción A - Cargar la base con MySQL Workbench

Esta es la opción más simple para quienes usan Windows o Mac.

## Paso 1: abrir MySQL Workbench

Abrir MySQL Workbench y conectarse al servidor local de MySQL.

Normalmente la conexión local usa:

```text
Host: localhost
Puerto: 3306
Usuario: root
Contraseña: la que configuraron al instalar MySQL
```

---

## Paso 2: abrir el script SQL

En MySQL Workbench:

```text
File > Open SQL Script
```

Seleccionar el archivo:

```text
panstock-api/database/panstock_schema_mock.sql
```

---

## Paso 3: ejecutar el script

Presionar el ícono del rayo ⚡ o usar:

```text
Ctrl + Shift + Enter
```

en Windows, o:

```text
Cmd + Shift + Enter
```

en Mac.

Esto va a crear la base `panstock_db` con las tablas y datos mock.

---

## Paso 4: crear el usuario de Spring Boot

Abrir una nueva pestaña de query en MySQL Workbench y ejecutar:

```sql
CREATE USER IF NOT EXISTS 'panstock_user'@'localhost' IDENTIFIED BY 'panstock123';

GRANT ALL PRIVILEGES ON panstock_db.* TO 'panstock_user'@'localhost';

FLUSH PRIVILEGES;
```

---

## Paso 5: verificar que se cargó bien

Ejecutar:

```sql
USE panstock_db;

SHOW TABLES;

SELECT COUNT(*) AS cantidad_productos FROM products;

SELECT id, name, origin, perishable
FROM products
LIMIT 10;
```

Deberían aparecer las tablas del proyecto y varios productos cargados.

---

# Opción B - Cargar la base desde terminal en Windows

Esta opción sirve si tienen MySQL instalado y quieren usar comandos.

## Paso 1: abrir CMD o PowerShell

Ir a la carpeta del proyecto:

```powershell
cd ruta\al\proyecto\panstock-api
```

Ejemplo:

```powershell
cd C:\Users\TuUsuario\Documents\panstock-api
```

---

## Paso 2: verificar si el comando mysql funciona

Ejecutar:

```powershell
mysql --version
```

Si muestra una versión, pueden seguir.

Si dice que `mysql` no se reconoce como comando, usar la ruta completa. Suele ser algo como:

```powershell
C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe
```

---

## Paso 3A: importar usando CMD

Si están usando **CMD**, ejecutar:

```cmd
mysql -u root -p < database\panstock_schema_mock.sql
```

Si `mysql` no está en el PATH:

```cmd
"C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" -u root -p < database\panstock_schema_mock.sql
```

Les va a pedir la contraseña del usuario `root` de MySQL.

---

## Paso 3B: importar usando PowerShell

En **PowerShell**, es más seguro usar este formato:

```powershell
Get-Content .\database\panstock_schema_mock.sql -Raw | mysql -u root -p
```

Si `mysql` no está en el PATH:

```powershell
Get-Content .\database\panstock_schema_mock.sql -Raw | & "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" -u root -p
```

Les va a pedir la contraseña del usuario `root` de MySQL.

---

## Paso 4: crear usuario para Spring Boot

Entrar a MySQL:

```powershell
mysql -u root -p
```

O con ruta completa:

```powershell
& "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" -u root -p
```

Luego ejecutar:

```sql
CREATE USER IF NOT EXISTS 'panstock_user'@'localhost' IDENTIFIED BY 'panstock123';

GRANT ALL PRIVILEGES ON panstock_db.* TO 'panstock_user'@'localhost';

FLUSH PRIVILEGES;

EXIT;
```

---

## Paso 5: probar conexión con el usuario de la app

```powershell
mysql -u panstock_user -p panstock_db
```

Contraseña:

```text
panstock123
```

Dentro de MySQL:

```sql
SHOW TABLES;
SELECT COUNT(*) FROM products;
EXIT;
```

---

# Opción C - Cargar la base desde terminal en Mac

En Mac se puede usar MySQL instalado manualmente, MySQL Workbench o Homebrew.

## Paso 1: verificar si MySQL está instalado

Abrir Terminal y ejecutar:

```bash
mysql --version
```

Si aparece una versión, seguir.

Si no aparece, instalar MySQL. Una forma común es con Homebrew:

```bash
brew install mysql
```

Después iniciar el servicio:

```bash
brew services start mysql
```

---

## Paso 2: ir a la carpeta del proyecto

```bash
cd ruta/al/proyecto/panstock-api
```

Ejemplo:

```bash
cd ~/Documents/panstock-api
```

---

## Paso 3: importar la base

```bash
mysql -u root -p < database/panstock_schema_mock.sql
```

Les va a pedir la contraseña de `root`.

Si el usuario `root` no tiene contraseña, probar:

```bash
mysql -u root < database/panstock_schema_mock.sql
```

---

## Paso 4: crear usuario para Spring Boot

Entrar a MySQL:

```bash
mysql -u root -p
```

Luego ejecutar:

```sql
CREATE USER IF NOT EXISTS 'panstock_user'@'localhost' IDENTIFIED BY 'panstock123';

GRANT ALL PRIVILEGES ON panstock_db.* TO 'panstock_user'@'localhost';

FLUSH PRIVILEGES;

EXIT;
```

---

## Paso 5: probar conexión

```bash
mysql -u panstock_user -p panstock_db
```

Contraseña:

```text
panstock123
```

Dentro de MySQL:

```sql
SHOW TABLES;
SELECT COUNT(*) FROM products;
EXIT;
```

---

# Opción D - Cargar la base en Linux Debian

Esta opción aplica si alguien usa Linux. En el caso de Ramiro, usar el MySQL/MariaDB del sistema, no el de XAMPP/LAMPP.

## Paso 1: ir a la carpeta del proyecto

```bash
cd ~/Documents/Seminario-de-integraci-n-profesional/panstock-api
```

---

## Paso 2: iniciar MariaDB del sistema

```bash
sudo systemctl start mariadb
```

Verificar estado:

```bash
sudo systemctl status mariadb
```

Salir con:

```text
q
```

---

## Paso 3: importar el SQL usando el MariaDB del sistema

Usar ruta completa para evitar usar LAMPP:

```bash
sudo /usr/bin/mariadb < database/panstock_schema_mock.sql
```

---

## Paso 4: crear usuario para Spring Boot

Entrar a MariaDB:

```bash
sudo /usr/bin/mariadb
```

Ejecutar:

```sql
CREATE USER IF NOT EXISTS 'panstock_user'@'localhost' IDENTIFIED BY 'panstock123';

GRANT ALL PRIVILEGES ON panstock_db.* TO 'panstock_user'@'localhost';

FLUSH PRIVILEGES;

EXIT;
```

---

## Paso 5: probar conexión

```bash
/usr/bin/mariadb -u panstock_user -p panstock_db
```

Contraseña:

```text
panstock123
```

Dentro de MariaDB:

```sql
SHOW TABLES;
SELECT COUNT(*) FROM products;
EXIT;
```

---

# Consultas útiles para probar datos

Una vez cargada la base, pueden ejecutar estas consultas en MySQL Workbench, DBeaver o terminal.

## Ver productos

```sql
USE panstock_db;

SELECT id, name, origin, perishable, unit_type, sale_price
FROM products
ORDER BY id;
```

## Ver productos externos

```sql
SELECT id, name, origin, perishable
FROM products
WHERE origin = 'EXTERNAL';
```

## Ver stock actual por producto

```sql
SELECT
    p.id,
    p.name,
    p.origin,
    SUM(b.current_quantity) AS stock_actual
FROM products p
JOIN inventory_batches b ON b.product_id = p.id
WHERE p.active = TRUE
GROUP BY p.id, p.name, p.origin
ORDER BY p.name;
```

## Ver lotes próximos a vencer

```sql
SELECT
    b.id AS batch_id,
    p.name,
    b.current_quantity,
    b.expiration_date,
    DATEDIFF(b.expiration_date, CURDATE()) AS dias_para_vencer
FROM inventory_batches b
JOIN products p ON p.id = b.product_id
WHERE b.current_quantity > 0
  AND b.expiration_date IS NOT NULL
ORDER BY b.expiration_date ASC;
```

## Ver pérdida económica total por merma

```sql
SELECT SUM(economic_loss) AS perdida_total
FROM waste_records;
```

---

# Problemas frecuentes

## Error: Access denied for user root

Significa que la contraseña de `root` está mal o que MySQL fue instalado con otro método de autenticación.

Solución simple:

- probar entrar desde MySQL Workbench;
- revisar la contraseña configurada al instalar MySQL;
- pedir ayuda al equipo para resetear la contraseña local.

---

## Error: Unknown database panstock_db

Significa que todavía no se ejecutó correctamente el script `panstock_schema_mock.sql`.

Solución:

1. Volver a ejecutar el script.
2. Verificar que no haya errores en la consola.
3. Ejecutar:

```sql
SHOW DATABASES;
```

Debe aparecer:

```text
panstock_db
```

---

## Error: Table already exists

El script está pensado para borrar y recrear la base completa. Si aparece este error, revisar que al principio del archivo esté esta línea:

```sql
DROP DATABASE IF EXISTS panstock_db;
```

Luego volver a ejecutarlo completo.

---

## Error en Spring Boot: Access denied for user panstock_user

Probablemente no se creó el usuario o no se le dieron permisos.

Entrar como root y ejecutar:

```sql
CREATE USER IF NOT EXISTS 'panstock_user'@'localhost' IDENTIFIED BY 'panstock123';
GRANT ALL PRIVILEGES ON panstock_db.* TO 'panstock_user'@'localhost';
FLUSH PRIVILEGES;
```

---

## Error en Spring Boot: Communications link failure

Puede pasar si MySQL no está iniciado.

En Windows:

- abrir `Services`;
- buscar `MySQL80` o similar;
- iniciar el servicio.

En Mac con Homebrew:

```bash
brew services start mysql
```

En Linux:

```bash
sudo systemctl start mariadb
```

---

# Resumen rápido

## MySQL Workbench

1. Abrir conexión local.
2. `File > Open SQL Script`.
3. Elegir `database/panstock_schema_mock.sql`.
4. Ejecutar con el rayo ⚡.
5. Crear usuario `panstock_user`.
6. Probar `SELECT COUNT(*) FROM products;`.

## Terminal Mac/Linux

```bash
mysql -u root -p < database/panstock_schema_mock.sql
mysql -u root -p
```

```sql
CREATE USER IF NOT EXISTS 'panstock_user'@'localhost' IDENTIFIED BY 'panstock123';
GRANT ALL PRIVILEGES ON panstock_db.* TO 'panstock_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

## Windows PowerShell

```powershell
Get-Content .\database\panstock_schema_mock.sql -Raw | mysql -u root -p
mysql -u root -p
```

```sql
CREATE USER IF NOT EXISTS 'panstock_user'@'localhost' IDENTIFIED BY 'panstock123';
GRANT ALL PRIVILEGES ON panstock_db.* TO 'panstock_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

---

# Nota para el equipo

Todos deberían trabajar con:

```text
Base: panstock_db
Usuario: panstock_user
Contraseña: panstock123
Puerto: 3306
```

Así el `application.properties` es igual para todos y evitamos problemas de configuración.
