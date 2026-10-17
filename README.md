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

## Qué queda para la próxima etapa
Carrito, pedidos ("Mis pedidos") y conexión del checkout. Las tablas `pedido` y `detalle_pedido` ya existen en la base y el dashboard ya las consulta.
