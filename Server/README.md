# PokeCard - Backend

API en Node.js + Express para la tienda de cartas Pokemon.

## Instalación

1. Correr el script `pokecard_schema.sql` en tu base MySQL.
2. Instalar dependencias:
   ```
   npm install
   ```
3. Copiar `.env.example` a `.env` y completar los datos de tu base local.
4. Levantar el servidor:
   ```
   npm run dev
   ```

## Endpoints disponibles

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| GET | `/productos` | No | Lista productos. Filtros opcionales: `?categoria_id=`, `?rareza=`, `?precio_max=` |
| GET | `/productos/:id` | No | Detalle de un producto |
| POST | `/usuarios/registro` | No | Crea un usuario. Body: `nombre, apellido, email, password` |
| POST | `/usuarios/login` | No | Login. Body: `email, password`. Devuelve un token JWT |
| GET | `/carrito` | Sí | Items del carrito del usuario logueado |
| POST | `/carrito` | Sí | Agrega un producto. Body: `producto_id, cantidad` |
| PUT | `/carrito/:id` | Sí | Actualiza la cantidad de un item. Body: `cantidad` |
| DELETE | `/carrito/:id` | Sí | Saca un producto del carrito |
| POST | `/pedidos` | Sí | Genera un pedido a partir del carrito, descuenta stock y vacía el carrito |
| GET | `/pedidos` | Sí | Historial de pedidos del usuario logueado |
| GET | `/pedidos/:id` | Sí | Detalle de un pedido, con sus items |

Las rutas marcadas con **Auth: Sí** necesitan el token que devuelve `/usuarios/login`,
mandado en el header: `Authorization: Bearer <token>`.

## Próximos endpoints

- Rutas de administrador (crear/editar productos, ver todos los pedidos, cambiar estado de un pedido)
