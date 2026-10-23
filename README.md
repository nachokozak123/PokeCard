# PokeCard — Primera etapa

Tienda online de cartas coleccionables Pokémon. *"Cartas únicas, compras seguras."*

- **Backend:** Node.js + Express + MySQL (contraseñas con bcrypt, login con JWT)
- **Frontend:** React + Vite

## Qué incluye esta entrega

| Punto | Dónde está |
|---|---|
| Login con permisos de usuarios (cliente / admin) | `backend/src/middleware/auth.js`, `backend/src/routes/usuarios.js`, `frontend/src/components/RutaProtegida.jsx` |
| CRUD de productos (más categorías y proveedores por API) | `backend/src/routes/productos.js`, `catalogos.js`, `frontend/src/pages/admin/AdminProductos.jsx` |
| Panel administrativo (dashboard) | `backend/src/routes/admin.js`, `frontend/src/pages/admin/Dashboard.jsx` |
| Encriptado de contraseña | `bcryptjs` en `backend/src/routes/usuarios.js` |
| Diagrama Entidad-Relación | `docs/DER_PokeCard.png` |
| Diagrama de base de datos | `docs/Diagrama_BD_PokeCard.png` y `database/schema.sql` |
| Requerimientos funcionales y no funcionales | `docs/Requerimientos.md` |
| Tests de backend | `backend/tests/` (17 tests) |
| Mockups | `docs/mockups/` |

## Cómo ejecutarlo

Necesitás Node.js 18+ y MySQL 8.

### 1. Base de datos
```bash
mysql -u root -p < database/schema.sql
```

### 2. Backend
```bash
cd backend
npm install
cp .env.example .env      # completá DB_PASSWORD y JWT_SECRET
npm run seed              # carga categorías, productos y usuarios de ejemplo
npm run dev               # http://localhost:3001
```

### 3. Frontend
```bash
cd frontend
npm install
npm run dev               # http://localhost:5173
```
Si el backend corre en otra dirección, copiá `.env.example` a `.env` y cambiá `VITE_API_URL`.

### Usuarios de prueba (creados por `npm run seed`)
| Rol | Email | Contraseña |
|---|---|---|
| Admin | admin@pokecard.com | Admin123 |
| Cliente | cliente@pokecard.com | Cliente123 |

## Tests del backend
```bash
cd backend
npm test
```
Los tests usan una base de datos simulada (mock), por lo que **no necesitan MySQL**.

| Archivo | Qué prueban |
|---|---|
| `usuarios.test.js` | El registro guarda el **hash** y no el texto plano, fuerza el rol cliente, rechaza emails repetidos y contraseñas cortas; el login devuelve un JWT válido o 401. |
| `permisos.test.js` | Sin token → 401; token falso → 401; cliente → 403; admin → 201. |
| `productos.test.js` | Listado, 404, protección contra inyección en el orden, validaciones del CRUD y respuesta del dashboard. |

## Endpoints

| Método | Ruta | Acceso |
|---|---|---|
| POST | `/usuarios/registro` | Público |
| POST | `/usuarios/login` | Público |
| GET | `/usuarios` | Admin |
| GET | `/productos` (filtros: `categoria`, `coleccion`, `rareza`, `orden`, `q`) | Público |
| GET | `/productos/filtros` | Público |
| GET | `/productos/:id` | Público |
| POST / PUT / DELETE | `/productos`, `/productos/:id` | Admin |
| GET | `/categorias` | Público |
| POST / PUT / DELETE | `/categorias` | Admin |
| GET / POST / PUT / DELETE | `/proveedores` | Admin |
| GET | `/admin/dashboard` | Admin |
| POST | `/pedidos` (compra con **pago simulado**) | Usuario con sesión |
| GET | `/pedidos/mios` | Usuario con sesión |

## Módulo de pago (simulación)
- **Carrito:** `frontend/src/CarritoContext.jsx` y `pages/Carrito.jsx` (se guarda en `localStorage`).
- **Checkout:** `pages/Checkout.jsx` usa la tarjeta animada de [`crd-ui`](https://crd-ui.juanda.co/) y valida número (Luhn), titular, vencimiento y CVC.
- **Pago simulado:** `backend/src/routes/pedidos.js`. Revalida todo, toma precios y stock de la base (nunca del cliente), crea el pedido en una transacción y descuenta el stock. **El número de tarjeta no se guarda.**
- **Tarjetas de prueba:** `4111 1111 1111 1111` (aprobada) · cualquier tarjeta válida terminada en `0002` (rechazada). Vencimiento futuro y CVC de 3 dígitos.
- **Mis pedidos:** `pages/MisPedidos.jsx`.
- Tests: `backend/tests/pedidos.test.js` (6 tests nuevos, 23 en total).
