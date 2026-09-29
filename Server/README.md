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

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/productos` | Lista productos. Filtros opcionales: `?categoria_id=`, `?rareza=`, `?precio_max=` |
| GET | `/productos/:id` | Detalle de un producto |
| POST | `/usuarios/registro` | Crea un usuario. Body: `nombre, apellido, email, password` |
| POST | `/usuarios/login` | Login. Body: `email, password`. Devuelve un token JWT |

## Próximos endpoints

- `POST /carrito` y `GET /carrito` (carrito_item)
- `POST /pedidos` (crear pedido + detalle_pedido, descontar stock)
- `GET /pedidos` (historial del usuario logueado)
- Rutas de administrador (crear/editar productos, ver todos los pedidos)
