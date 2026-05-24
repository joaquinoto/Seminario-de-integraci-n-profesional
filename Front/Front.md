## PanStock — Frontend 

Interfaz web para el sistema de gestión de inventario de la franquicia **Dulce Hora** . Construida en **React + Vite + Redux Toolkit + Redux Persist** . 

## Stack 

|Stack||
|---|---|
|**Capa**|**Tecnología**|
|Framework|React 18 + Vite|
|Estado global|Redux Toolkit|
|Persistencia local|Redux Persist (localStorage)|
|Routing|React Router v6|
|Estilos|CSS-in-JS inline (styled dentro de cada<br>componente)|
|Fuentes|Playfair Display + DM Sans (Google Fonts)|



## Requisitos previos 

- Node.js 18 o superior 

- Backend PanStock corriendo en http://localhost:8081 (o configurar VITE_API_URL) 

## Instalación y ejecución 

cd Front/panstock-client 

npm install 

npm run dev 

Para apuntar a otro backend, crear un archivo .env.local: 

VITE_API_URL=http://localhost:8081 

## Estructura de carpetas 

src/ 

├── components/ 

- │   ├── catalog/ 

- │   │   ├── CategoryForm.jsx       # Formulario crear/editar categoría 

- │   │   └── ProductForm.jsx        # Formulario crear/editar producto 

- │   ├── layout/ 

- │   │   └── AppTopbar.jsx          # Barra de navegación superior 

- │   ├── stock/ 

- │   │   ├── StockEntryForm.jsx     # Formulario de ingreso de mercadería 

- │   │   └── StockSaleForm.jsx      # Formulario de venta manual 

- │   └── ui/ 

- │       ├── CatalogUI.jsx          # Componentes compartidos (Modal, Badge, etc.) 

- │       └── FormField.jsx          # Input, Button, Alert reutilizables 

├── features/ 

- │   ├── auth/ 

- │   │   └── authSlice.js           # Login, registro, logout, perfil 

- │   ├── catalog/ 

- │   │   ├── categoriesSlice.js     # CRUD categorías 

- │   │   ├── productsSlice.js       # CRUD productos 

- │   │   └── suppliersSlice.js      # CRUD proveedores 

- │   └── stock/ 

- │       ├── expirationSlice.js     # Semáforo de vencimientos 

- │       └── stockSlice.js          # Stock, lotes, ingresos y ventas 

## ├── pages/ 

- │   ├── LoginPage.jsx 

- │   ├── RegisterPage.jsx 

- │   ├── DashboardPage.jsx 

- │   ├── ExpirationPage.jsx 

- │   ├── ProductsPage.jsx 

- │   ├── CategoriesPage.jsx 

- │   ├── SuppliersPage.jsx 

- │   └── StockPage.jsx 

## ├── services/ 

- │   ├── authService.js             # Llamadas a /auth/** 

- │   ├── catalogService.js          # Llamadas a /api/products, categories, suppliers 

- │   └── stockService.js            # Llamadas a /api/stock/expiring, expired, batches 

├── store/ 

- │   └── store.js                   # Configuración Redux + persistencia 

- ├── App.jsx                        # Rutas principales 

- ├── main.jsx                       # Entry point 

- └── index.css                      # Variables CSS globales y animaciones 

## Rutas 

|Rutas|||
|---|---|---|
|**Ruta**|**Página**|**Acceso**|
|/login|LoginPage|Público|
|/register|RegisterPage|Público|
|/dashboard|DashboardPage|Autenticado|
|/stock|StockPage|Autenticado|
|/expiration|ExpirationPage|Autenticado|
|/products|ProductsPage|Autenticado|
|/categories|CategoriesPage|Autenticado|
|/suppliers|SuppliersPage|Autenticado|



Las rutas protegidas redirigen a /login si no hay sesión activa. Si el token JWT expiró, se detecta automáticamente en TokenGuard (dentro de App.jsx) y se hace logout. 

## Roles y permisos en el frontend 

El frontend respeta los roles devueltos por el backend al autenticarse. 

|**Acción**|**OWNER**|**EMPLOYEE**|
|---|---|---|
|Ver stock, lotes, vencimientos|✅|✅|
|Registrar ingreso de<br>mercadería|✅|✅|
|Registrar venta manual|✅|✅|
|Crear / editar / desactivar<br>productos|✅|✅|
|Crear / editar / desactivar<br>categorías|✅|✅|
|Crear / editar / desactivar<br>proveedores|✅|✅|



|**Acción**|**OWNER**|**EMPLOYEE**|
|---|---|---|
|Retirar producto de la venta<br>(desde Vencimientos)|✅|✅|



Los botones de acción exclusivos de OWNER simplemente no se renderizan para EMPLOYEE. La validación final de permisos siempre la hace el backend. 

