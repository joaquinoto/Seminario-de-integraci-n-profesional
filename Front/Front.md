# PanStock-client

## Resumen

Este entregable completa la lógica de **Productos** y **Categorías** en el frontend, registra todos los reducers en Redux (con persist), y corrige el `SecurityConfig.java` del backend.

---

## 1. Backend — `SecurityConfig.java` 

### Accesos
Todos los GET de productos, categorías y proveedores tienen `permitAll()` a `authenticated()`:

```java
// Productos
.requestMatchers(HttpMethod.GET,    "/api/products/**").authenticated()
.requestMatchers(HttpMethod.POST,   "/api/products/**").hasAuthority(Role.OWNER.name())
.requestMatchers(HttpMethod.PUT,    "/api/products/**").hasAuthority(Role.OWNER.name())
.requestMatchers(HttpMethod.DELETE, "/api/products/**").hasAuthority(Role.OWNER.name())

// Categorías
.requestMatchers(HttpMethod.GET,    "/api/categories/**").authenticated()
.requestMatchers(HttpMethod.POST,   "/api/categories/**").hasAuthority(Role.OWNER.name())
.requestMatchers(HttpMethod.PUT,    "/api/categories/**").hasAuthority(Role.OWNER.name())
.requestMatchers(HttpMethod.DELETE, "/api/categories/**").hasAuthority(Role.OWNER.name())

// Proveedores (también corregido — employees necesitan leer para el form de productos)
.requestMatchers(HttpMethod.GET,    "/api/suppliers/**").authenticated()
.requestMatchers(HttpMethod.POST,   "/api/suppliers/**").hasAuthority(Role.OWNER.name())
.requestMatchers(HttpMethod.PUT,    "/api/suppliers/**").hasAuthority(Role.OWNER.name())
.requestMatchers(HttpMethod.DELETE, "/api/suppliers/**").hasAuthority(Role.OWNER.name())
```

> **`application.properties` no requiere cambios** — la configuración de DB, JPA y JWT está correcta.

---

## 2. Frontend — Archivo por archivo

### `src/store/store.js` ✅ CORREGIDO
**Problema original:** Solo registraba `authReducer`. Los slices de `categories`, `products` y `suppliers` existían pero **nunca se conectaban al store**, por lo que cualquier `useSelector` de esos slices lanzaba un error de runtime.

**Corrección:** Se importan y registran los tres reducers con sus propias configuraciones de `redux-persist`:
- `auth` → persiste `token`, `user`, `isAuthenticated`
- `categories` → persiste `items` (la lista cargada)
- `products` → persiste `items` y `filters`
- `suppliers` → persiste `items`

Los campos `actionStatus` y `actionError` son estado efímero de UI y se excluyen intencionalmente del persist.

---

### `src/services/catalogService.js`
- Manejo de errores unificado: lee `data.message` (formato de error del backend Spring) y `data.error` (formato del wrapper `ResponseData`)
- Headers de auth incluidos en todas las llamadas
- Todos los métodos alineados con los endpoints documentados

---

### `src/features/catalog/categoriesSlice.js` 
Sin cambios de lógica — el slice original estaba correcto. Se mantiene igual con documentación mejorada.

### `src/features/catalog/productsSlice.js`
Sin cambios de lógica — el slice original estaba correcto.

### `src/features/catalog/suppliersSlice.js` ✅ REVISADO
Sin cambios de lógica.

---

### `src/pages/CategoriesPage.jsx` ✅ COMPLETADO
La lógica de roles estaba presente pero el store no registraba el reducer, así que nunca funcionaba.

Con el store corregido, la página ahora funciona completamente:

| Acción | OWNER | EMPLOYEE |
|--------|-------|----------|
| Ver listado | ✅ | ✅ |
| Buscar / filtrar | ✅ | ✅ |
| Ver inactivas (checkbox) | ✅ | ✅ |
| Botón "Nueva categoría" | ✅ visible | ❌ oculto |
| Botones editar/desactivar por fila | ✅ visibles | ❌ ocultos |
| Modal de formulario | ✅ se abre | ❌ no renderiza |
| Dialog de confirmación | ✅ se abre | ❌ no renderiza |

---

### `src/pages/ProductsPage.jsx` ✅ COMPLETADO
Misma lógica de roles:

| Acción | OWNER | EMPLOYEE |
|--------|-------|----------|
| Ver listado + expandir detalle | ✅ | ✅ |
| Filtros (categoría, origen, inactivos) | ✅ | ✅ |
| Botón "Nuevo producto" | ✅ visible | ❌ oculto |
| Botones editar/desactivar por fila | ✅ visibles | ❌ ocultos |
| Columna "Acciones" en el header | ✅ visible | ❌ oculta |
| Modal de formulario | ✅ se abre | ❌ no renderiza |
| Dialog de confirmación | ✅ se abre | ❌ no renderiza |

---

### `src/components/catalog/CategoryForm.jsx` ✅ REVISADO
Sin cambios de lógica — solo se llama desde CategoriesPage que ya verifica el rol OWNER.

### `src/components/catalog/ProductForm.jsx` ✅ REVISADO
- UnitTypes corregidos: `TRAY`, `BAG`, `PACK` en lugar de `PACKAGE` (según el enum Java real en `UnitType.java`)
- Solo se llama desde ProductsPage que ya verifica el rol OWNER

---

## 3. Cómo aplicar los cambios

### Backend
Reemplazar:
```
Back/panstock-api/src/main/java/com/panstock/api/controller/config/SecurityConfig.java
```
con el archivo en `backend-fix/SecurityConfig.java`.

> **No tocar** `application.properties`.

### Frontend
Reemplazar en `FrontB/panstock-client/src/`:

| Archivo entregado | Destino |
|---|---|
| `src/store/store.js` | `src/store/store.js` |
| `src/services/catalogService.js` | `src/services/catalogService.js` |
| `src/features/catalog/categoriesSlice.js` | `src/features/catalog/categoriesSlice.js` |
| `src/features/catalog/productsSlice.js` | `src/features/catalog/productsSlice.js` |
| `src/features/catalog/suppliersSlice.js` | `src/features/catalog/suppliersSlice.js` |
| `src/pages/CategoriesPage.jsx` | `src/pages/CategoriesPage.jsx` |
| `src/pages/ProductsPage.jsx` | `src/pages/ProductsPage.jsx` |
| `src/components/catalog/CategoryForm.jsx` | `src/components/catalog/CategoryForm.jsx` |
| `src/components/catalog/ProductForm.jsx` | `src/components/catalog/ProductForm.jsx` |

Los archivos no listados (`App.jsx`, `LoginPage.jsx`, `RegisterPage.jsx`, `DashboardPage.jsx`, `AppTopbar.jsx`, `CatalogUI.jsx`, `FormField.jsx`, `authSlice.js`, `authService.js`, `main.jsx`, etc.) **no requieren cambios**.
