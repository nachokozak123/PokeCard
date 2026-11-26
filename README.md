# PokeCard

Tienda online de cartas coleccionables Pokémon. *"Cartas únicas, compras seguras."*

- **Base de datos:** Supabase (PostgreSQL), con RLS activado.
- **Backend:** Node.js + Express. Contraseñas con bcrypt y sesión con JWT en una cookie httpOnly.
- **Frontend:** React + Vite.

## Estructura

```
PokeCard/
├── database/schema.sql     ← tablas, seguridad y datos de ejemplo (se pega en Supabase)
├── backend/                ← API (Express)
│   └── src/
│       ├── server.js       ← arranque, seguridad general y manejo de errores
│       ├── db.js           ← conexión a Supabase
│       ├── auth.js         ← sesión (cookie + JWT) y permisos
│       └── routes/         ← usuarios, productos, catalogos, pedidos, admin
├── frontend/               ← página web (React)
│   └── src/
│       ├── pages/          ← una pantalla por archivo (admin/ para el panel)
│       ├── components/     ← Navbar, tarjeta de producto, ruta protegida
│       ├── api.js, AuthContext.jsx, CarritoContext.jsx, validaciones.js
│       └── styles.css      ← paleta e identidad visual
└── docs/                   ← documentación, requerimientos, Word, diagramas y marketing
```

## Cómo conectarlo con Supabase (paso a paso)

