# PokeCard — Documentación técnica

> *"Cartas únicas, compras seguras."*
> Tienda online de cartas coleccionables Pokémon.

## Índice

1. [Introducción](#1-introducción)
2. [Descripción del sistema](#2-descripción-del-sistema)
3. [Arquitectura del sistema](#3-arquitectura-del-sistema)
4. [Diseño de datos](#4-diseño-de-datos)
5. [Comportamiento del sistema](#5-comportamiento-del-sistema)
6. [Restricciones del diseño](#6-restricciones-del-diseño)
7. [Pruebas y validaciones](#7-pruebas-y-validaciones)
8. [Despliegue y operación](#8-despliegue-y-operación)
9. [Ciclo de vida del software](#9-ciclo-de-vida-del-software)
10. [Sector de Marketing e Identidad Institucional](#10-sector-de-marketing-e-identidad-institucional)

---

## 1. Introducción

### 1.1 Descripción general
PokeCard es una aplicación web de comercio electrónico para vender cartas coleccionables Pokémon (cartas sueltas, sobres, mazos y accesorios). Tiene un **frontend** en React + Vite y un **backend** (API REST) en Node.js + Express, conectado a una base de datos **PostgreSQL alojada en Supabase**. Hay dos roles: **cliente** (navega el catálogo, compra y consulta sus pedidos) y **admin** (gestiona productos, categorías, proveedores y pedidos, y ve el panel de métricas).

### 1.2 Propósito
Este documento describe cómo está construido PokeCard: su arquitectura, los datos, el comportamiento, las restricciones, las pruebas, el despliegue y la identidad institucional. Sirve como referencia para el equipo de desarrollo, los docentes que evalúan el proyecto y cualquier persona que tenga que mantenerlo en el futuro.

### 1.3 Alcance
**Incluye:** registro e inicio de sesión con roles, catálogo con búsqueda y filtros, detalle de producto, carrito, checkout con **pago simulado**, historial de pedidos del cliente, gestión de pedidos y sus estados por el admin, CRUD de productos (con archivado), pantalla de categorías y proveedores y dashboard administrativo con métricas.

**No incluye (por ahora):** pasarela de pago real, envíos con seguimiento del correo, recuperación de contraseña ni subida de imágenes (los productos usan una URL).

### 1.4 Objetivos de la documentación
- Dejar registrado **qué** hace el sistema y **cómo** lo hace, con referencias al código.
- Facilitar que un integrante nuevo pueda instalarlo y entenderlo sin ayuda.
- Justificar las decisiones de diseño (seguridad, datos y arquitectura).
- Unificar en un solo lugar la parte técnica y la identidad institucional de la empresa.

### 1.5 Cambios de la versión 2
Esta versión rehace el proyecto respetando el diseño, el nombre y el objetivo originales:

| Antes (v1) | Ahora (v2) | Por qué |
|---|---|---|
| MySQL 8 local | **PostgreSQL en Supabase** | Base en la nube, con respaldos y panel web, sin instalar nada. |
| Token JWT en `localStorage` | JWT en **cookie httpOnly + SameSite=Strict** | Un ataque XSS ya no puede robar la sesión. |
| Bloqueo de login en memoria | Bloqueo **guardado en la base** + límite por IP | No se pierde al reiniciar y sirve con varios servidores. |
| CORS abierto por defecto | Página y API en **el mismo dominio** | No hace falta CORS; la cookie queda protegida. |
| Sin encabezados de seguridad | **helmet** (CSP, anti-clickjacking) | Defensa extra contra XSS y clickjacking. |
| Contraseña de 6 caracteres | 8 a 72 caracteres con letras y números, bcrypt de 12 rondas | Contraseñas más difíciles de adivinar. |
| Producto vendido no se podía borrar | Se **archiva** | El admin puede sacarlo de la tienda sin perder el historial. |
| Categorías y proveedores solo por API | **Pantalla en el panel** | Ya no hace falta usar herramientas externas. |
| Sin búsqueda en la interfaz | **Buscador**, orden "más nuevos", selector de cantidad | Mejor experiencia de compra. |
| Tests automáticos | Plan de **pruebas manuales** (sección 7) | Pedido del equipo: proyecto más simple, sin archivos de más. |

---

## 2. Descripción del sistema

### 2.1 Objetivo del sistema
Que los coleccionistas puedan **comprar cartas con confianza**, encontrándolas rápido por nombre, colección, rareza o categoría, y que el administrador controle productos, stock, pedidos y ventas desde un único panel.

**Problema que resuelve:** quienes coleccionan suelen comprar con desconfianza (no saben si la carta es auténtica) y les cuesta buscar por colección o rareza. PokeCard ofrece un catálogo seleccionado, filtros específicos y el stock y los pedidos guardados en una base de datos.

### 2.2 Stakeholders

| Stakeholder | Interés / rol |
|---|---|
| Clientes (coleccionistas y jugadores) | Buscar cartas, comprar de forma segura y ver sus pedidos. |
| Visitantes | Navegar el catálogo sin cuenta, armar el carrito y registrarse. |
| Administrador de la tienda | Gestionar productos, stock, categorías, proveedores y pedidos; ver métricas. |
| Proveedores (ej. Distribuidora Kanto, Johto Import) | Abastecen los productos; quedan registrados en la tabla `proveedor`. |
| Equipo de desarrollo | Construir, probar y mantener el sistema. |
| Docentes / evaluadores | Evaluar el cumplimiento de los requisitos de cada etapa. |

### 2.3 Funciones principales
Ver el detalle completo en [`Requerimientos.md`](Requerimientos.md).

| Función | Requerimientos |
|---|---|
| Registro, login, logout y control de acceso por rol | RF-01 a RF-04 |
| Catálogo con búsqueda, filtros y orden | RF-05, RF-06 |
| Detalle de producto | RF-07 |
| CRUD de productos (con archivado) | RF-08 a RF-11 |
| Categorías y proveedores | RF-12 |
| Dashboard administrativo | RF-13 |
| Carrito y compra con pago simulado | RF-14 |
| Mis pedidos y gestión de pedidos del admin | RF-15 |

### 2.4 Restricciones generales
- Tecnologías del proyecto: **Node.js 22+, Express 5, PostgreSQL (Supabase), React 19 y Vite 6**.
- El pago es **simulado**: no se conecta a ningún banco ni se guarda el número de tarjeta.
- El frontend y el backend se comunican solo mediante la API REST (JSON) bajo la ruta `/api`.
- Los secretos se configuran por variables de entorno (`.env`) y nunca se suben al repositorio (`.gitignore`).
- El proyecto es académico y tiene entregas por etapas, con plazos definidos por la materia.

---

## 3. Arquitectura del sistema

### 3.1 Estilo arquitectónico
- **Cliente-servidor en tres capas:** presentación (SPA en React), lógica (API REST en Express) y datos (PostgreSQL en Supabase).
- **API REST sin estado en el servidor:** cada petición trae la cookie de sesión con un **JWT** firmado; el servidor no guarda sesiones en memoria.
- **Backend organizado por responsabilidad:** arranque y seguridad general (`server.js`), conexión (`db.js`), autenticación (`auth.js`) y rutas (`routes/`).
- **Frontend basado en componentes**, con estado global en Context API (`AuthContext`, `CarritoContext`) y ruteo con React Router.
- **Un solo origen en producción:** Express entrega también la página compilada (`frontend/dist`), así la página y la API comparten dominio.

### 3.2 Componentes principales

| Capa | Componente | Archivo | Responsabilidad |
|---|---|---|---|
| Frontend | Ruteo y pie de página | `frontend/src/App.jsx` | Define las páginas, protege `/checkout`, `/pedidos` y `/admin` y muestra el aviso de "agregado al carrito". |
| Frontend | Sesión | `frontend/src/AuthContext.jsx` | Login, registro, logout y consulta de la sesión al abrir la página (`/usuarios/yo`). |
| Frontend | Carrito | `frontend/src/CarritoContext.jsx` | Productos del carrito, guardados por usuario en `localStorage`; une el carrito de invitado al ingresar. |
| Frontend | Cliente HTTP | `frontend/src/api.js` | Llama a `/api`, muestra los errores y avisa si la sesión venció. |
| Frontend | Ruta protegida | `frontend/src/components/RutaProtegida.jsx` | Redirige si no hay sesión o si el usuario no es admin. |
| Frontend | Validaciones | `frontend/src/validaciones.js` | Luhn, vencimiento, registro y fuerza de la contraseña. |
| Frontend | Páginas | `frontend/src/pages/` | Home, Login, Registro, Catálogo, Detalle, Carrito, Checkout, Mis pedidos y Admin (Dashboard, Productos, Pedidos, Categorías y proveedores). |
| Backend | Servidor | `backend/src/server.js` | Controla las variables de entorno, aplica helmet y límites de peticiones, monta las rutas, entrega la página y maneja todos los errores. |
| Backend | Conexión | `backend/src/db.js` | Pool de conexiones a Supabase (SSL) y ayuda para transacciones. |
| Backend | Autenticación | `backend/src/auth.js` | Crea y borra la cookie de sesión, `verificarToken` (401) y `soloAdmin` (403). |
| Backend | Usuarios | `backend/src/routes/usuarios.js` | Registro con bcrypt, login con bloqueo por intentos, logout y usuario actual. |
| Backend | Productos | `backend/src/routes/productos.js` | Listado con búsqueda y filtros, detalle y CRUD con archivado. |
| Backend | Catálogos | `backend/src/routes/catalogos.js` | CRUD de categorías y proveedores. |
| Backend | Pedidos | `backend/src/routes/pedidos.js` | Compra con pago simulado en una transacción, historial, detalle y cambio de estado. |
| Backend | Admin | `backend/src/routes/admin.js` | Métricas del dashboard y listado completo de productos. |
| Datos | Base de datos | `database/schema.sql` | Tablas, índices, restricciones, RLS y datos de ejemplo. |

### 3.3 Diagrama de despliegue

```mermaid
flowchart LR
  subgraph Cliente["Dispositivo del usuario"]
    B["Navegador web<br/>(Chrome, Firefox, Edge, Safari)"]
  end
  subgraph App["Servidor de aplicación (ej. Render)"]
    A["Node.js + Express<br/>/api (REST) + página compilada"]
  end
  subgraph Supabase["Supabase (nube)"]
    D[("PostgreSQL<br/>RLS activado")]
  end
  B -- "HTTPS: página + JSON<br/>cookie httpOnly con JWT" --> A
  A -- "pg (pool de 10 conexiones, SSL)<br/>Session pooler :5432" --> D
```

En desarrollo hay dos procesos en la misma máquina: Vite (`localhost:5173`) entrega la página y reenvía `/api` al backend (`localhost:3001`), que se conecta a Supabase por internet.

### 3.4 Escalabilidad y rendimiento
- **Sesión en un JWT firmado:** se pueden levantar varias instancias del backend sin compartir memoria. El bloqueo de intentos de login también vive en la base.
- **Pool de conexiones** (`max: 10`) para reutilizar conexiones en lugar de abrir una por petición.
- **Índices** en `producto(categoria_id)`, `producto(activo)`, `pedido(usuario_id)`, `pedido(estado)` y `detalle_pedido`.
- **Filtros y búsqueda en la base** (`= ANY(...)`, `ILIKE`) y un tope de 200 resultados por consulta.
- **Consultas del dashboard en paralelo** (`Promise.all`).
- **Frontend compilado y minificado** con `vite build` (unos 100 KB comprimido).
- **Mejoras a futuro:** paginación del catálogo, caché de `/productos/filtros` y compresión HTTP.

---

## 4. Diseño de datos

### 4.1 Diagrama Entidad-Relación
Diagramas: [`DER_PokeCard.png`](DER_PokeCard.png) (conceptual, con los atributos principales) y [`Diagrama_BD_PokeCard.png`](Diagrama_BD_PokeCard.png) (modelo físico en PostgreSQL).

```mermaid
erDiagram
  USUARIO ||--o{ PEDIDO : realiza
  PEDIDO ||--|{ DETALLE_PEDIDO : contiene
  PRODUCTO ||--o{ DETALLE_PEDIDO : "aparece en"
  CATEGORIA ||--o{ PRODUCTO : clasifica
  PROVEEDOR |o--o{ PRODUCTO : provee

  USUARIO { int id PK
            varchar nombre
            varchar email UK
            varchar contrasena_hash
            rol_usuario rol
            int intentos_fallidos
            timestamptz bloqueado_hasta
            timestamptz creado_en }
  CATEGORIA { int id PK
              varchar nombre UK }
  PROVEEDOR { int id PK
              varchar nombre UK
              varchar contacto }
  PRODUCTO { int id PK
             varchar nombre
             text descripcion
             numeric precio
             int stock
             varchar coleccion
             varchar rareza
             varchar imagen
             boolean activo
             int categoria_id FK
             int proveedor_id FK
             timestamptz creado_en }
  PEDIDO { int id PK
           int usuario_id FK
           timestamptz fecha
           estado_pedido estado
           numeric total
           char tarjeta_ultimos4 }
  DETALLE_PEDIDO { int id PK
                   int pedido_id FK
                   int producto_id FK
                   int cantidad
                   numeric precio_unitario }
```

### 4.2 Descripción de entidades

| Entidad | Descripción | Atributos clave |
|---|---|---|
| `usuario` | Personas con cuenta en el sistema. | `email` único y en minúsculas, `contrasena_hash` (bcrypt), `rol` = `cliente` o `admin`, `intentos_fallidos` y `bloqueado_hasta` (freno contra fuerza bruta). |
| `categoria` | Tipo de producto: Cartas sueltas, Sobres, Mazos, Accesorios. | `nombre` único. |
| `proveedor` | Empresa que abastece los productos. | `nombre` único, `contacto`. |
| `producto` | Carta o artículo a la venta. | `precio`, `stock`, `coleccion`, `rareza`, `imagen` (URL https), `activo` (false = archivado), `categoria_id` (obligatoria), `proveedor_id` (opcional). |
| `pedido` | Compra realizada por un usuario. | `estado` = `pendiente`, `pagado`, `enviado` o `cancelado`; `total`; `tarjeta_ultimos4`. |
| `detalle_pedido` | Cada línea de un pedido. | `cantidad > 0` y `precio_unitario` (precio del momento de la compra). |

### 4.3 Reglas de integridad
- **Entidad:** todas las tablas tienen clave primaria `id` (`int generated always as identity`).
- **Unicidad:** `usuario.email`, `categoria.nombre` y `proveedor.nombre` son `UNIQUE`.
- **Dominio:** `precio >= 0`, `stock >= 0`, `cantidad > 0`, `total >= 0`, email en minúsculas e imagen que empiece con `https://` (`CHECK`); `rol` y `estado` son tipos `ENUM` de PostgreSQL.
- **Referencial:**
  - `producto.categoria_id → categoria.id` (obligatoria; no se puede borrar una categoría con productos).
  - `producto.proveedor_id → proveedor.id` con `ON DELETE SET NULL` (si se borra el proveedor, el producto queda sin proveedor).
  - `pedido.usuario_id → usuario.id`.
  - `detalle_pedido.pedido_id → pedido.id` con `ON DELETE CASCADE`.
  - `detalle_pedido.producto_id → producto.id`: un producto vendido no se borra; la API lo **archiva**.
- **Seguridad de la base:** RLS activado en las 6 tablas y permisos quitados a los roles `anon` y `authenticated` de Supabase. La API pública de Supabase no puede leer ni escribir nada; solo el backend, que se conecta con el usuario `postgres`.
- **Reglas de negocio en la API:** el rol de un usuario nuevo siempre es `cliente`; el precio y el stock de una compra se leen de la base y nunca del cliente; la compra se hace en una **transacción** con `SELECT ... FOR UPDATE` (bloqueando en orden de `id` para evitar bloqueos cruzados).

### 4.4 Migración y respaldo
- **Creación:** en Supabase, **SQL Editor → New query**, pegar `database/schema.sql` y ejecutar. Crea los tipos, las tablas, los índices, la seguridad y los datos de ejemplo.
- **Migraciones:** cada cambio de estructura se agrega como un script SQL nuevo y numerado (ej. `database/002_agregar_descuento.sql`), que se ejecuta en el SQL Editor y se versiona en Git. No se edita un script que ya se aplicó en producción.
- **Respaldo:** Supabase hace un respaldo diario automático en los planes pagos. Además (o en el plan gratuito) se puede hacer uno manual con la cadena de conexión:
  ```bash
  pg_dump "postgresql://postgres.TU_PROYECTO:TU_PASSWORD@aws-0-sa-east-1.pooler.supabase.com:5432/postgres" \
    --no-owner --schema=public > respaldo_pokecard_AAAA-MM-DD.sql
  ```
  Se recomienda conservar los últimos 7 y guardar una copia fuera del servidor.
- **Restauración:** en un proyecto vacío, `psql "<cadena de conexión>" < respaldo_pokecard_AAAA-MM-DD.sql`.

---

## 5. Comportamiento del sistema

### 5.1 Escenarios principales

| # | Actor | Escenario | Resultado |
|---|---|---|---|
| E1 | Visitante | Entra a Home, va al catálogo, busca o filtra por colección/rareza y abre un producto. | Ve el detalle con precio y disponibilidad. |
| E2 | Visitante | Se registra con nombre, email y contraseña. | Se crea la cuenta como **cliente** y entra automáticamente. |
| E3 | Visitante | Agrega productos al carrito y después inicia sesión. | Lo que agregó como invitado se suma a su carrito. |
| E4 | Cliente | Va a checkout y paga con una tarjeta de prueba. | Se crea un pedido `pagado`, se descuenta el stock y se muestra el comprobante `PAY-000001`. |
| E5 | Cliente | Paga con una tarjeta terminada en `0002`. | La API responde 402, no se crea el pedido y el stock no cambia. |
| E6 | Cliente | Entra a "Mis pedidos" y abre un pedido. | Ve fecha, estado, total, productos y los últimos 4 dígitos de la tarjeta. |
| E7 | Admin | Inicia sesión. | Se lo redirige a `/admin` (dashboard con métricas). |
| E8 | Admin | Crea, edita o elimina un producto. | El catálogo se actualiza; si el producto ya se vendió, se archiva. |
| E9 | Cliente | Intenta entrar a `/admin`. | Se lo redirige al inicio; la API respondería 403. |
| E10 | Admin | En **Pedidos** ve el detalle de un pedido y lo marca como enviado o lo cancela. | Cambia el estado; si lo cancela, el stock vuelve al inventario. |
| E11 | Admin | En **Categorías y proveedores** agrega, edita o borra un registro. | Se guarda; una categoría con productos no se puede borrar (409). |
| E12 | Cualquiera | Escribe 5 veces mal la contraseña de una cuenta. | La cuenta queda bloqueada 15 minutos (429). |

### 5.2 Inicio de sesión

```mermaid
sequenceDiagram
  actor U as Usuario
  participant F as Frontend (Login.jsx)
  participant A as API /api/usuarios/login
  participant D as Supabase (PostgreSQL)
  U->>F: Email y contraseña
  F->>A: POST {email, password}
  A->>D: SELECT usuario WHERE email = $1
  D-->>A: Usuario (o vacío)
  alt Cuenta bloqueada
    A-->>F: 429 "Cuenta bloqueada…"
  else
    A->>A: bcrypt.compare(password, hash)
    alt Credenciales correctas
      A->>D: Reinicia intentos_fallidos
      A-->>F: 200 {usuario} + Set-Cookie pc_sesion (httpOnly, 2 h)
      F-->>U: Redirige a /admin (admin) o a la página anterior
    else Incorrectas
      A->>D: Suma un intento (al 5.º bloquea 15 min)
      A-->>F: 401 "Email o contraseña incorrectos"
      F-->>U: Muestra el error
    end
  end
```

- Mismo mensaje (y mismo tiempo de respuesta) si falla el email o la contraseña: no revela qué cuentas existen.
- El token solo guarda el `id` del usuario y vence a las **2 horas**. En cada petición el backend vuelve a leer el usuario y su rol de la base.
- Al abrir la página, el frontend llama a `GET /api/usuarios/yo` para saber si la sesión sigue abierta.
- El **logout** le pide al servidor que borre la cookie.

### 5.3 Validaciones

| Dónde | Campo | Regla |
|---|---|---|
| Registro | nombre | De 2 a 100 caracteres. |
| Registro | email | Formato válido, hasta 150 caracteres, no repetido (409). Se guarda en minúsculas. |
| Registro | contraseña | De 8 a 72 caracteres, con letras y números; en la interfaz, repetida igual y con indicador de fuerza. |
| Login | email, contraseña | Obligatorios (400); 5 intentos fallidos bloquean la cuenta 15 minutos (429); máximo 20 intentos por IP cada 15 minutos. |
| Producto | nombre | Obligatorio, hasta 120 caracteres. |
| Producto | precio / stock | Precio número ≥ 0; stock entero ≥ 0. |
| Producto | categoría / proveedor | La categoría es obligatoria; ambos deben existir. |
| Producto | imagen | Opcional; si se carga, debe ser una URL `https://`. |
| Catálogo | orden | Solo `precio_asc`, `precio_desc`, `nombre` o `nuevos` (lista permitida). |
| Catálogo | búsqueda | Hasta 60 caracteres; `%` y `_` se buscan como texto. |
| Pedido | ítems | Carrito no vacío (máx. 50 líneas); `producto_id` y `cantidad` enteros, cantidad de 1 a 99. |
| Pedido | tarjeta | Solo dígitos, de 13 a 19 y válido según el **algoritmo de Luhn**; titular de 3 a 60 caracteres; vencimiento `MM/AA` no vencido; CVC de 3 o 4 dígitos. Se valida en el frontend y en el backend. |
| Pedido | estado | Solo `pendiente → pagado / cancelado` y `pagado → enviado / cancelado` (409 si no corresponde). |
| Pedido | stock | Debe alcanzar para cada producto (409). Si el mismo producto viene repetido, se suman las cantidades. |

Las validaciones del frontend son para dar una buena experiencia; las del backend son las que valen, porque el navegador se puede saltear.

### 5.4 Manejo de errores
Todas las respuestas de error son JSON con la forma `{ "error": "mensaje claro" }`, generadas por un **manejador único** en `server.js`.

| Código | Cuándo |
|---|---|
| 400 | Datos inválidos o faltantes, o un JSON mal formado. |
| 401 | Sin sesión, sesión vencida o credenciales incorrectas. |
| 402 | Pago rechazado por el "banco" (simulación). |
| 403 | El usuario no es admin. |
| 404 | Producto, pedido o ruta inexistente (también si el pedido es de otra persona). |
| 409 | Email, categoría o proveedor repetidos, stock insuficiente, categoría con productos, cambio de estado no permitido. |
| 413 | La petición es demasiado grande (más de 50 KB). |
| 429 | Cuenta bloqueada o demasiadas peticiones desde la misma IP. |
| 500 | Error inesperado (se registra en la consola del servidor y al usuario no se le muestran detalles internos). |

- Los errores de PostgreSQL se traducen a mensajes claros (por ejemplo, un dato repetido da 409).
- En la compra y en la cancelación, ante cualquier error se hace **rollback**: nunca queda un pedido a medias.
- En el frontend, si la sesión vence en medio de una acción, se cierra la sesión en la interfaz y la ruta protegida lleva al login.
- Si faltan `DATABASE_URL` o `JWT_SECRET` (o es muy corto), el servidor no arranca y lo informa por consola.

---

## 6. Restricciones del diseño

### 6.1 Compatibilidad
- Navegadores: versiones actuales de **Chrome, Firefox, Edge y Safari** (RNF-12).
- Diseño **responsive** para celular, tablet y computadora (RNF-08).
- Servidor: **Node.js 22+** en Windows, macOS o Linux; base **PostgreSQL** en Supabase (RNF-11).

### 6.2 Rendimiento
- El catálogo responde en **menos de 1 segundo** con hasta 1.000 productos (RNF-09).
- Pool de 10 conexiones e índices en las columnas que se filtran.
- El frontend se compila y minifica para producción con `vite build`.

### 6.3 Seguridad
- Contraseñas con **bcrypt** (12 rondas); nunca se devuelve el hash (RNF-01).
- **JWT** firmado (HS256, 2 h) en **cookie httpOnly, SameSite=Strict y Secure** en producción (RNF-02). Protege contra robo de sesión por XSS y contra CSRF.
- Rutas de administración protegidas por rol, verificado contra la base en cada petición (RNF-03).
- Consultas **parametrizadas**, orden con lista permitida y búsqueda con comodines escapados (RNF-04).
- Login con mensaje y tiempo de respuesta iguales para email inexistente y contraseña incorrecta (RNF-05).
- Secretos en `.env`, fuera del repositorio; el servidor no arranca sin ellos (RNF-06).
- **Bloqueo de cuenta** tras 5 intentos fallidos, guardado en la base, y **límite de peticiones** por IP (RNF-14).
- De la tarjeta solo se guardan los **últimos 4 dígitos**; el formulario se borra después de pagar (RNF-15).
- **helmet:** Content-Security-Policy, `X-Frame-Options`, sin `X-Powered-By` (RNF-16).
- **RLS** en Supabase y sin permisos para la API pública (RNF-17).
- Precios y stock siempre desde la base; compras en transacción con bloqueo de filas (RNF-18).
- Un cliente solo puede ver sus propios pedidos; si pide uno ajeno, la API responde 404.
- Límite de 50 KB por petición y de 200 resultados por consulta.

### 6.4 Normativas aplicables
- **Ley 25.326 de Protección de Datos Personales (Argentina):** se piden solo los datos necesarios (nombre y email), las contraseñas se guardan encriptadas y el usuario puede pedir que se borren sus datos.
- **Ley 24.240 de Defensa del Consumidor** y normativa de comercio electrónico: mostrar precio final, información clara del producto y la posibilidad de arrepentirse de la compra ("botón de arrepentimiento").
- **Ley 11.723 de Propiedad Intelectual** y marcas: "Pokémon", sus personajes y la Pokébola son marcas de sus dueños. PokeCard es un revendedor: no usa los logotipos oficiales de la franquicia, pero su isotipo es una ilustración de Gengar con una carta. Para un uso comercial real, el isotipo tendría que reemplazarse por un personaje original o contar con licencia. Por eso el tríptico y el pie de página del sitio incluyen la leyenda de marcas.
- **PCI DSS** (referencia): al ser un pago simulado no se procesan tarjetas reales; si se integra un pago real, se debe usar una pasarela certificada (ej. Mercado Pago) y nunca guardar los datos de la tarjeta.
- **WCAG 2.1** (recomendación de accesibilidad): contraste suficiente, textos alternativos, formularios con etiquetas, foco visible al navegar con teclado y respeto de la opción "reducir movimiento" del sistema.

### 6.5 Limitaciones tecnológicas
- El pago es una **simulación**; no hay pasarela real.
- No hay recuperación de contraseña ni verificación de email.
- El carrito vive en el navegador: no se sincroniza entre dispositivos.
- Las imágenes de los productos se guardan como URL; no hay subida de archivos (se podría usar Supabase Storage).
- El plan gratuito de Supabase **pausa el proyecto** después de una semana sin uso; se reactiva desde el panel.
- El límite de peticiones por IP vive en la memoria de cada servidor (el bloqueo por cuenta, en cambio, está en la base).

---

## 7. Pruebas y validaciones

Por decisión del equipo, esta versión **no incluye archivos de tests automáticos**: las pruebas se hacen a mano siguiendo estas tablas, con la base de Supabase y los usuarios de prueba. Para pruebas de API se puede usar el navegador, la extensión *Thunder Client* de VS Code o `curl`.

### 7.1 Pruebas unitarias (de la API)
Cada caso se prueba enviando una petición y revisando el código y el mensaje de respuesta.

| # | Prueba | Petición | Resultado esperado |
|---|---|---|---|
| U1 | Registro guarda el hash | `POST /api/usuarios/registro` y mirar `usuario` en Supabase | `contrasena_hash` empieza con `$2b$12$`; `rol` = `cliente` aunque se mande `"rol":"admin"`. |
| U2 | Email repetido | Registrar dos veces el mismo email | 409. |
| U3 | Contraseña débil | Contraseña `abcdefgh` | 400 "debe tener letras y números". |
| U4 | Login correcto | Admin de prueba | 200 y encabezado `Set-Cookie: pc_sesion=…; HttpOnly; SameSite=Strict`. |
| U5 | Login incorrecto | Contraseña errónea | 401 "Email o contraseña incorrectos". |
| U6 | Bloqueo | 6 logins fallidos seguidos | Los 5 primeros 401, el 6.º 429; con la contraseña correcta también 429 hasta que pasen 15 min. |
| U7 | Sin sesión | `GET /api/pedidos/mios` sin cookie | 401. |
| U8 | Cliente sin permiso | Cliente → `POST /api/productos` | 403. |
| U9 | Orden inválido | `GET /api/productos?orden=DROP TABLE` | 200 con el orden por defecto (no se ejecuta nada). |
| U10 | Precio negativo | Admin → producto con `precio: -1` | 400. |
| U11 | Imagen insegura | Admin → `imagen: "http://…"` | 400. |
| U12 | Tarjeta inválida | `numero: 1234 5678 9012 3456` | 400 (Luhn). |
| U13 | Tarjeta vencida | `vencimiento: 01/20` | 400. |
| U14 | Pedido ajeno | Cliente B → `GET /api/pedidos/<id de A>` | 404. |
| U15 | JSON mal formado | Cuerpo `{malo` | 400. |
| U16 | Encabezados | `curl -I http://localhost:3001/api` | Aparecen `Content-Security-Policy` y `X-Frame-Options`; no aparece `X-Powered-By`. |
| U17 | API pública de Supabase cerrada | Con la *anon key*: `GET https://<proyecto>.supabase.co/rest/v1/usuario` | Lista vacía o error de permisos: no se ve ningún usuario. |

### 7.2 Pruebas de integración

| # | Prueba | Pasos | Resultado esperado |
|---|---|---|---|
| I1 | Base y datos | Ejecutar `schema.sql` en Supabase | 6 tablas, 4 categorías, 2 proveedores, 9 productos y 2 usuarios. |
| I2 | Conexión | `npm run dev` en `backend/` y abrir `/api/productos` | Lista de 9 productos en JSON. |
| I3 | Compra completa | Login como cliente y comprar con `4111 1111 1111 1111` | 201; aparece en `pedido` y `detalle_pedido`; baja el stock. |
| I4 | Concurrencia de stock | Dos compras al mismo tiempo de un producto con stock 1 | Una da 201 y la otra 409; el stock queda en 0. |
| I5 | Archivado | Eliminar un producto que ya se vendió | Queda con `activo = false`, desaparece de la tienda y sigue en los pedidos. |
| I6 | Cancelación | Cancelar un pedido pagado | El pedido queda cancelado y el stock vuelve a sumar. |
| I7 | Cambio de rol | En Supabase cambiar el rol del admin a `cliente` y recargar el panel | Pierde el acceso en la siguiente petición (403). |
| I8 | Front + API | Comprar desde la interfaz | El pedido aparece en "Mis pedidos" y en el dashboard. |

### 7.3 Pruebas de funcionalidades web

| # | Funcionalidad | Pasos | Resultado esperado |
|---|---|---|---|
| W1 | Registro | Completar el formulario con datos válidos | Entra logueado como cliente. |
| W2 | Login incorrecto | Contraseña errónea | Mensaje "Email o contraseña incorrectos". |
| W3 | Filtros | Filtrar por rareza "Rara Holo" y ordenar por precio | Solo productos holo, ordenados. |
| W4 | Búsqueda | Escribir "fuego" en el buscador | Aparece "Carta Holo Fuego". |
| W5 | Carrito | Agregar 2 productos y recargar la página | El carrito se mantiene. |
| W6 | Carrito de invitado | Agregar sin sesión y después ingresar | Los productos siguen en el carrito. |
| W7 | Sesión al recargar | Ingresar y recargar la página | Sigue logueado (no se guarda nada en `localStorage` salvo el carrito). |
| W8 | Checkout sin sesión | Ir a `/checkout` sin login | Redirige a `/login` y, al ingresar, vuelve al checkout. |
| W9 | Pago rechazado | Tarjeta `4000 0000 0000 0002` | Mensaje de rechazo; no se crea pedido. |
| W10 | Acceso admin | Cliente entra a `/admin` | Redirige al inicio. |
| W11 | CRUD | Admin crea, edita, archiva y elimina productos | Los cambios se ven en el catálogo. |
| W12 | Categorías | Admin agrega y borra una categoría vacía; intenta borrar una con productos | La vacía se borra; la otra muestra el error. |
| W13 | Gestión de pedidos | Admin → **Pedidos** → **Ver**, **Marcar enviado** o **Cancelar** | Cambia el estado; al cancelar, el stock vuelve. |
| W14 | Logout | Cerrar sesión | Desaparece el menú de usuario y `/pedidos` redirige al login. |

### 7.4 Pruebas del frontend

| # | Aspecto | Cómo se prueba | Esperado |
|---|---|---|---|
| F1 | Responsive | DevTools en 375 px, 768 px y 1280 px | Sin scroll horizontal; aparece el menú ☰ y el botón "Filtros" en celular. |
| F2 | Identidad visual | Comparar con la paleta de [10.6](#106-círculo-cromático-y-paleta-institucional) | Colores y tipografía **Sora** correctos en todas las páginas. |
| F3 | Navegación | Recorrer todos los links del navbar y del pie | Ningún link roto; una ruta inexistente muestra "Página no encontrada". |
| F4 | Formularios | Enviar campos vacíos o inválidos | Se muestran errores claros junto al campo. |
| F5 | Tarjeta animada | Escribir datos en el checkout | La tarjeta de `crd-ui` se actualiza y se da vuelta en el CVC. |
| F6 | Compatibilidad | Probar en Chrome, Firefox, Edge y Safari | Mismo comportamiento. |
| F7 | Accesibilidad | Lighthouse (Accesibilidad) y navegar solo con Tab | Puntaje de 90 o más; el foco se ve en todos los botones. |
| F8 | Rendimiento | Lighthouse (Rendimiento) sobre `npm run build` servido por el backend | Puntaje de 80 o más. |
| F9 | Consola limpia | Abrir DevTools → Consola y recorrer el sitio | Sin errores rojos. |

### 7.5 Criterios de aceptación
- `npm run build` del frontend compila sin errores y el backend arranca conectado a Supabase.
- Todos los RF de `Requerimientos.md` se pueden demostrar en la interfaz.
- Ninguna contraseña se ve en texto plano en la base ni en las respuestas de la API.
- La cookie de sesión es httpOnly: `document.cookie` en la consola del navegador no la muestra.
- Un cliente no puede acceder a ninguna función de admin (ni por la interfaz ni por la API).
- Una compra aprobada crea el pedido y descuenta el stock; una rechazada, con tarjeta inválida o vencida, no cambia nada.
- Cancelar un pedido devuelve el stock.
- La interfaz respeta la identidad visual y funciona en celular.
- Las pruebas U1–U17, I1–I8, W1–W14 y F1–F9 dan el resultado esperado.

---

## 8. Despliegue y operación

### 8.1 Entorno de desarrollo

| Herramienta | Versión |
|---|---|
| Node.js | 22 o superior |
| Base de datos | Proyecto de Supabase (plan gratuito) |
| Editor | Visual Studio Code |
| Control de versiones | Git + GitHub |
| Frontend | Vite 6 (`npm run dev` → `http://localhost:5173`, reenvía `/api` al backend) |
| Backend | `node --watch` (`npm run dev` → `http://localhost:3001`) |

Los pasos de instalación y conexión a Supabase están en el [`README.md`](../README.md). Variables del backend (`backend/.env`): `DATABASE_URL`, `JWT_SECRET`, `PORT`, `NODE_ENV` y `DB_SSL` (solo para una base local sin SSL). El frontend no necesita variables.

### 8.2 Entorno de producción
Propuesta:
- **Base de datos:** el mismo proyecto de Supabase (o uno separado para producción), con una contraseña fuerte y los usuarios de prueba borrados o con otra contraseña.
- **Aplicación:** un único servicio Node.js (ej. Render o Railway) que compila el frontend y lo entrega junto con la API.
  - Build: `cd frontend && npm install && npm run build && cd ../backend && npm install`
  - Start: `cd backend && npm start`
  - Variables: `DATABASE_URL` (Session pooler), `JWT_SECRET` (largo y aleatorio) y `NODE_ENV=production` (activa la cookie `Secure` y `trust proxy`).
- **HTTPS** obligatorio (lo dan Render y Railway).

### 8.3 Publicación del sistema
1. Hacer merge de los cambios a `main` mediante un Pull Request revisado.
2. Ejecutar las pruebas manuales principales (W1–W14) en desarrollo.
3. Hacer un respaldo y aplicar en Supabase los scripts SQL nuevos, si los hay.
4. El hosting detecta el cambio en `main`, compila y publica.
5. Prueba rápida en producción: login, catálogo y una compra con la tarjeta de prueba.
6. Etiquetar la versión en Git (ej. `v2.0.0`).

### 8.4 Monitoreo
- `GET /api` devuelve `{ "api": "PokeCard", "estado": "ok" }` y sirve como **chequeo de salud** (ej. con UptimeRobot cada 5 minutos, que además evita que el servicio gratuito se duerma).
- Logs del servidor (`console.error`) desde el panel del hosting.
- En Supabase: **Reports** (uso de la base y conexiones) y **Logs** (consultas con error).
- Dashboard de admin: ventas de los últimos 7 días, pedidos por enviar y **productos con stock bajo** (5 unidades o menos).

### 8.5 Mantenimiento
- **Correctivo:** los errores se cargan como *issues* en GitHub y se arreglan en una rama propia con su PR.
- **Preventivo:** actualizar dependencias (`npm outdated`, `npm audit`), revisar los avisos del **Security Advisor** de Supabase y verificar los respaldos.
- **Evolutivo:** próximas funciones:
  - aviso por email cuando cambia el estado de un pedido;
  - recuperación de contraseña;
  - subida de imágenes con Supabase Storage;
  - paginación del catálogo;
  - pasarela de pago real (Mercado Pago).
- Toda mejora actualiza esta documentación, `Requerimientos.md` y el plan de pruebas.

---

## 9. Ciclo de vida del software

Se usa un modelo **iterativo e incremental por etapas**: en cada entrega se analiza, diseña, desarrolla y prueba una parte del sistema.

| Etapa | Contenido |
|---|---|
| Primera etapa | Identidad, mockups, base de datos, login con roles, CRUD de productos y dashboard. |
| Segunda etapa | Carrito, checkout y pago simulado, mis pedidos, gestión de pedidos del admin. |
| Tercera etapa (v2) | Migración a Supabase, refuerzo de seguridad, pantalla de categorías y proveedores, búsqueda, archivado de productos y rediseño de la interfaz. |
| Próximas | Recuperación de contraseña, imágenes en Supabase Storage y publicación. |

### 9.1 Análisis de requisitos
- **Relevamiento:** se analizó cómo compran los coleccionistas y sus problemas (desconfianza sobre la autenticidad y dificultad para buscar por colección o rareza).
- **Usuarios identificados:** visitante, cliente y admin (ver [2.2](#22-stakeholders)).
- **Resultado:** 15 requerimientos funcionales y 18 no funcionales, con su estado, en [`Requerimientos.md`](Requerimientos.md).
- **Validación:** los requerimientos se revisan con el docente al inicio de cada etapa.

### 9.2 Diseño
- **Interfaz:** mockups de Home, Login, Registro, Catálogo, Detalle y Carrito en [`mockups/`](mockups/), siguiendo la identidad visual.
- **Datos:** DER y diagrama de base de datos (ver [sección 4](#4-diseño-de-datos)) y `schema.sql`.
- **Arquitectura:** tres capas y API REST con sesión en cookie (ver [sección 3](#3-arquitectura-del-sistema)).
- **API:** tabla de endpoints con su nivel de acceso en el [`README.md`](../README.md#endpoints).
- **Seguridad:** decisiones de bcrypt, JWT en cookie, roles, RLS y consultas parametrizadas definidas desde el diseño (ver [6.3](#63-seguridad)).

### 9.3 Desarrollo
- **Organización del código:** el backend separa arranque, conexión, autenticación y una ruta por recurso; el frontend, una página por archivo, componentes reutilizables y dos contextos (sesión y carrito).
- **Convenciones:** nombres en español, comentarios cortos que explican el *porqué*, un manejador único de errores y validaciones en los dos lados.
- **Control de versiones:** una rama por funcionalidad (`feature/…`), commits descriptivos y Pull Request revisado por otro integrante antes de unir a `main`.
- **Dependencias mínimas:** el backend usa 6 paquetes (express, pg, bcryptjs, jsonwebtoken, helmet, express-rate-limit) y el frontend 4 (react, react-dom, react-router-dom, crd-ui).

### 9.4 Pruebas
- Al terminar cada funcionalidad se ejecutan las pruebas de la [sección 7](#7-pruebas-y-validaciones) que la cubren.
- Antes de cada entrega se recorre el plan completo y se registran los resultados (fecha, quién probó, resultado y observaciones).
- Los errores encontrados se cargan como *issues* y vuelven al paso de desarrollo.

### 9.5 Implementación
- Se publica con el procedimiento de [8.3](#83-publicación-del-sistema): un único servicio con la página y la API, conectado a Supabase.
- Se cargan los productos reales desde el panel admin y se borran o cambian los usuarios de prueba.
- Se capacita al administrador con el manual de usuario ([10.11](#1011-manual-de-identidad--manual-de-usuario)).

### 9.6 Mantenimiento
- Se sigue el plan de [8.5](#85-mantenimiento) (correctivo, preventivo y evolutivo).
- Cada cambio en producción queda registrado como una versión etiquetada en Git, así se puede volver a una versión anterior si algo falla.

---

## 10. Sector de Marketing e Identidad Institucional

### 10.1 Identidad general de la empresa

| | |
|---|---|
| **Nombre** | PokeCard |
| **Slogan** | *"Cartas únicas, compras seguras."* |
| **Rubro** | Venta online de cartas coleccionables Pokémon, sobres, mazos y accesorios. |
| **Público** | Coleccionistas y jugadores de la franquicia Pokémon, de 12 a 40 años. |
| **Diferencial** | Productos seleccionados y autenticidad verificada. |
| **Misión** | Que cualquier coleccionista consiga la carta que busca con la tranquilidad de una compra segura. |
| **Visión** | Ser la tienda de referencia en cartas Pokémon del país. |
| **Valores** | Confianza, transparencia, pasión por el coleccionismo y atención cercana. |
| **Personalidad de marca** | Misteriosa y divertida, inspirada en el "morado Gengar" (tipo Fantasma). |

### 10.2 Lugar físico de la empresa
PokeCard es principalmente una tienda **online**, con un local de 10 × 8 m para atención, retiro de pedidos y eventos de juego (ver el plano en [10.14](#1014-maquetado-físico--sweet-home-3d)).

| | |
|---|---|
| **Dirección** | Anacleto Rojas 60, Monte Grande (CP 1842), partido de Esteban Echeverría, provincia de Buenos Aires *(dirección ficticia, para el proyecto)* |
| **Horario del local** | Lunes a viernes de 10 a 19 h; sábados de 10 a 14 h |
| **Tienda online** | Todos los días, en `pokecard.com.ar` (dominio propuesto) |
| **Email** | `contacto@pokecard.com.ar` |
| **Redes sociales** | `@pokecard` (Instagram y TikTok) |

### 10.3 Triangulación de medios de transporte y ubicación
El local está en el centro de Monte Grande, dentro del triángulo que forman tres puntos de acceso. Así se llega en tren, en colectivo o en auto, y siempre a menos de 6 cuadras caminando.

![Triangulación de transporte](marketing/triangulacion.png)

| Vértice | Medio | Referencia | Distancia a pie |
|---|---|---|---|
| A | Tren | **Estación Monte Grande**, línea **Roca** (ramal Constitución – Ezeiza) | 283 m (≈ 4 min) |
| B | Colectivo | Parada **Plaza Mitre**: líneas **51, 394 y 501** | 440 m (≈ 6 min) |
| C | Avenida principal | **Av. Dardo Rocha** (acceso en auto y estacionamiento) | 208 m (≈ 3 min) |

- Las ubicaciones y las distancias salen de OpenStreetMap. Las líneas de colectivo son las que figuran como habituales en la zona, así que conviene confirmarlas en una app de transporte.
- El mapa se genera desde [`marketing/triangulacion.html`](marketing/triangulacion.html) (Leaflet + OpenStreetMap).

### 10.4 Isotipo
El **isotipo** es el símbolo de la marca sin texto: la ilustración circular de [`frontend/public/logo.png`](../frontend/public/logo.png), un Gengar sonriente que sostiene una carta sobre fondo morado oscuro. Se usa como favicon y en el navbar (40 × 40 px, recortado en círculo).
- Funciona solo, en tamaños chicos (favicon, perfil de redes sociales, sticker).
- Tamaño mínimo recomendado: 24 px en pantalla y 1 cm impreso.
- Ver la nota de propiedad intelectual en [6.4](#64-normativas-aplicables).

### 10.5 Logotipo
El **logotipo** es el nombre **"PokeCard"** escrito en tipografía **Sora Bold (700)**. Así aparece en el navbar (`.marca`) y en el panel de login.
- **Isologotipo:** isotipo a la izquierda y la palabra "PokeCard" a la derecha, separados por un espacio igual a la mitad del alto del isotipo.
- Versiones: blanco sobre morado oscuro (principal) y morado oscuro sobre blanco (fondos claros).
- **No se debe:** deformar, rotar, cambiar los colores, agregar sombras ni ponerlo sobre fondos que no tengan contraste (ejemplos en [10.9](#109-diversas-aplicaciones-del-logo)).

### 10.6 Círculo cromático y paleta institucional

![Círculo cromático y paleta institucional](marketing/paleta_circulo_cromatico.svg)

La paleta parte del **morado** (color principal, "morado Gengar", tono de ~262°) y lo combina con el **rojo** (~353°) para llamar la atención en botones de compra y precios. En el círculo cromático quedan a unos **90° de distancia**: no son complementarios (estarían a 180°), sino una combinación en escuadra que contrasta sin chocar. El morado oscuro y el negro dan profundidad, el lavanda suaviza los textos secundarios y el blanco da legibilidad.

Paleta implementada en el sitio (`frontend/src/styles.css`). Además se usan colores de estado (verde `#3ECF6A` para "pagado" y "en stock", amarillo `#F2B84B` para "pendiente" y "últimas unidades") y un degradé holográfico (morado → rojo → amarillo) reservado para la insignia de cartas *Rara Holo* y el aro del logo en la portada.

| Color | Código | Variable CSS | Uso |
|---|---|---|---|
| Morado oscuro | `#1A0F2E` | `--morado-oscuro` | Navbar, hero y fondos principales. |
| Morado | `#7B5CB0` | `--morado` | Botones secundarios, links y detalles. |
| Rojo | `#E22B3F` | `--rojo` | Botones de compra, precios y ofertas. |
| Negro | `#0A0A0A` | `--negro` | Fondo general. |
| Blanco | `#F5F2FA` | `--blanco` | Texto principal. |
| Lavanda | `#9B8FC0` | `--lavanda` | Texto secundario. |
| Tarjeta | `#1C1628` | `--tarjeta` | Fondo de tarjetas de producto. |
| Borde | `#3D2F5C` | `--borde` | Bordes y separadores. |

**Tipografía institucional:** **Sora** (Google Fonts), pesos 400 (texto), 600 (destacados) y 700 (títulos y logotipo).

> La propuesta de la primera etapa (`Primera_etapa_original.docx`) usaba tonos más claros de la misma familia (`#241539`, `#5B3E8C`, `#C8283A`, `#121212`, `#FFFFFF`, `#C9BFE0`). En el sitio se ajustaron para el modo oscuro y la paleta oficial es la de la tabla de arriba.

### 10.7 Productos

| Categoría | Ejemplos | Precio de referencia |
|---|---|---|
| Cartas sueltas | Cartas holográficas Base Set (Fuego, Agua, Planta, Eléctrica, Psíquica, Sombra) | $2.800 a $9.900 |
| Sobres | Sobre Booster sellado de 10 cartas | $3.200 |
| Mazos | Mazo inicial de 60 cartas listo para jugar | $15.000 |
| Accesorios | Fundas protectoras x50 | $2.500 |

Los productos se filtran por **colección** (ej. Base Set) y **rareza** (Común, Rara Holo, etc.). Los datos de ejemplo se cargan con `database/schema.sql`.

### 10.8 Merchandising

![Merchandising de PokeCard](marketing/merchandising/merchandising.png)

Productos promocionales con la identidad de PokeCard (para regalar con compras grandes o vender aparte):
- **Remera** negra con el isologotipo para el personal y los eventos.
- **Playmat** (alfombra de juego) en degradé morado con zonas para las cartas y el isologotipo.
- **Caja de mazo (deck box)** negra con el isotipo enmarcado en rojo.
- **Stickers** circulares del isotipo para cerrar los paquetes.
- **Fundas protectoras** en morado, morado oscuro y rojo con el isotipo.
- **Caja de envío** en morado oscuro con el isologotipo y el slogan.
- **Tarjeta de agradecimiento** en cada pedido, con un QR a "Mis pedidos" (ver [10.9](#109-diversas-aplicaciones-del-logo)).

Las láminas se generan desde [`marketing/identidad.html`](marketing/identidad.html), que usa la paleta y la tipografía institucionales.

### 10.9 Diversas aplicaciones del logo

![Aplicaciones del logo](marketing/aplicaciones/aplicaciones_logo.png)

| Aplicación | Versión del logo |
|---|---|
| Favicon del sitio | Isotipo |
| Navbar y login del sitio | Isologotipo blanco sobre morado oscuro |
| Redes sociales (foto de perfil) | Isotipo con borde rojo |
| Cartelería del local | Isologotipo grande sobre morado oscuro, con marco rojo |
| Tarjeta de agradecimiento | Isologotipo y QR sobre blanco |
| Bolsa y packaging | Isotipo, logotipo y slogan |
| Comprobante de pago | Isologotipo y número `PAY-xxxxxx` |
| Merchandising | Isotipo o isologotipo (ver [10.8](#108-merchandising)) |

La última fila de la lámina muestra los **usos prohibidos**: deformar, cambiar los colores, rotar, y agregar sombras o usar fondos sin contraste.

### 10.10 Estudio de identidad visual
- **Concepto:** el morado y el personaje tipo Fantasma hacen referencia al coleccionismo misterioso y nocturno; el rojo transmite energía y acción (comprar). El resultado es una marca juvenil pero confiable.
- **Público:** se eligió un estilo oscuro y moderno, cercano a la estética gamer, que conecta con jugadores y coleccionistas.
- **Tipografía:** Sora es geométrica, moderna y muy legible en pantalla; con un único tipo de letra en varios pesos se logra unidad.
- **Color:** paleta reducida de morados con un único acento rojo reservado para las acciones (ver [10.6](#106-círculo-cromático-y-paleta-institucional)).
- **Contraste:** el blanco `#F5F2FA` sobre el negro `#0A0A0A` y sobre el morado oscuro `#1A0F2E` supera la relación 4.5:1 que pide WCAG para texto normal.
- **Formas:** bordes redondeados (8 px en botones, 12 px en paneles, 18 px en el hero) que transmiten cercanía; el isotipo circular funciona bien como avatar, sticker y favicon.
- **Competencia:** las tiendas del rubro suelen tener diseños recargados o genéricos; PokeCard se diferencia con una paleta reducida y consistente.
- **Punto a mejorar:** el isotipo usa un personaje de la franquicia. Para una marca comercial propia conviene diseñar una mascota original con el mismo estilo (ver [6.4](#64-normativas-aplicables)).

### 10.11 Manual de identidad / manual de usuario

**Manual de identidad (resumen)**
1. Usar solo los colores de la [paleta institucional](#106-círculo-cromático-y-paleta-institucional).
2. Usar solo la tipografía Sora (400, 600 y 700).
3. Respetar el área de protección del logo: un margen igual al alto de la letra "P" alrededor del logotipo.
4. Respetar el tamaño mínimo del isotipo (24 px o 1 cm).
5. No deformar, rotar ni cambiar los colores del logo (ver los usos prohibidos en [10.9](#109-diversas-aplicaciones-del-logo)).
6. El rojo se reserva para las acciones principales (comprar, pagar, ofertas).

**Manual de usuario (resumen)**

| Quiero... | Cómo |
|---|---|
| Crear una cuenta | Hacer clic en **Registrate**, completar nombre, email y contraseña (6 caracteres o más). |
| Iniciar sesión | Ir a **Ingresar** y escribir el email y la contraseña. |
| Buscar una carta | Ir a **Catálogo**, usar el buscador o los filtros de categoría, colección y rareza. |
| Comprar | Abrir el producto, **Agregar al carrito**, ir al **Carrito** y luego a **Finalizar compra**; completar la tarjeta y confirmar. |
| Ver mis compras | Menú **Mis pedidos**. |
| (Admin) Ver métricas | Iniciar sesión como admin y entrar a **Panel admin**. |
| (Admin) Cargar un producto | **Panel admin → Productos → + Nuevo producto**, completar los datos y guardar. |
| (Admin) Gestionar pedidos | **Panel admin → Pedidos**: filtrar por estado, **Ver** el detalle, **Marcar enviado** o **Cancelar** (devuelve el stock). |

### 10.12 Tríptico informativo
Folleto A4 apaisado, plegado en tres cuerpos, con la paleta y la tipografía institucionales.

- **Para imprimir:** [`marketing/triptico.pdf`](marketing/triptico.pdf) (2 páginas: exterior e interior).
- **Fuente editable:** [`marketing/triptico.html`](marketing/triptico.html). Se abre en Chrome y se exporta con *Imprimir → Guardar como PDF*, en A4 horizontal y sin márgenes.

| Cara | Cuerpo izquierdo | Cuerpo central | Cuerpo derecho (tapa) |
|---|---|---|---|
| **Exterior** | Contacto: dirección, horarios y email. | QR a la tienda y plano del local con los QR de cada sector. | Isotipo, nombre, slogan y sello "Autenticidad verificada". |
| **Interior** | ¿Quiénes somos?: misión, visión y valores. | Productos con precios y filtros para coleccionistas. | ¿Cómo comprar? en 4 pasos y garantía de autenticidad. |

Si cambia algún dato, se edita el HTML y se vuelve a exportar el PDF.

### 10.13 Códigos QR de los sectores
Cada sector del local (y el tríptico) tiene un QR que lleva a la sección correspondiente del sitio. Están en [`marketing/qr/`](marketing/qr/), en SVG (para imprimir en cualquier tamaño) y PNG, en morado oscuro `#1A0F2E` sobre blanco, con corrección de errores alta.

| N.º | Sector | Destino | Archivo |
|---|---|---|---|
| 1 | Entrada | `https://pokecard.com.ar/` | `qr_1_entrada` |
| 2 | Exhibidor de cartas sueltas | `https://pokecard.com.ar/catalogo?categoria=1` | `qr_2_cartas_sueltas` |
| 3 | Exhibidor de sobres | `https://pokecard.com.ar/catalogo?categoria=2` | `qr_3_sobres` |
| 4 | Exhibidor de mazos | `https://pokecard.com.ar/catalogo?categoria=3` | `qr_4_mazos` |
| 5 | Accesorios | `https://pokecard.com.ar/catalogo?categoria=4` | `qr_5_accesorios` |
| 6 | Caja / atención | `https://pokecard.com.ar/pedidos` (Mis pedidos) | `qr_6_caja_mis_pedidos` |

<p>
<img src="marketing/qr/qr_1_entrada.svg" width="110" alt="QR entrada">
<img src="marketing/qr/qr_2_cartas_sueltas.svg" width="110" alt="QR cartas sueltas">
<img src="marketing/qr/qr_3_sobres.svg" width="110" alt="QR sobres">
<img src="marketing/qr/qr_4_mazos.svg" width="110" alt="QR mazos">
<img src="marketing/qr/qr_5_accesorios.svg" width="110" alt="QR accesorios">
<img src="marketing/qr/qr_6_caja_mis_pedidos.svg" width="110" alt="QR caja">
</p>

El catálogo ya lee el parámetro `?categoria=` y abre filtrado. `pokecard.com.ar` es el **dominio propuesto**: al momento de generar los QR no tenía registros DNS. Si el sitio se publica en otro dominio, los QR se regeneran con:

```bash
npx qrcode@1.5.4 -t svg -e H -d 1A0F2E -l FFFFFF -o qr_1_entrada.svg "https://<dominio>/"
```

### 10.14 Maquetado físico — Sweet Home 3D

![Plano del local](marketing/plano_local.svg)

Plano de referencia del local (10 × 8 m) para armar el modelo en **Sweet Home 3D**. Los números negros marcan dónde va el QR de cada sector ([10.13](#1013-códigos-qr-de-los-sectores)).

| Sector | Ubicación y medidas | Mobiliario sugerido (catálogo de Sweet Home 3D) |
|---|---|---|
| Entrada | Pared de abajo, puerta de 1 m al centro, vidrieras a los lados | Puerta, ventanas de vidriera, cartel con el isologotipo |
| Cartas sueltas | Pared izquierda, exhibidor de 2,4 m | Estantería / vitrina |
| Vitrina con llave | Centro arriba, 3,2 × 1 m | Vitrina de vidrio (cartas de alto valor) |
| Sobres | Pared izquierda, 2 m | Estantería |
| Mazos | Pared izquierda, 1,6 m | Estantería |
| Mesa de juego | Centro, 2,8 × 1,6 m, 6 sillas | Mesa y sillas |
| Accesorios | Pared derecha, 2,2 m | Estantería |
| Mostrador / caja | Abajo a la derecha, en L | Mostrador, caja registradora, computadora |
| Depósito | Arriba a la derecha, 3 × 3 m, con puerta | Estanterías metálicas, cajas |

**Modelo en Sweet Home 3D:** [`marketing/local_pokecard.sh3d`](marketing/local_pokecard.sh3d) se abre con Sweet Home 3D 7.6 o superior (*Archivo → Abrir*).

| Vista 2D (plano del programa) | Vista 3D aérea |
|---|---|
| ![Plano 2D en Sweet Home 3D](marketing/local_2d.png) | ![Vista 3D del local](marketing/local_3d.png) |

Contenido del modelo:
- **Paredes:** 6 (las exteriores en morado oscuro `#1A0F2E` y las del depósito en lavanda `#9B8FC0`).
- **Ambientes:** 2, el salón (71 m²) y el depósito (9 m²).
- **Muebles:** 30 del catálogo del programa, más 6 luces de techo:
  - aberturas: puerta de entrada, 2 vidrieras y puerta del depósito;
  - exhibidores, vitrina con llave, mesa de juego con 6 sillas;
  - mostrador rojo `#E22B3F` con la computadora de la caja;
  - estantería y cajas del depósito, y plantas.
- **Carteles:** 8, entre ellos los **QR 1 a 6** en el mismo lugar que el plano y el punto 10.13.

El modelo se generó con la librería de Sweet Home 3D a partir de [`marketing/sweethome3d/GenerarLocal.java`](marketing/sweethome3d/GenerarLocal.java), así que se puede regenerar o editar a mano en el programa. Para cambiar algo (un mueble, un color) alcanza con abrir el `.sh3d`, modificarlo y guardarlo.

### 10.15 Integración del sector
La identidad institucional no es una parte aparte: está aplicada en el sistema.
- La **paleta** y la **tipografía** de [10.6](#106-círculo-cromático-y-paleta-institucional) son las variables CSS de `frontend/src/styles.css` y la fuente Sora cargada en `frontend/index.html`. El tríptico y las láminas usan las mismas variables.
- El **isotipo** es el favicon, el logo del navbar y del pie de página, y la imagen de reemplazo de los productos que todavía no tienen foto (`frontend/public/logo.png`).
- El **slogan** aparece en el título de la página, en el panel de login y registro, y en el tríptico.
- Los **productos** de [10.7](#107-productos) son los del catálogo (datos de ejemplo de `database/schema.sql`) y los mismos del tríptico.
- Los **QR** de [10.13](#1013-códigos-qr-de-los-sectores) llevan a las rutas reales del sitio (`/catalogo?categoria=`, `/pedidos`), y el plano del local indica dónde va cada uno.
- El **comprobante** `PAY-xxxxxx` que genera la API es el mismo de la lámina de aplicaciones del logo.
- El **tríptico**, el **merchandising** y el **local en Sweet Home 3D** (`local_pokecard.sh3d`) usan la misma paleta, para que la experiencia sea igual en el local y en la web.
- La prueba **F2** ([7.4](#74-pruebas-del-frontend)) verifica que el sitio respete esta identidad.