## Autenticación 

El flujo usa JWT. Al hacer login o registro exitoso, el backend devuelve un access_token que se guarda en Redux (y persiste en localStorage vía Redux Persist). 

Cada request autenticado envía el header: 

Authorization: Bearer <token> 

Al navegar, TokenGuard decodifica el JWT localmente y fuerza logout si está expirado. 

**Usuarios de prueba** (requieren que el SQL mock esté cargado): 

|**Usuario**|**Contraseña**|**Rol**|
|---|---|---|
|lorena|1234|OWNER|
|gabriel|1234|OWNER|
|martina|1234|EMPLOYEE|



## Estado global (Redux) 

## auth 

Persiste token, user e isAuthenticated. Se limpia al hacer logout. 

## categories, products, suppliers 

Persisten la lista de items y los filtros activos. Se recargan desde el servidor al entrar a cada página. 

## expiration 

Persiste solo los contadores del semáforo (greenCount, yellowCount, redCount, 

expiredCount) para mostrar el badge en la topbar sin necesidad de un fetch previo. La lista completa de items se recarga en cada visita a la página. 

## stock 

**No persiste** . Stock y lotes siempre se cargan frescos desde el servidor al entrar a la página. 

## Módulos implementados 

## Login y Registro 

- Login con usuario y contraseña 

- Registro en dos pasos (datos personales → usuario y rol) 

- Indicador de fuerza de contraseña 

- Validación de campos en cliente antes de enviar 

## Dashboard 

- Saludo personalizado con rol del usuario 

- Tarjeta de semáforo de vencimientos con contadores en tiempo real 

- Accesos directos a todos los módulos 

- Información de cuenta del usuario autenticado 

## Stock (/stock) 

Dos acciones principales accesibles para ambos roles: 

## **Registrar ingreso** (POST /api/stock/entries) 

- Selector de producto activo con indicador de perecedero 

- Autocompletado del proveedor por defecto del producto 

- Fecha de ingreso y vencimiento (obligatoria si el producto es perecedero) 

- Cantidad, tipo de almacenamiento y observaciones 

- Precios opcionales (si no se envían, usa los del producto) 

- Pantalla de éxito con opción de registrar otro ingreso 

## **Registrar venta** (POST /api/stock/sales) 

- Selector de producto activo con chips de origen, unidad y precio 

- El backend aplica FEFO automáticamente (descuenta del lote más próximo a vencer 

primero) 

- No se venden lotes vencidos ni productos inactivos (validado en backend) 

- Pantalla de éxito mostrando qué lotes fueron descontados y en qué cantidad 

- Opción de registrar otra venta sin cerrar el flujo 

Vista de resumen y vista de lotes con filtros por estado y búsqueda por nombre. 

## Vencimientos (/expiration) 

- Semáforo visual con contadores por estado: Vencido / Vence hoy / Vence pronto / En buen estado 

- Filtro por estado y búsqueda por nombre de producto 

- Agrupación por producto mostrando todos sus lotes 

- OWNER puede retirar un producto de la venta directamente desde esta pantalla (desactiva el producto) 

## Productos (/products) 

- Listado con filtros por categoría, origen y estado activo/inactivo 

- Panel expandible por producto con detalle completo 

- OWNER: crear, editar y desactivar productos (baja lógica) 

- EMPLOYEE: solo lectura 

## Categorías (/categories) 

- Listado con chips de color por categoría 

- OWNER: crear, editar y desactivar (baja lógica) 

- EMPLOYEE: solo lectura 

## Proveedores (/suppliers) 

- Listado con filtro por tipo (Franquicia / Mayorista / Externo) 

- OWNER: crear, editar y desactivar (baja lógica) 

- EMPLOYEE: solo lectura 

## Patrones de diseño 

**Mobile first.** Todos los layouts usan flex y grid con breakpoints en 480–780px. La topbar colapsa labels en pantallas chicas y solo muestra íconos. 

**Baja lógica.** Los DELETE del backend no eliminan registros, ponen active = false. El frontend refleja esto actualizando el item en el store local sin necesidad de un re-fetch completo. 

**Errores del backend.** Todos los formularios capturan el campo message de las respuestas de error y lo muestran en un banner al usuario. 

**Variables CSS globales.** La paleta completa (espresso, amber, cream, etc.), espaciados, radios y sombras están definidos en index.css como variables y se usan en todos los componentes. 

## Pendiente de implementar 

Los siguientes módulos están previstos pero no desarrollados aún: 

- Mermas (POST /api/waste-records) 

- Ajustes de stock (POST /api/stock/adjustments) 

- Historial de movimientos (GET /api/stock/movements) 

- Promociones (/api/promotions) 

- Reportes (/api/reports) 

- Alertas (/api/alerts) 

- Configuración del sistema (/api/settings) 


