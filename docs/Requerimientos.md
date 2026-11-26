# PokeCard — Requerimientos

## Requerimientos funcionales

| Código | Requerimiento | Rol | Estado |
|---|---|---|---|
| RF-01 | El sistema permite registrar una cuenta con nombre, email y contraseña (con confirmación). Toda cuenta nueva se crea con rol **cliente** y queda con la sesión iniciada. | Visitante | Hecho |
| RF-02 | El sistema permite iniciar sesión con email y contraseña. Al volver a abrir la página, la sesión se mantiene mientras no venza. | Visitante | Hecho |
| RF-03 | El sistema controla el acceso según el rol (**cliente** o **admin**): las rutas y pantallas de administración solo están disponibles para admin. | Todos | Hecho |
| RF-04 | El sistema permite cerrar sesión. | Cliente / Admin | Hecho |
| RF-05 | El sistema muestra el catálogo de productos con imagen, nombre, rareza, colección, precio y aviso de últimas unidades. | Todos | Hecho |
| RF-06 | El sistema permite buscar por nombre, filtrar el catálogo por categoría, colección y rareza, y ordenarlo por precio, nombre o más nuevos. | Todos | Hecho |
| RF-07 | El sistema muestra el detalle de un producto (descripción, categoría, colección, rareza y disponibilidad) y permite elegir la cantidad a agregar. | Todos | Hecho |
| RF-08 | El admin puede **crear** productos. | Admin | Hecho |
| RF-09 | El admin puede **consultar** y buscar en el listado de productos, incluidos los archivados. | Admin | Hecho |
| RF-10 | El admin puede **editar** productos (precio, stock, datos y visibilidad en la tienda). | Admin | Hecho |
| RF-11 | El admin puede **eliminar** productos. Si el producto ya tiene ventas, se **archiva** (deja de mostrarse) para no perder el historial de pedidos. | Admin | Hecho |
| RF-12 | El admin puede gestionar categorías y proveedores (alta, edición, baja y listado) desde una pantalla del panel. | Admin | Hecho |
| RF-13 | El panel administrativo (dashboard) muestra: ventas, pedidos (y cuántos falta enviar), clientes, productos y valor del inventario; ventas de los últimos 7 días; productos con stock bajo; productos por categoría y últimos pedidos. | Admin | Hecho |
| RF-14 | El cliente puede agregar productos al carrito, cambiar cantidades y finalizar la compra. Lo que se agrega sin sesión se suma a su carrito al ingresar. | Cliente | Hecho (pago simulado) |
| RF-15 | El cliente puede consultar sus pedidos con el detalle de cada uno; el admin puede ver todos los pedidos, filtrarlos, ver su detalle y gestionar su estado (pagado → enviado / cancelado). Al cancelar, se devuelve el stock. | Cliente / Admin | Hecho |

## Requerimientos no funcionales

| Código | Categoría | Requerimiento |
|---|---|---|
| RNF-01 | Seguridad | Las contraseñas se almacenan encriptadas con hash **bcrypt** (12 rondas de sal). Deben tener entre 8 y 72 caracteres, con letras y números. Nunca se guardan ni se devuelven en texto plano. |
| RNF-02 | Seguridad | La sesión usa un token **JWT** firmado (HS256) que vence a las 2 horas y viaja en una **cookie httpOnly, SameSite=Strict** (y Secure en producción): el JavaScript de la página no puede leerlo. |
| RNF-03 | Seguridad | Toda ruta de escritura sobre productos, categorías y proveedores, la gestión de pedidos y el dashboard exigen sesión válida y rol admin (respuestas 401 / 403). El rol se vuelve a leer de la base en cada petición. |
| RNF-04 | Seguridad | Las consultas SQL son parametrizadas para evitar inyección SQL; el ordenamiento se valida contra una lista permitida y los comodines de la búsqueda se escapan. |
| RNF-05 | Seguridad | El mensaje de error del login es el mismo si falla el email o la contraseña, y tarda lo mismo en los dos casos, para no revelar qué cuentas existen. |
| RNF-06 | Seguridad | Los secretos (clave JWT, conexión a la base) se guardan en variables de entorno (`.env`), fuera del código. El servidor no arranca si faltan o si la clave JWT es corta. |
| RNF-07 | Integridad de datos | La base de datos valida claves foráneas, email único (en minúsculas), precio, stock y cantidades no negativos, y que las imágenes sean URL `https://`. |
| RNF-08 | Usabilidad | La interfaz es adaptable a celular (menú desplegable y filtros plegables) y respeta la identidad visual de PokeCard (paleta definida y tipografía Sora). |
| RNF-09 | Rendimiento | Las consultas del catálogo responden en menos de 1 segundo con hasta 1.000 productos, usando índices en la base y un pool de conexiones. |
| RNF-10 | Mantenibilidad | El backend está separado en arranque, conexión, autenticación y rutas; el frontend en páginas, componentes y contextos. Un manejador único de errores evita repetir código. |
| RNF-11 | Portabilidad | Funciona sobre Node.js 22 o superior y PostgreSQL (Supabase), en cualquier sistema operativo. |
| RNF-12 | Compatibilidad | Compatible con las versiones actuales de Chrome, Firefox, Edge y Safari. |
| RNF-13 | Confiabilidad | La API responde con códigos HTTP coherentes (400, 401, 402, 403, 404, 409, 413, 429, 500) y mensajes de error claros, también ante un JSON mal formado. |
| RNF-14 | Seguridad | Después de 5 contraseñas incorrectas la cuenta se bloquea 15 minutos (queda registrado en la base, así que no se pierde al reiniciar el servidor). Además, cada IP tiene un máximo de 20 intentos de login o registro cada 15 minutos. |
| RNF-15 | Seguridad | Los datos de la tarjeta se validan en el frontend y en el backend (Luhn, vencimiento y CVC); solo se guardan los últimos 4 dígitos. |
| RNF-16 | Seguridad | En producción la página y la API se sirven desde el mismo dominio; el servidor envía encabezados de seguridad (**helmet**: CSP, anti-clickjacking, sin `X-Powered-By`). |
| RNF-17 | Seguridad | En Supabase todas las tablas tienen **RLS activado** y sin permisos para los roles públicos: solo el backend puede leer y escribir. |
| RNF-18 | Integridad de datos | Las compras y las cancelaciones se hacen dentro de una **transacción** con bloqueo de filas, para que dos compras simultáneas no dejen stock negativo y nunca quede un pedido a medias. |
