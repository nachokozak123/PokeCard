# PokeCard — Requerimientos

## Requerimientos funcionales

| Código | Requerimiento | Rol | Estado |
|---|---|---|---|
| RF-01 | El sistema permite registrar una cuenta con nombre, email y contraseña. Toda cuenta nueva se crea con rol **cliente**. | Visitante | Hecho |
| RF-02 | El sistema permite iniciar sesión con email y contraseña y devuelve un token JWT. | Visitante | Hecho |
| RF-03 | El sistema controla el acceso según el rol (**cliente** o **admin**): las rutas y pantallas de administración solo están disponibles para admin. | Todos | Hecho |
| RF-04 | El sistema permite cerrar sesión. | Cliente / Admin | Hecho |
| RF-05 | El sistema muestra el catálogo de productos con imagen, nombre, rareza, colección y precio. | Todos | Hecho |
| RF-06 | El sistema permite filtrar el catálogo por categoría, colección y rareza, y ordenarlo por precio o nombre. | Todos | Hecho |
| RF-07 | El sistema muestra el detalle de un producto (descripción, categoría, colección, rareza y stock). | Todos | Hecho |
| RF-08 | El admin puede **crear** productos. | Admin | Hecho |
| RF-09 | El admin puede **consultar** el listado de productos. | Admin | Hecho |
| RF-10 | El admin puede **editar** productos (precio, stock, datos). | Admin | Hecho |
| RF-11 | El admin puede **eliminar** productos. Si el producto tiene pedidos asociados, el sistema lo impide e informa el motivo. | Admin | Hecho |
| RF-12 | El admin puede gestionar categorías y proveedores (alta, edición, baja y listado, vía API). | Admin | Hecho (API) |
| RF-13 | El panel administrativo (dashboard) muestra: total de productos, clientes, pedidos y ventas; valor del inventario; productos con stock bajo; productos por categoría y últimos usuarios registrados. | Admin | Hecho |
| RF-14 | El cliente puede agregar productos al carrito y finalizar una compra. | Cliente | Próxima etapa |
| RF-15 | El cliente puede consultar sus pedidos; el admin puede gestionar el estado de los pedidos. | Cliente / Admin | Próxima etapa |

## Requerimientos no funcionales

| Código | Categoría | Requerimiento |
|---|---|---|
| RNF-01 | Seguridad | Las contraseñas se almacenan encriptadas con hash **bcrypt** (10 rondas de sal). Nunca se guardan ni se devuelven en texto plano. |
| RNF-02 | Seguridad | La autenticación usa tokens **JWT** firmados, con vencimiento de 2 horas. |
| RNF-03 | Seguridad | Toda ruta de escritura sobre productos, categorías y proveedores, y el dashboard, exigen token válido y rol admin (respuestas 401 / 403). |
| RNF-04 | Seguridad | Las consultas SQL son parametrizadas para evitar inyección SQL; los valores de ordenamiento se validan contra una lista permitida. |
| RNF-05 | Seguridad | El mensaje de error del login es el mismo si falla el email o la contraseña, para no revelar qué cuentas existen. |
| RNF-06 | Seguridad | Los secretos (clave JWT, credenciales de la base) se guardan en variables de entorno (`.env`), fuera del código. |
| RNF-07 | Integridad de datos | La base de datos valida claves foráneas, email único, precio y stock no negativos. |
| RNF-08 | Usabilidad | La interfaz es adaptable a celular (diseño responsive) y respeta la identidad visual de PokeCard (paleta definida y tipografía Sora). |
| RNF-09 | Rendimiento | Las consultas del catálogo responden en menos de 1 segundo con hasta 1.000 productos, usando un pool de conexiones a MySQL. |
| RNF-10 | Mantenibilidad | El backend está separado en rutas, middleware y acceso a datos; hay tests automáticos del backend (Jest + Supertest). |
| RNF-11 | Portabilidad | Funciona sobre Node.js 18 o superior y MySQL 8, en cualquier sistema operativo. |
| RNF-12 | Compatibilidad | Compatible con las versiones actuales de Chrome, Firefox, Edge y Safari. |
| RNF-13 | Confiabilidad | La API responde con códigos HTTP coherentes (400, 401, 403, 404, 409, 500) y mensajes de error claros. |