### 1. Crear el proyecto
1. Entrá a [supabase.com](https://supabase.com), iniciá sesión y tocá **New project**.
2. Poné un nombre (ej. `pokecard`), una **contraseña de base de datos** (guardala, la vas a necesitar, pokecard12345678910) y la región **South America (São Paulo)**.
3. Esperá a que termine de crearse (1 o 2 minutos).

### 2. Crear las tablas
1. En el menú de la izquierda entrá a **SQL Editor** → **New query**.
2. Copiá todo el contenido de `database/schema.sql`, pegalo y tocá **Run**.
3. En **Table Editor** tienen que aparecer 6 tablas: `usuario`, `categoria`, `proveedor`, `producto`, `pedido` y `detalle_pedido`, con los datos de ejemplo.

> Las tablas quedan con **RLS activado** y sin permisos para la API pública de Supabase. Es a propósito: nadie puede leerlas desde afuera, solo nuestro backend. Si Supabase muestra el aviso *"RLS enabled, no policies"*, está bien así.

### 3. Copiar la cadena de conexión
1. Arriba de todo, tocá el botón **Connect**.
2. Elegí **Session pooler** (funciona en cualquier red; la "Direct connection" necesita IPv6).
3. Copiá la URI. Se ve así:
   ```
   postgresql://postgres.abcdefghijk:[YOUR-PASSWORD]@aws-0-sa-east-1.pooler.supabase.com:5432/postgres
   ```
4. Reemplazá `[YOUR-PASSWORD]` por la contraseña del paso 1 (sin los corchetes). Si la contraseña tiene símbolos como `@`, `#` o `/`, conviene cambiarla en **Project Settings → Database → Reset database password** por una solo con letras y números.

### 4. Configurar el backend
```bash
cd backend
npm install
cp .env.example .env        # en Windows: copy .env.example .env
```
Abrí `backend/.env` y completá:
- `DATABASE_URL` → la URI del paso 3.
- `JWT_SECRET` → un texto aleatorio largo. Generalo con:
  ```bash
  node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
  ```

Arrancá la API:
```bash
npm run dev                 # http://localhost:3001/api  →  {"api":"PokeCard","estado":"ok"}
```
Si dice `PokeCard escuchando en http://localhost:3001` y al abrir `http://localhost:3001/api/productos` ves los productos en JSON, **ya está conectado a Supabase**.

### 5. Levantar la página
En otra terminal:
```bash
cd frontend
npm install
npm run dev                 # http://localhost:5173
```
Vite reenvía las llamadas a `/api` al backend, así que no hay que configurar nada más.

### Usuarios de prueba
| Rol | Email | Contraseña |
|---|---|---|
| Admin | admin@pokecard.com | Admin123 |
| Cliente | cliente@pokecard.com | Cliente123 |

> Antes de publicar la página, cambiá estas contraseñas o borrá estos usuarios.

### Errores comunes
| Mensaje | Solución |
|---|---|
| `Falta DATABASE_URL` / `JWT_SECRET falta o es muy corto` | Revisá que el archivo se llame `.env` (no `.env.example`) y esté dentro de `backend/`. |
| `password authentication failed` | La contraseña de la URI está mal. Reseteala en Supabase y volvé a copiarla. |
| `ENOTFOUND` o `ENETUNREACH` | Usaste la "Direct connection". Copiá la de **Session pooler**. |
| `relation "producto" does not exist` | Falta ejecutar `database/schema.sql` en el SQL Editor. |
| La página carga pero no muestra productos | El backend no está corriendo: abrí otra terminal con `npm run dev` en `backend/`. |

## Publicarlo (un solo servicio)
En producción el backend también entrega la página ya compilada, así que todo queda en un solo dominio (sin CORS y con la cookie protegida). Ejemplo con [Render](https://render.com) → **New Web Service** conectado al repositorio:

| Campo | Valor |
|---|---|
| Build command | `cd frontend && npm install && npm run build && cd ../backend && npm install` |
| Start command | `cd backend && npm start` |
| Variables de entorno | `DATABASE_URL`, `JWT_SECRET` y `NODE_ENV=production` |

Requiere Node.js 22 o superior.

## Seguridad
- Contraseñas con **bcrypt** (12 rondas). Mínimo 8 caracteres con letras y números.
- Sesión con **JWT en cookie httpOnly + SameSite=Strict** (el JavaScript de la página no puede leerla) que vence a las 2 horas.
- El rol se vuelve a leer de la base en cada petición: si se le quita el admin a alguien, pierde el acceso en el acto.
- **Bloqueo de cuenta** por 15 minutos después de 5 contraseñas incorrectas (guardado en la base) y **límite de peticiones** por IP en login y registro.
- **RLS** activado en Supabase: la API pública no puede leer ninguna tabla.
- Consultas **parametrizadas** (sin inyección SQL), encabezados de seguridad con **helmet** (CSP, anti-clickjacking) y validación de todos los datos en el servidor.
- Compra dentro de una **transacción** con bloqueo de filas: precios y stock salen de la base, nunca del navegador. De la tarjeta solo se guardan los últimos 4 dígitos.

## Endpoints

| Método | Ruta | Acceso |
|---|---|---|
| POST | `/api/usuarios/registro`, `/api/usuarios/login`, `/api/usuarios/logout` | Público |
| GET | `/api/usuarios/yo` | Público (devuelve el usuario o `null`) |
| GET | `/api/usuarios` | Admin |
| GET | `/api/productos` (filtros: `categoria`, `coleccion`, `rareza`, `orden`, `q`, `limite`) | Público |
| GET | `/api/productos/filtros`, `/api/productos/:id` | Público |
| POST / PUT / DELETE | `/api/productos`, `/api/productos/:id` (si ya se vendió, se archiva) | Admin |
| GET | `/api/categorias` | Público |
| POST / PUT / DELETE | `/api/categorias/:id` | Admin |
| GET / POST / PUT / DELETE | `/api/proveedores` | Admin |
| POST | `/api/pedidos` (compra con **pago simulado**) | Con sesión |
| GET | `/api/pedidos/mios`, `/api/pedidos/:id` | Con sesión (solo los propios) |
| GET | `/api/pedidos?estado=` | Admin |
| PATCH | `/api/pedidos/:id/estado` (`pagado`, `enviado`, `cancelado`; cancelar devuelve el stock) | Admin |
| GET | `/api/admin/dashboard`, `/api/admin/productos` | Admin |

## Pago simulado
- Tarjeta aprobada: `4111 1111 1111 1111`, cualquier vencimiento futuro y CVC de 3 dígitos.
- Tarjeta rechazada: cualquier número válido terminado en `0002` (por ejemplo `4000 0000 0000 0002`).
- No se cobra nada ni se guarda el número de la tarjeta.

La documentación completa está en `docs/Documentacion_Tecnica.md` y los requerimientos en `docs/Requerimientos.md`.
