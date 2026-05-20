# PanStock-client

## Correcciones en el `SecurityConfig.java` del backend:
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
---

## 2. Frontend — Archivo por archivo

### `src/store/store.js`

Se importan y registran los reducers con sus propias configuraciones de `redux-persist`:
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

### `src/pages/CategoriesPage.jsx` 

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

### `src/pages/ProductsPage.jsx` 

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

### `src/components/catalog/ProductForm.jsx` 
- UnitTypes corregidos: `TRAY`, `BAG`, `PACK` en lugar de `PACKAGE` (según el enum Java real en `UnitType.java`)
- Solo se llama desde ProductsPage que ya verifica el rol OWNER

---
