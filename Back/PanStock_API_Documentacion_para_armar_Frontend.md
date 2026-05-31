# PanStock API - Documentación para Frontend

## Requisitos previos

Antes de correr esta API es necesario correr el archivo .sql, que está dentro de la carpeta database, en un motor de mysql.

También, se debe actualizar el usuario y contaraseña (segun corresponda) en el archivo application.properties para acceder a la bd creada previamente.

## Consideraciones


| Endpoint | Debería poder | Actualmente puede |
| :--- | :---: | ---: |
| POST /api/stock/entries | OWNER y EMPLOYEE | OWNER y EMPLOYEE ✓|
| POST /api/waste-records | OWNER y EMPLOYEE | OWNER y EMPLOYEE ✓|
| POST /api/stock/sales   | OWNER y EMPLOYEE | OWNER y EMPLOYEE ✓|
| DELETE /api/suppliers/{id} | solo OWNER | solo OWNER ✓|
| POST /api/suppliers     | solo OWNER | solo OWNER ✓|
| PUT /api/suppliers/{id} | solo OWNER | solo OWNER ✓|
| DELETE /api/categories/{id} | solo OWNER | solo OWNER ✓|
| PUT /api/settings/** | solo OWNER | solo OWNER ✓|
| GET /api/reports/** | solo OWNER | solo OWNER ✓|
| POST /api/promotions | solo OWNER | solo OWNER ✓|

## 1. Objetivo de este documento

Este documento describe los endpoints disponibles del backend de **PanStock** y brinda el contexto necesario para construir el frontend en React sin tener que revisar el código Java.

La idea es que el equipo de frontend pueda entender:

- qué problema resuelve cada módulo;
- qué endpoints existen;
- qué datos debe enviar el frontend;
- qué datos devuelve el backend;
- qué validaciones importantes debe conocer la interfaz;
- qué pantallas o flujos se pueden construir a partir de cada endpoint.

---

## 2. Contexto funcional de PanStock

PanStock es un sistema de gestión de inventario para una sucursal de la franquicia **Dulce Hora**.

El problema principal que busca resolver es la pérdida económica y operativa causada por:

- vencimientos no detectados a tiempo;
- desperdicio o merma de mercadería;
- falta de trazabilidad de productos externos;
- control manual de stock;
- dependencia del dueño o encargado para revisar mercadería;
- falta de reportes claros para tomar decisiones.

El backend permite administrar productos, categorías, proveedores, usuarios básicos, stock por lotes, vencimientos, mermas, promociones, reportes, alertas y movimientos de stock.

---

## 3. URL base de la API

En desarrollo local, la API puede correr en:

```text
http://localhost:8080
```

o, si se configuró `server.port=8081`:

```text
http://localhost:8081
```

En esta documentación se usará como ejemplo:

```text
http://localhost:8081
```

Todas las rutas comienzan con `/api`.

Ejemplo:

```text
GET http://localhost:8081/api/products
```

---

## 4. Formato general de datos

### 4.1. Formato de request y response

El backend recibe y devuelve JSON.

Todos los requests que envían body deben usar:

```http
Content-Type: application/json
```

Ejemplo:

```json
{
  "name": "Medialuna de manteca",
  "active": true
}
```

---

### 4.2. Fechas

El backend usa dos formatos principales de fecha.

#### LocalDate

Se usa para fechas sin hora, por ejemplo vencimientos o fechas de ingreso.

Formato:

```text
YYYY-MM-DD
```

Ejemplo:

```json
"expirationDate": "2026-05-10"
```

#### LocalDateTime

Se usa para fechas con hora, por ejemplo promociones, movimientos y alertas.

Formato:

```text
YYYY-MM-DDTHH:mm:ss
```

Ejemplo:

```json
"startDate": "2026-05-08T16:00:00"
```

---

### 4.3. Números decimales

Las cantidades, precios y pérdidas económicas se devuelven como números.

Ejemplos:

```json
"quantity": 10.000
```

```json
"salePrice": 1500.00
```

En React conviene tratarlos como `number`, pero al mostrarlos en pantalla se recomienda formatearlos.

Ejemplo:

```js
new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS"
}).format(value)
```

---

## 5. Manejo general de errores

El backend usa excepciones controladas para errores frecuentes.

Los errores suelen devolver un JSON similar a:

```json
{
  "status": 400,
  "message": "La cantidad vendida debe ser mayor a cero.",
  "timestamp": "2026-05-08T16:30:00"
}
```

Los códigos más comunes son:

| Código | Significado | Caso típico |
|---|---|---|
| 400 | Bad Request | Datos inválidos, stock insuficiente, fechas incorrectas |
| 404 | Not Found | Producto, lote, usuario o recurso inexistente |
| 500 | Internal Server Error | Error no controlado |

El frontend debería mostrar el campo `message` al usuario siempre que exista.

---

## 6. Enums usados por el backend

Estos valores se envían y reciben como strings.

### 6.1. ProductOrigin

```text
FRANCHISE
EXTERNAL
```

Uso:

- `FRANCHISE`: producto oficial de la franquicia Dulce Hora.
- `EXTERNAL`: producto externo, como bebidas, café, chocolates, productos Sin TACC, etc.

---

### 6.2. SupplierType

```text
FRANCHISE
WHOLESALER
EXTERNAL
```

Uso:

- `FRANCHISE`: proveedor de la franquicia.
- `WHOLESALER`: mayorista.
- `EXTERNAL`: proveedor externo.

---

### 6.3. UnitType

```text
UNIT
KG
GRAM
LITER
ML
BOX
PACKAGE
```

Puede variar según el enum definido en el backend. La base mock usa principalmente unidades simples como `UNIT`, `KG` o similares.

---

### 6.4. StorageType

```text
ROOM_TEMPERATURE
FRIDGE
FREEZER
DISPLAY
```

Uso:

- `ROOM_TEMPERATURE`: ambiente.
- `FRIDGE`: heladera.
- `FREEZER`: freezer.
- `DISPLAY`: mostrador/vitrina.

---

### 6.5. BatchStatus

```text
AVAILABLE
DEPLETED
DISCARDED
```

Uso:

- `AVAILABLE`: lote disponible.
- `DEPLETED`: lote sin stock.
- `DISCARDED`: lote descartado.

---

### 6.6. StockMovementType

```text
ENTRY
WASTE
SALE
ADJUSTMENT_IN
ADJUSTMENT_OUT
```

Uso:

- `ENTRY`: ingreso de mercadería.
- `WASTE`: merma.
- `SALE`: venta manual.
- `ADJUSTMENT_IN`: ajuste positivo.
- `ADJUSTMENT_OUT`: ajuste negativo.

---

### 6.7. WasteReason

```text
EXPIRED
BROKEN
DAMAGED
QUALITY_ISSUE
OTHER
```

Puede variar según el enum final del backend. El frontend debería usar los valores reales que estén cargados en el enum Java.

---

### 6.8. ExpirationStatus

```text
EXPIRED
RED
YELLOW
GREEN
NOT_APPLICABLE
```

Uso:

- `EXPIRED`: vencido.
- `RED`: vence hoy.
- `YELLOW`: próximo a vencer.
- `GREEN`: vencimiento lejano.
- `NOT_APPLICABLE`: no tiene vencimiento.

---

### 6.9. DiscountType

```text
PERCENTAGE
FIXED_PRICE
```

Uso:

- `PERCENTAGE`: descuento porcentual.
- `FIXED_PRICE`: precio fijo promocional.

---

### 6.10. PromotionStatus

```text
ACTIVE
CANCELLED
EXPIRED
```

---

### 6.11. Role

```text
OWNER
EMPLOYEE
```

Uso:

- `OWNER`: dueño o administrador.
- `EMPLOYEE`: empleado.
---

### 6.12. AlertType

```text
EXPIRING_SOON
EXPIRED
LOW_STOCK
```

---

### 6.13. AlertSeverity

```text
INFO
YELLOW
RED
```

---

### 6.14. AlertStatus

```text
ACTIVE
RESOLVED
```

---

## 7. Convenciones importantes para frontend

### 7.1. Baja lógica

Varios `DELETE` no borran físicamente registros. Hacen baja lógica.

Ejemplos:

- producto: `active = false`;
- categoría: `active = false`;
- proveedor: `active = false`;
- usuario: `enabled = false`.

Esto significa que el frontend puede tener filtros como:

- ver solo activos;
- ver todos;
- ocultar deshabilitados por defecto.

---

### 7.2. Stock por lotes

El stock total de un producto no está guardado directamente en la tabla `products`.

Se calcula sumando los `currentQuantity` de sus lotes disponibles.

Esto es importante para el frontend:

- para mostrar stock general se usa `/api/stock`;
- para ver detalle por lote se usa `/api/stock/batches`;
- para movimientos se usa `/api/stock/movements`.

---

### 7.3. FEFO en ventas

Las ventas manuales descuentan stock usando FEFO:

```text
First Expired, First Out
```

Es decir:

1. primero se descuenta del lote que vence antes;
2. si un lote no tiene vencimiento, se usa después de los que sí tienen vencimiento;
3. no se venden lotes vencidos;
4. si una venta requiere varios lotes, el backend genera varios movimientos `SALE`.

El frontend no debe implementar FEFO. Solo debe enviar el producto y la cantidad.

---

# 8. Productos

## 8.1. Contexto

Los productos representan los ítems que la panadería maneja en stock.

Pueden ser:

- productos de franquicia;
- productos externos;
- perecederos;
- no perecederos;
- activos o inactivos.

---

## 8.2. Listar productos

```http
GET /api/products
```

### Query params opcionales

| Parámetro | Tipo | Ejemplo | Descripción |
|---|---|---|---|
| `activeOnly` | boolean | `true` | Si es true, devuelve solo activos |
| `origin` | ProductOrigin | `EXTERNAL` | Filtra por origen |
| `categoryId` | number | `1` | Filtra por categoría |

Ejemplos:

```http
GET /api/products?activeOnly=true
```

```http
GET /api/products?origin=FRANCHISE
```

```http
GET /api/products?categoryId=2
```

### Response

```json
[
  {
    "id": 1,
    "name": "Medialunas manteca",
    "description": "Producto de franquicia",
    "categoryId": 1,
    "categoryName": "Panadería",
    "defaultSupplierId": 1,
    "defaultSupplierName": "Dulce Hora Franquicia",
    "origin": "FRANCHISE",
    "perishable": true,
    "unitType": "UNIT",
    "costPrice": 250.00,
    "salePrice": 700.00,
    "minimumStock": 10.000,
    "active": true
  }
]
```

### Uso sugerido en frontend

Pantalla:

- listado de productos;
- filtros por categoría, origen y estado activo;
- botón crear producto;
- acciones editar/desactivar.

---

## 8.3. Obtener producto por ID

```http
GET /api/products/{id}
```

Ejemplo:

```http
GET /api/products/1
```

### Response

Devuelve un objeto igual al del listado.

---

## 8.4. Crear producto

```http
POST /api/products
```

### Request

```json
{
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
}
```

### Campos

| Campo | Obligatorio | Descripción |
|---|---|---|
| `name` | Sí | Nombre del producto |
| `description` | No | Descripción |
| `categoryId` | Sí | ID de categoría existente |
| `defaultSupplierId` | No | ID de proveedor por defecto |
| `origin` | Sí | `FRANCHISE` o `EXTERNAL` |
| `perishable` | Sí | Indica si requiere vencimiento al ingresar stock |
| `unitType` | Sí | Unidad de medida |
| `costPrice` | No | Costo unitario |
| `salePrice` | No | Precio de venta |
| `minimumStock` | No | Stock mínimo para alertas |
| `active` | No | Si no se envía, se asume `true` |

### Response

Devuelve el producto creado.

---

## 8.5. Actualizar producto

```http
PUT /api/products/{id}
```

Request igual al de creación.

---

## 8.6. Desactivar producto

```http
DELETE /api/products/{id}
```

No devuelve body.

Efecto:

```text
active = false
```

---

# 9. Categorías

## 9.1. Contexto

Las categorías agrupan productos.

Ejemplos:

- Panadería;
- Pastelería;
- Bebidas;
- Sin TACC;
- Chocolates.

---

## 9.2. Listar categorías

```http
GET /api/categories
```

### Query params opcionales

| Parámetro | Tipo | Descripción |
|---|---|---|
| `activeOnly` | boolean | Si es true, devuelve solo categorías activas |

Ejemplo:

```http
GET /api/categories?activeOnly=true
```

### Response

```json
[
  {
    "id": 1,
    "name": "Panadería",
    "description": "Productos principales de panadería",
    "active": true
  }
]
```

---

## 9.3. Obtener categoría por ID

```http
GET /api/categories/{id}
```

---

## 9.4. Crear categoría

```http
POST /api/categories
```

### Request

```json
{
  "name": "Lácteos",
  "description": "Productos refrigerados derivados de leche",
  "active": true
}
```

### Validaciones relevantes

- `name` es obligatorio.
- No puede existir otra categoría con el mismo nombre.

---

## 9.5. Actualizar categoría

```http
PUT /api/categories/{id}
```

Request igual al de creación.

---

## 9.6. Desactivar categoría

```http
DELETE /api/categories/{id}
```

Efecto:

```text
active = false
```

---

# 10. Proveedores

## 10.1. Contexto

Los proveedores permiten diferenciar entre la franquicia y proveedores externos.

Esto es clave porque uno de los problemas de Dulce Hora es que los productos externos no están bien registrados en el sistema de franquicia.

---

## 10.2. Listar proveedores

```http
GET /api/suppliers
```

### Query params opcionales

| Parámetro | Tipo | Ejemplo |
|---|---|---|
| `activeOnly` | boolean | `true` |
| `supplierType` | SupplierType | `EXTERNAL` |

Ejemplos:

```http
GET /api/suppliers?activeOnly=true
```

```http
GET /api/suppliers?supplierType=WHOLESALER
```

### Response

```json
[
  {
    "id": 1,
    "name": "Dulce Hora Franquicia",
    "supplierType": "FRANCHISE",
    "contactName": "Administración",
    "phone": "11-1234-5678",
    "email": "contacto@dulcehora.local",
    "notes": "Proveedor principal de franquicia",
    "active": true
  }
]
```

---

## 10.3. Obtener proveedor por ID

```http
GET /api/suppliers/{id}
```

---

## 10.4. Crear proveedor

```http
POST /api/suppliers
```

### Request

```json
{
  "name": "Distribuidora La Nueva",
  "supplierType": "EXTERNAL",
  "contactName": "Carlos Pérez",
  "phone": "11-4444-5555",
  "email": "ventas@lanueva.com",
  "notes": "Proveedor externo de bebidas y snacks.",
  "active": true
}
```

### Validaciones relevantes

- `name` es obligatorio.
- `supplierType` es obligatorio.
- `email` debe tener formato válido si se envía.
- No puede existir otro proveedor con el mismo nombre.

---

## 10.5. Actualizar proveedor

```http
PUT /api/suppliers/{id}
```

---

## 10.6. Desactivar proveedor

```http
DELETE /api/suppliers/{id}
```

Efecto:

```text
active = false
```

---

# 11. Usuarios

## 11.1. Contexto

Los usuarios se usan para trazabilidad: saber quién registró una merma, una venta, un ajuste o una promoción.

---

## 11.2. Listar usuarios

```http
GET /api/users
```

### Query params opcionales

| Parámetro | Tipo | Ejemplo |
|---|---|---|
| `enabledOnly` | boolean | `true` |
| `role` | Role | `OWNER` |

Ejemplos:

```http
GET /api/users?enabledOnly=true
```

```http
GET /api/users?role=EMPLOYEE
```

### Response

```json
[
  {
    "id": 1,
    "firstName": "Ramiro",
    "lastName": "Admin",
    "email": "admin@panstock.local",
    "role": "ADMIN_OWNER",
    "enabled": true
  }
]
```

No se devuelve contraseña.

---

## 11.3. Obtener usuario por ID

```http
GET /api/users/{id}
```
---

## 11.4. Crear usuario desde Postman con JWToken

```
Método: POST
URL: {{base_url}}/auth/register
Headers: Content-Type: application/json
Body → raw → JSON:
```
### Request

```json
{
  "username": "usuarioprueba",
  "firstName": "Pepe",
  "lastName": "Jefe",
  "email": "pepejefe@panstock.local",
  "password": "1234",
  "role": "OWNER"
}

```
Si ya corriste el script SQL con los datos mock, ya hay usuarios creados. En ese caso vamos a autenticarnos/logearnos: 
Método: POST
URL: {{base_url}}/auth/authenticate
Headers: Content-Type: application/json
Body → raw → JSON:
```
```
### Request

```json
{
  "username": "lorena",
  "password": "1234"
}

```
### Response OK

```json
{
  "ok": true,
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiJ9...",
    "username": "lorena",
    "email": "lorena@panstock.local",
    "role": "OWNER"
  }
}

```
```
Configurar la autenticación en todos los requests siguientes
En cada request que requiera autenticación:

Ir a la pestaña Authorization
Tipo: Bearer Token
Token: {{access_token}}
```
### Validaciones relevantes

- `firstName` obligatorio.
- `lastName` obligatorio.
- `email` obligatorio y único.
- `password` obligatorio al crear.
- `role` obligatorio.

---

## 11.5. Actualizar usuario

```http
PUT http://localhost:8081/users/update
Authorization: Bearer <tu_token>
Content-Type: application/json

El servidor va a ignorar role y username aunque los mandes. Solo va a actualizar lastName y email. Como password es null, la contraseña no cambia

```
```json
{
  "username": "martina",
  "firstName": "Martina",
  "lastName": "González",
  "email": "martina.nueva@panstock.local",
  "password": null,
  "role": "OWNER"
}
```

## 11.6. Deshabilitar usuario

```http 
PATCH http://localhost:8081/users/4/disable
Authorization: Bearer <token_de_lorena>
```
---

# 12. Stock

## 12.1. Contexto

El stock se maneja por lotes. Cada ingreso de mercadería crea un lote en `inventory_batches`.

Un producto puede tener varios lotes con diferentes fechas de vencimiento.

---

## 12.2. Ver stock actual agrupado por producto

```http
GET /api/stock
```

### Response

```json
[
  {
    "productId": 1,
    "productName": "Medialunas manteca",
    "origin": "FRANCHISE",
    "unitType": "UNIT",
    "totalQuantity": 25.000,
    "nearestExpirationDate": "2026-05-09"
  }
]
```

### Uso sugerido en frontend

Pantalla de stock general:

- producto;
- origen;
- cantidad total;
- unidad;
- vencimiento más cercano;
- indicador visual si hay próximo vencimiento.

---

## 12.3. Listar lotes

```http
GET /api/stock/batches
```

### Response

```json
[
  {
    "id": 1,
    "productId": 1,
    "productName": "Medialunas manteca",
    "supplierId": 1,
    "supplierName": "Dulce Hora Franquicia",
    "receivedDate": "2026-05-08",
    "expirationDate": "2026-05-09",
    "initialQuantity": 30.000,
    "currentQuantity": 25.000,
    "unitCost": 250.00,
    "unitSalePrice": 700.00,
    "storageType": "DISPLAY",
    "batchStatus": "AVAILABLE",
    "expirationStatus": "YELLOW",
    "notes": "Ingreso mock"
  }
]
```

---

## 12.4. Obtener lote por ID

```http
GET /api/stock/batches/{id}
```

---

## 12.5. Registrar ingreso de mercadería

```http
POST /api/stock/entries
```

### Request

```json
{
  "productId": 1,
  "supplierId": 1,
  "receivedDate": "2026-05-08",
  "expirationDate": "2026-05-10",
  "quantity": 20,
  "unitCost": 250.00,
  "unitSalePrice": 700.00,
  "storageType": "FRIDGE",
  "notes": "Ingreso de prueba"
}
```

### Campos

| Campo | Obligatorio | Descripción |
|---|---|---|
| `productId` | Sí | Producto ingresado |
| `supplierId` | No | Proveedor del lote |
| `receivedDate` | Sí | Fecha de ingreso |
| `expirationDate` | Depende | Obligatoria si el producto es perecedero |
| `quantity` | Sí | Cantidad ingresada |
| `unitCost` | No | Si no se envía, usa costo del producto |
| `unitSalePrice` | No | Si no se envía, usa precio del producto |
| `storageType` | No | Tipo de almacenamiento |
| `notes` | No | Observaciones |

### Validaciones importantes

- La cantidad debe ser mayor a cero.
- Si el producto es perecedero, debe tener fecha de vencimiento.
- La fecha de vencimiento no puede ser anterior a la fecha de ingreso.

### Efecto en backend

- Crea un lote.
- Crea un movimiento de stock tipo `ENTRY`.

---

## 12.6. Próximos a vencer

```http
GET /api/stock/expiring
```

Usa la configuración `expiration_alert_days`.

También se puede enviar un valor manual:

```http
GET /api/stock/expiring?days=5
```

### Response

```json
[
  {
    "batchId": 1,
    "productId": 1,
    "productName": "Medialunas manteca",
    "currentQuantity": 25.000,
    "expirationDate": "2026-05-09",
    "daysToExpire": 1,
    "status": "YELLOW"
  }
]
```

---

## 12.7. Vencidos

```http
GET /api/stock/expired
```

Devuelve lotes vencidos.

---

# 13. Ventas manuales

## 13.1. Contexto

Como todavía no hay integración con caja registradora, el backend permite registrar ventas manuales.

La venta descuenta stock usando FEFO.

---

## 13.2. Registrar venta manual

```http
POST /api/stock/sales
```

### Request

```json
{
  "productId": 1,
  "userId": 2,
  "quantity": 5,
  "notes": "Venta manual desde frontend"
}
```

### Validaciones importantes

- `productId` obligatorio.
- `quantity` mayor a cero.
- No se puede vender más stock del disponible.
- No se venden lotes vencidos.
- No se puede vender producto inactivo.

### Response

```json
{
  "operationType": "SALE",
  "productId": 1,
  "productName": "Medialunas manteca",
  "totalQuantity": 5,
  "movements": [
    {
      "id": 20,
      "productId": 1,
      "productName": "Medialunas manteca",
      "batchId": 1,
      "movementType": "SALE",
      "quantity": 5,
      "movementDate": "2026-05-08T16:10:00",
      "notes": "Venta manual: Venta manual desde frontend"
    }
  ]
}
```

Puede devolver varios movimientos si la venta descuenta de más de un lote.

---

# 14. Ajustes de stock

## 14.1. Contexto

Los ajustes sirven para corregir diferencias entre stock físico y stock del sistema.

Ejemplos:

- faltan 2 unidades según recuento;
- sobran 3 unidades por corrección;
- se detectó error de carga.

---

## 14.2. Registrar ajuste

```http
POST /api/stock/adjustments
```

### Request ajuste positivo

```json
{
  "batchId": 1,
  "userId": 2,
  "adjustmentType": "IN",
  "quantity": 3,
  "notes": "Corrección por recuento físico"
}
```

### Request ajuste negativo

```json
{
  "batchId": 1,
  "userId": 2,
  "adjustmentType": "OUT",
  "quantity": 2,
  "notes": "Diferencia detectada en recuento físico"
}
```

### Validaciones importantes

- `batchId` obligatorio.
- `adjustmentType` obligatorio: `IN` u `OUT`.
- `quantity` mayor a cero.
- `OUT` no puede dejar stock negativo.
- No se puede ajustar un lote descartado.

### Response

```json
{
  "operationType": "ADJUSTMENT_OUT",
  "productId": 1,
  "productName": "Medialunas manteca",
  "totalQuantity": 2,
  "movements": [
    {
      "id": 21,
      "productId": 1,
      "productName": "Medialunas manteca",
      "batchId": 1,
      "movementType": "ADJUSTMENT_OUT",
      "quantity": 2,
      "movementDate": "2026-05-08T16:15:00",
      "notes": "Ajuste manual de stock: Diferencia detectada en recuento físico"
    }
  ]
}
```

---

# 15. Historial de movimientos de stock

## 15.1. Contexto

Cada cambio de stock queda registrado como movimiento.

Esto permite trazabilidad:

- cuándo entró mercadería;
- cuándo se vendió;
- cuándo se registró una merma;
- cuándo se ajustó manualmente.

---

## 15.2. Listar movimientos

```http
GET /api/stock/movements
```

### Query params opcionales

| Parámetro | Tipo | Ejemplo |
|---|---|---|
| `productId` | number | `1` |
| `batchId` | number | `2` |
| `movementType` | StockMovementType | `SALE` |
| `from` | LocalDate | `2026-05-01` |
| `to` | LocalDate | `2026-05-31` |

Ejemplos:

```http
GET /api/stock/movements?productId=1
```

```http
GET /api/stock/movements?movementType=WASTE
```

```http
GET /api/stock/movements?from=2026-05-01&to=2026-05-31
```

### Response

```json
[
  {
    "id": 1,
    "productId": 1,
    "productName": "Medialunas manteca",
    "batchId": 1,
    "userId": 2,
    "movementType": "ENTRY",
    "quantity": 30.000,
    "movementDate": "2026-05-08T10:00:00",
    "relatedWasteRecordId": null,
    "notes": "Ingreso de mercadería"
  }
]
```

---

## 15.3. Obtener movimiento por ID

```http
GET /api/stock/movements/{id}
```

---

# 16. Mermas

## 16.1. Contexto

Una merma representa pérdida de mercadería.

Ejemplos:

- producto vencido;
- producto roto;
- producto en mal estado;
- error de calidad.

---

## 16.2. Listar mermas

```http
GET /api/waste-records
```

### Response

```json
[
  {
    "id": 1,
    "productId": 1,
    "productName": "Medialunas manteca",
    "batchId": 1,
    "createdById": 2,
    "createdByName": "Encargado Demo",
    "quantity": 2.000,
    "reason": "EXPIRED",
    "wasteDate": "2026-05-08T12:00:00",
    "unitCost": 250.00,
    "unitSalePrice": 700.00,
    "economicLoss": 1400.00,
    "notes": "Merma por vencimiento"
  }
]
```

---

## 16.3. Obtener merma por ID

```http
GET /api/waste-records/{id}
```

---

## 16.4. Registrar merma

```http
POST /api/waste-records
```

### Request

```json
{
  "batchId": 1,
  "userId": 2,
  "quantity": 2,
  "reason": "EXPIRED",
  "notes": "Merma detectada en control diario"
}
```

### Validaciones importantes

- `batchId` obligatorio.
- `quantity` mayor a cero.
- La cantidad no puede superar el stock disponible del lote.
- No se puede registrar merma sobre lote agotado o descartado.

### Efecto en backend

- Crea un registro de merma.
- Descuenta stock del lote.
- Si el lote queda en cero, pasa a `DEPLETED`.
- Crea un movimiento de stock tipo `WASTE`.
- Calcula pérdida económica:

```text
economicLoss = quantity * unitSalePrice
```

---

# 17. Dashboard

## 17.1. Semáforo de vencimientos

```http
GET /api/dashboard/expiration-semaphore
```

### Response

```json
{
  "expiredCount": 2,
  "redCount": 3,
  "yellowCount": 5,
  "greenCount": 8,
  "notApplicableCount": 4,
  "items": [
    {
      "batchId": 1,
      "productId": 1,
      "productName": "Medialunas manteca",
      "currentQuantity": 25.000,
      "expirationDate": "2026-05-09",
      "daysToExpire": 1,
      "status": "YELLOW"
    }
  ]
}
```

### Uso sugerido en frontend

Pantalla de dashboard:

- tarjetas con cantidad de vencidos, rojos, amarillos, verdes;
- tabla de lotes críticos;
- colores visuales:
  - `EXPIRED`: gris/rojo oscuro;
  - `RED`: rojo;
  - `YELLOW`: amarillo;
  - `GREEN`: verde;
  - `NOT_APPLICABLE`: gris.

---

# 18. Promociones

## 18.1. Contexto

Las promociones buscan reducir desperdicio vendiendo productos próximos a vencer.

El backend puede sugerir promociones automáticamente para lotes en estado `RED` o `YELLOW`.

---

## 18.2. Sugerencias de promoción

```http
GET /api/promotions/suggestions
```

### Response

```json
[
  {
    "batchId": 1,
    "productId": 1,
    "productName": "Medialunas manteca",
    "currentQuantity": 25.000,
    "expirationDate": "2026-05-09",
    "daysToExpire": 1,
    "expirationStatus": "YELLOW",
    "suggestedDiscountPercentage": 10,
    "suggestedTitle": "Promo Medialunas manteca"
  }
]
```

### Reglas

No se sugieren promociones si:

- el lote está vencido;
- no tiene stock;
- ya tiene una promoción activa;
- no está dentro del umbral configurable.

---

## 18.3. Crear promoción

```http
POST /api/promotions
```

### Request por porcentaje

```json
{
  "productId": 1,
  "batchId": 1,
  "createdById": 2,
  "title": "Promo medialunas",
  "description": "Promoción para vender stock próximo a vencer.",
  "discountType": "PERCENTAGE",
  "discountPercentage": 15,
  "promotionalPrice": null,
  "startDate": "2026-05-08T16:00:00",
  "endDate": "2026-05-09T16:00:00",
  "suggestedBySystem": true
}
```

### Request por precio fijo

```json
{
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
}
```

### Validaciones importantes

- `endDate` debe ser posterior a `startDate`.
- Si `discountType = PERCENTAGE`, debe venir `discountPercentage`.
- Si `discountType = PERCENTAGE`, no debe venir `promotionalPrice`.
- Si `discountType = FIXED_PRICE`, debe venir `promotionalPrice`.
- Si `discountType = FIXED_PRICE`, no debe venir `discountPercentage`.
- No se puede crear promoción para lote vencido.
- No se puede crear promoción para lote sin stock.
- No se puede crear otra promoción activa para el mismo lote.

---

## 18.4. Listar promociones

```http
GET /api/promotions
```

### Response

```json
[
  {
    "id": 1,
    "productId": 1,
    "productName": "Medialunas manteca",
    "batchId": 1,
    "title": "Promo medialunas",
    "description": "Promoción para vender stock próximo a vencer.",
    "discountType": "PERCENTAGE",
    "discountPercentage": 15.00,
    "promotionalPrice": null,
    "startDate": "2026-05-08T16:00:00",
    "endDate": "2026-05-09T16:00:00",
    "status": "ACTIVE",
    "suggestedBySystem": true
  }
]
```

---

## 18.5. Listar promociones activas

```http
GET /api/promotions/active
```

Devuelve solo promociones `ACTIVE` cuyo `endDate` todavía no pasó.

---

## 18.6. Cancelar promoción

```http
PATCH /api/promotions/{id}/cancel
```

Efecto:

```text
status = CANCELLED
```

---

# 19. Reportes

## 19.1. Contexto

Los reportes permiten al dueño tomar decisiones.

No existe una entidad `Report`. Los reportes se calculan a partir de mermas, stock, productos, categorías y proveedores.

---

## 19.2. Resumen de mermas

```http
GET /api/reports/waste-summary?from=2026-05-01&to=2026-05-31
```

### Response

```json
{
  "from": "2026-05-01",
  "to": "2026-05-31",
  "totalWasteRecords": 4,
  "totalQuantity": 10.000,
  "totalEconomicLoss": 17900.00
}
```

---

## 19.3. Pérdida económica

```http
GET /api/reports/economic-loss?from=2026-05-01&to=2026-05-31
```

### Response

```json
{
  "from": "2026-05-01",
  "to": "2026-05-31",
  "totalEconomicLoss": 17900.00,
  "averageLossPerWasteRecord": 4475.00,
  "wasteRecordsCount": 4
}
```

---

## 19.4. Mermas por categoría

```http
GET /api/reports/waste-by-category?from=2026-05-01&to=2026-05-31
```

### Response

```json
[
  {
    "categoryId": 1,
    "categoryName": "Panadería",
    "wasteRecordsCount": 2,
    "totalQuantity": 5.000,
    "totalEconomicLoss": 3500.00
  }
]
```

---

## 19.5. Mermas por proveedor

```http
GET /api/reports/waste-by-supplier?from=2026-05-01&to=2026-05-31
```

### Response

```json
[
  {
    "supplierId": 1,
    "supplierName": "Dulce Hora Franquicia",
    "wasteRecordsCount": 2,
    "totalQuantity": 5.000,
    "totalEconomicLoss": 3500.00
  }
]
```

Si una merma no tiene proveedor asociado, puede devolver:

```json
{
  "supplierId": null,
  "supplierName": "Sin proveedor"
}
```

---

## 19.6. Estado de stock

```http
GET /api/reports/stock-status
```

### Response

```json
[
  {
    "productId": 1,
    "productName": "Medialunas manteca",
    "origin": "FRANCHISE",
    "categoryName": "Panadería",
    "unitType": "UNIT",
    "totalQuantity": 25.000,
    "minimumStock": 10.000,
    "nearestExpirationDate": "2026-05-09",
    "stockStatus": "OK"
  }
]
```

### Valores posibles de `stockStatus`

```text
OUT_OF_STOCK
LOW_STOCK
OK
WITHOUT_MINIMUM_STOCK
```

---

# 20. Settings

## 20.1. Contexto

Los settings permiten modificar umbrales del sistema sin tocar el código.

---

## 20.2. Ver días del semáforo

```http
GET /api/settings/expiration-alert-days
```

### Response

```json
{
  "key": "expiration_alert_days",
  "value": "2",
  "description": "Cantidad de días para considerar un lote próximo a vencer."
}
```

---

## 20.3. Actualizar días del semáforo

```http
PUT /api/settings/expiration-alert-days
```

### Request

```json
{
  "value": 5
}
```

Impacta en:

```http
GET /api/stock/expiring
```

y en la generación de alertas de vencimiento.

---

## 20.4. Ver días de sugerencias de promoción

```http
GET /api/settings/promotion-suggestion-days
```

---

## 20.5. Actualizar días de sugerencias de promoción

```http
PUT /api/settings/promotion-suggestion-days
```

### Request

```json
{
  "value": 4
}
```

Impacta en:

```http
GET /api/promotions/suggestions
```

---

# 21. Alertas

## 21.1. Contexto

Las alertas sirven para que el encargado detecte problemas sin tener que revisar manualmente todos los reportes.

Tipos principales:

- productos próximos a vencer;
- productos vencidos;
- stock bajo.

---

## 21.2. Listar todas las alertas

```http
GET /api/alerts
```

### Response

```json
[
  {
    "id": 1,
    "alertType": "EXPIRING_SOON",
    "productId": 1,
    "productName": "Medialunas manteca",
    "batchId": 1,
    "expirationDate": "2026-05-09",
    "message": "Medialunas manteca vence dentro de 1 día(s).",
    "severity": "YELLOW",
    "status": "ACTIVE",
    "createdAt": "2026-05-08T10:00:00",
    "resolvedAt": null
  }
]
```

---

## 21.3. Listar alertas activas

```http
GET /api/alerts/active
```

Devuelve solo alertas con:

```text
status = ACTIVE
```

---

## 21.4. Generar alertas

```http
POST /api/alerts/generate
```

Este endpoint revisa el estado actual y crea alertas nuevas si corresponde.

Revisa:

- lotes vencidos;
- lotes próximos a vencer;
- productos bajo stock mínimo.

No duplica alertas activas equivalentes.

### Response

```json
{
  "createdAlerts": 1,
  "alerts": [
    {
      "id": 9,
      "alertType": "LOW_STOCK",
      "productId": 3,
      "productName": "Pan de campo",
      "batchId": null,
      "expirationDate": null,
      "message": "Pan de campo está por debajo del stock mínimo. Stock actual: 3.000, mínimo: 5.000.",
      "severity": "YELLOW",
      "status": "ACTIVE",
      "createdAt": "2026-05-08T17:10:00",
      "resolvedAt": null
    }
  ]
}
```

---

## 21.5. Resolver alerta

```http
PATCH /api/alerts/{id}/resolve
```

Efecto:

```text
status = RESOLVED
resolvedAt = fecha y hora actual
```

---

# 22. Flujo recomendado para pantallas React

## 22.1. Pantalla principal o dashboard

Endpoints útiles:

```http
GET /api/dashboard/expiration-semaphore
GET /api/alerts/active
GET /api/reports/stock-status
```

Componentes sugeridos:

- tarjetas de vencimientos;
- tabla de alertas activas;
- listado de productos con stock bajo;
- acceso rápido a promociones sugeridas.

---

## 22.2. Pantalla de productos

Endpoints útiles:

```http
GET /api/products
POST /api/products
PUT /api/products/{id}
DELETE /api/products/{id}
GET /api/categories?activeOnly=true
GET /api/suppliers?activeOnly=true
```

El formulario de producto necesita cargar categorías y proveedores para selects.

---

## 22.3. Pantalla de stock

Endpoints útiles:

```http
GET /api/stock
GET /api/stock/batches
POST /api/stock/entries
POST /api/stock/sales
POST /api/stock/adjustments
GET /api/stock/movements
```

Componentes sugeridos:

- tabla de stock por producto;
- modal de ingreso de mercadería;
- modal de venta manual;
- modal de ajuste de stock;
- detalle por lotes.

---

## 22.4. Pantalla de mermas

Endpoints útiles:

```http
GET /api/waste-records
POST /api/waste-records
GET /api/stock/batches
```

Para registrar una merma, el frontend necesita elegir un lote.

Se recomienda mostrar:

- producto;
- lote;
- vencimiento;
- stock disponible;
- motivo;
- cantidad;
- pérdida económica calculada por backend luego de enviar.

---

## 22.5. Pantalla de promociones

Endpoints útiles:

```http
GET /api/promotions
GET /api/promotions/active
GET /api/promotions/suggestions
POST /api/promotions
PATCH /api/promotions/{id}/cancel
```

Flujo sugerido:

1. mostrar sugerencias;
2. permitir crear promoción desde una sugerencia;
3. listar promociones activas;
4. permitir cancelar promoción.

---

## 22.6. Pantalla de reportes

Endpoints útiles:

```http
GET /api/reports/waste-summary?from=YYYY-MM-DD&to=YYYY-MM-DD
GET /api/reports/economic-loss?from=YYYY-MM-DD&to=YYYY-MM-DD
GET /api/reports/waste-by-category?from=YYYY-MM-DD&to=YYYY-MM-DD
GET /api/reports/waste-by-supplier?from=YYYY-MM-DD&to=YYYY-MM-DD
GET /api/reports/stock-status
```

Componentes sugeridos:

- selector de rango de fechas;
- tarjetas de pérdida total;
- gráficos por categoría;
- gráficos por proveedor;
- tabla de estado de stock.

---

## 22.7. Pantalla de configuración

Endpoints útiles:

```http
GET /api/settings/expiration-alert-days
PUT /api/settings/expiration-alert-days
GET /api/settings/promotion-suggestion-days
PUT /api/settings/promotion-suggestion-days
```

Permite configurar:

- cuántos días antes se marca como próximo a vencer;
- cuántos días antes se sugieren promociones.

---

# 23. Orden recomendado de implementación frontend

Para construir el frontend de forma ordenada, se recomienda este orden:

```text
1. Layout general y navegación.
2. Dashboard inicial.
3. Productos, categorías y proveedores.
4. Stock y lotes.
5. Ingreso de mercadería.
6. Ventas manuales y ajustes.
7. Mermas.
8. Promociones.
9. Alertas.
10. Reportes.
11. Usuarios.
12. Settings.
```

Motivo:

- primero se construyen los datos maestros;
- después las operaciones de stock;
- después las visualizaciones y reportes;
- finalmente configuración y usuarios.

---

# 24. Ejemplo de cliente API simple en React

Se recomienda centralizar la URL base.

```js
const API_BASE_URL = "http://localhost:8081/api";

export async function getProducts() {
  const response = await fetch(`${API_BASE_URL}/products`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Error al obtener productos");
  }

  return response.json();
}
```

Ejemplo POST:

```js
export async function createProduct(product) {
  const response = await fetch(`${API_BASE_URL}/products`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(product)
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Error al crear producto");
  }

  return response.json();
}
```

---

# 25. Consideraciones finales para frontend

## 25.1. No asumir que todos los campos vienen siempre

Algunos campos pueden venir `null`.

Ejemplos:

- `expirationDate`;
- `supplierId`;
- `supplierName`;
- `batchId`;
- `createdById`;
- `resolvedAt`;
- `promotionalPrice`;
- `discountPercentage`.

El frontend debe manejar `null` correctamente.

---

## 25.2. Formatear estados para usuario final

El backend devuelve strings técnicos.

Ejemplo:

```text
ADJUSTMENT_OUT
```

En UI conviene mostrar:

```text
Ajuste negativo
```

Ejemplo de mapeo:

```js
const movementLabels = {
  ENTRY: "Ingreso",
  WASTE: "Merma",
  SALE: "Venta",
  ADJUSTMENT_IN: "Ajuste positivo",
  ADJUSTMENT_OUT: "Ajuste negativo"
};
```

---

## 25.3. Usar colores consistentes

Para vencimientos:

```js
const expirationColors = {
  EXPIRED: "red",
  RED: "red",
  YELLOW: "yellow",
  GREEN: "green",
  NOT_APPLICABLE: "gray"
};
```

Para alertas:

```js
const alertColors = {
  RED: "red",
  YELLOW: "yellow",
  INFO: "blue"
};
```

---

## 25.4. Separar formularios por operación

No conviene tener un único formulario gigante de stock.

Mejor:

- formulario de ingreso;
- formulario de venta;
- formulario de ajuste;
- formulario de merma.

Cada uno tiene reglas distintas.

---

## 25.5. El frontend no debe recalcular reglas críticas

El frontend puede mostrar previews, pero las reglas importantes se validan en backend.

Ejemplos:

- stock disponible;
- FEFO;
- vencidos no vendibles;
- merma no mayor al stock;
- promoción activa duplicada;
- fechas válidas.

Si el backend rechaza la operación, mostrar el mensaje de error.

---

# 26. Resumen de endpoints

## Productos

```http
GET    /api/products
GET    /api/products/{id}
POST   /api/products
PUT    /api/products/{id}
DELETE /api/products/{id}
```

## Categorías

```http
GET    /api/categories
GET    /api/categories/{id}
POST   /api/categories
PUT    /api/categories/{id}
DELETE /api/categories/{id}
```

## Proveedores

```http
GET    /api/suppliers
GET    /api/suppliers/{id}
POST   /api/suppliers
PUT    /api/suppliers/{id}
DELETE /api/suppliers/{id}
```

## Usuarios

```http
GET    /api/users
GET    /api/users/{id}
POST   /api/users
PUT    /api/users/{id}
DELETE /api/users/{id}
```

## Stock

```http
GET  /api/stock
GET  /api/stock/batches
GET  /api/stock/batches/{id}
POST /api/stock/entries
GET  /api/stock/expiring
GET  /api/stock/expired
POST /api/stock/sales
POST /api/stock/adjustments
```

## Movimientos

```http
GET /api/stock/movements
GET /api/stock/movements/{id}
```

## Mermas

```http
GET  /api/waste-records
GET  /api/waste-records/{id}
POST /api/waste-records
```

## Dashboard

```http
GET /api/dashboard/expiration-semaphore
```

## Promociones

```http
GET   /api/promotions
GET   /api/promotions/active
GET   /api/promotions/suggestions
POST  /api/promotions
PATCH /api/promotions/{id}/cancel
```

## Reportes

```http
GET /api/reports/waste-summary
GET /api/reports/economic-loss
GET /api/reports/waste-by-category
GET /api/reports/waste-by-supplier
GET /api/reports/stock-status
```

## Settings

```http
GET /api/settings/expiration-alert-days
PUT /api/settings/expiration-alert-days
GET /api/settings/promotion-suggestion-days
PUT /api/settings/promotion-suggestion-days
```

## Alertas

```http
GET   /api/alerts
GET   /api/alerts/active
POST  /api/alerts/generate
PATCH /api/alerts/{id}/resolve
```

---

# 27. Alcance actual y cosas que no están implementadas todavía

Actualmente no está implementado:

- login;
- JWT;
- permisos por rol;
- frontend;
- integración con caja registradora;
- generación automática programada de alertas;
- envío de notificaciones por WhatsApp/Telegram/email;
- predicción de demanda;
- integración con balanzas;
- microservicios separados.

Estos puntos quedan para futuras versiones.

Para el MVP actual, el backend ya permite construir una interfaz completa de gestión de inventario, vencimientos, mermas, promociones, alertas y reportes.
