-- =====================================================================
--  PokeCard — Base de datos para Supabase (PostgreSQL)
--  Cómo usarlo: Supabase → SQL Editor → New query → pegar todo → Run.
--  Se ejecuta UNA sola vez en un proyecto nuevo.
--
--  Si querés empezar de cero, ejecutá antes estas líneas (borra todo):
--    drop table if exists detalle_pedido, pedido, producto, proveedor, categoria, usuario cascade;
--    drop type if exists rol_usuario, estado_pedido;
-- =====================================================================

create type rol_usuario   as enum ('cliente', 'admin');
create type estado_pedido as enum ('pendiente', 'pagado', 'enviado', 'cancelado');

-- ---------------------------------------------------------------------
--  Tablas
-- ---------------------------------------------------------------------
create table usuario (
  id                int generated always as identity primary key,
  nombre            varchar(100) not null,
  email             varchar(150) not null unique check (email = lower(email)),
  contrasena_hash   varchar(255) not null,               -- hash bcrypt, nunca la contraseña
  rol               rol_usuario  not null default 'cliente',
  intentos_fallidos int          not null default 0,      -- freno contra fuerza bruta
  bloqueado_hasta   timestamptz,
  creado_en         timestamptz  not null default now()
);

create table categoria (
  id     int generated always as identity primary key,
  nombre varchar(80) not null unique,
  imagen varchar(500) check (imagen is null or imagen ~ '^(https://|/imagenes/)')
);

create table proveedor (
  id       int generated always as identity primary key,
  nombre   varchar(100) not null unique,
  contacto varchar(150)
);

create table producto (
  id           int generated always as identity primary key,
  nombre       varchar(120)  not null,
  descripcion  text,
  precio       numeric(10,2) not null check (precio >= 0),
  stock        int           not null default 0 check (stock >= 0),
  coleccion    varchar(80),
  rareza       varchar(50),
  imagen       varchar(500)  check (imagen is null or imagen ~ '^(https://|/imagenes/)'),  -- link https:// o archivo en frontend/public/imagenes/
  activo       boolean       not null default true,     -- false = archivado (no se muestra en la tienda)
  categoria_id int not null references categoria(id),
  proveedor_id int          references proveedor(id) on delete set null,
  creado_en    timestamptz   not null default now()
);

create table pedido (
  id               int generated always as identity primary key,
  usuario_id       int           not null references usuario(id),
  fecha            timestamptz   not null default now(),
  estado           estado_pedido not null default 'pendiente',
  total            numeric(10,2) not null default 0 check (total >= 0),
  tarjeta_ultimos4 char(4)                               -- solo los últimos 4 dígitos
);

create table detalle_pedido (
  id              int generated always as identity primary key,
  pedido_id       int           not null references pedido(id) on delete cascade,
  producto_id     int           not null references producto(id),
  cantidad        int           not null check (cantidad > 0),
  precio_unitario numeric(10,2) not null check (precio_unitario >= 0)
);

-- Índices para que el catálogo y los pedidos respondan rápido
create index idx_producto_categoria on producto(categoria_id);
create index idx_producto_activo    on producto(activo);
create index idx_pedido_usuario     on pedido(usuario_id);
create index idx_pedido_estado      on pedido(estado);
create index idx_detalle_pedido     on detalle_pedido(pedido_id);
create index idx_detalle_producto   on detalle_pedido(producto_id);

-- ---------------------------------------------------------------------
--  Seguridad: Supabase publica automáticamente las tablas en su API
--  pública (Data API). Activando RLS sin políticas y quitando permisos
--  a los roles anon/authenticated, NADIE puede leerlas desde afuera.
--  Solo el backend (que se conecta con el usuario postgres) accede.
-- ---------------------------------------------------------------------
alter table usuario        enable row level security;
alter table categoria      enable row level security;
alter table proveedor      enable row level security;
alter table producto       enable row level security;
alter table pedido         enable row level security;
alter table detalle_pedido enable row level security;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    revoke all on all tables    in schema public from anon, authenticated;
    revoke all on all sequences in schema public from anon, authenticated;
  end if;
end $$;

-- ---------------------------------------------------------------------
--  Datos de ejemplo
--  Usuarios de prueba (cambiá estas contraseñas antes de publicar):
--    admin@pokecard.com   / Admin123
--    cliente@pokecard.com / Cliente123
-- ---------------------------------------------------------------------
-- Las imágenes son archivos de frontend/public/imagenes/ (viajan con el repositorio).
-- Para cambiar una foto: reemplazá el archivo con el MISMO nombre, o cambiá el nombre acá.
-- Las imágenes son archivos de frontend/public/imagenes/ (viajan con el repositorio).
-- Para cambiar una foto: reemplazá el archivo con el MISMO nombre, o cambiá el nombre acá.
insert into categoria (nombre, imagen) values
  ('Cartas especiales', '/imagenes/categorias/cartas-especiales.png'),
  ('Sobres', '/imagenes/categorias/sobres.png'),
  ('Mazos', '/imagenes/categorias/mazos.png'),
  ('Accesorios', '/imagenes/categorias/accesorios.png'),
  ('Extras', '/imagenes/categorias/extras.png');   -- ids: 1 Cartas especiales · 2 Sobres · 3 Mazos · 4 Accesorios · 5 Extras

insert into proveedor (nombre, contacto) values
  ('Distribuidora Kanto', 'ventas@kanto.example'),
  ('Johto Import',        'contacto@johto.example');

-- Orden de los datos: nombre, descripción, precio, stock, colección, rareza, imagen, categoria_id, proveedor_id
-- (categoria_id: 1 Cartas especiales · 2 Sobres · 3 Mazos · 4 Accesorios · 5 Extras). Precios de ejemplo.
insert into producto (nombre, descripcion, precio, stock, coleccion, rareza, imagen, categoria_id, proveedor_id) values
  -- Cartas especiales: raras y de alto valor
  ('Charizard Holo', 'Carta holográfica de Charizard, muy buscada por coleccionistas.', 185000, 1, 'Base Set', 'Rara Holo', '/imagenes/productos/charizard-holo.png', 1, 1),
  ('Mew Holo', 'Carta holográfica de Mew, edición de colección.', 95000, 2, 'Base Set', 'Rara Holo', '/imagenes/productos/mew-holo.png', 1, 1),
  ('Blastoise Holo', 'Carta holográfica de Blastoise en excelente estado.', 60000, 2, 'Base Set', 'Rara Holo', '/imagenes/productos/blastoise-holo.png', 1, 1),
  ('Mewtwo Holo', 'Carta holográfica de Mewtwo, pieza de alto valor.', 120000, 1, 'Base Set', 'Rara Holo', '/imagenes/productos/mewtwo-holo.png', 1, 1),
  ('Pikachu Edición Especial', 'Carta especial de Pikachu para coleccionistas.', 45000, 3, 'Promo', 'Rara Holo', '/imagenes/productos/pikachu-especial.png', 1, 1),
  ('Gengar Holo', 'Carta holográfica de Gengar, tipo Fantasma.', 70000, 2, 'Fósil', 'Rara Holo', '/imagenes/productos/gengar-holo.png', 1, 1),
  -- Sobres: de distintas colecciones y eventos
  ('Sobre Base Set', 'Sobre sellado de 10 cartas de la colección clásica.', 8500, 20, 'Base Set', 'Común', '/imagenes/productos/sobre-base-set.png', 2, 2),
  ('Sobre Escarlata y Púrpura', 'Sobre sellado de 10 cartas de la colección Escarlata y Púrpura.', 4200, 40, 'Escarlata y Púrpura', 'Común', '/imagenes/productos/sobre-escarlata-purpura.png', 2, 2),
  ('Sobre 151', 'Sobre sellado de 10 cartas de la colección 151.', 5200, 30, '151', 'Común', '/imagenes/productos/sobre-151.png', 2, 2),
  ('Sobre Evoluciones en Paldea', 'Sobre sellado de 10 cartas de la colección Evoluciones en Paldea.', 4500, 35, 'Evoluciones en Paldea', 'Común', '/imagenes/productos/sobre-evoluciones-paldea.png', 2, 2),
  ('Sobre Fuerzas Temporales', 'Sobre sellado de 10 cartas de la colección Fuerzas Temporales.', 4600, 35, 'Fuerzas Temporales', 'Común', '/imagenes/productos/sobre-fuerzas-temporales.png', 2, 2),
  ('Sobre Edición Aniversario', 'Sobre sellado de edición especial por evento aniversario.', 6500, 25, 'Evento', 'Poco común', '/imagenes/productos/sobre-aniversario.png', 2, 2),
  -- Mazos: de un solo tipo, con sus energías
  ('Mazo Eléctrico', 'Mazo de 60 cartas tipo Eléctrico, con sus energías incluidas.', 18000, 10, 'Base Set', 'Común', '/imagenes/productos/mazo-electrico.png', 3, 2),
  ('Mazo Fuego', 'Mazo de 60 cartas tipo Fuego, con sus energías incluidas.', 18000, 10, 'Base Set', 'Común', '/imagenes/productos/mazo-fuego.png', 3, 2),
  ('Mazo Agua', 'Mazo de 60 cartas tipo Agua, con sus energías incluidas.', 18000, 10, 'Base Set', 'Común', '/imagenes/productos/mazo-agua.png', 3, 2),
  ('Mazo Planta', 'Mazo de 60 cartas tipo Planta, con sus energías incluidas.', 18000, 10, 'Base Set', 'Común', '/imagenes/productos/mazo-planta.png', 3, 2),
  ('Mazo Psíquico', 'Mazo de 60 cartas tipo Psíquico, con sus energías incluidas.', 19000, 8, 'Base Set', 'Común', '/imagenes/productos/mazo-psiquico.png', 3, 2),
  ('Mazo Lucha', 'Mazo de 60 cartas tipo Lucha, con sus energías incluidas.', 18500, 8, 'Base Set', 'Común', '/imagenes/productos/mazo-lucha.png', 3, 2),
  -- Accesorios: objetos, entrenadores, energías y protección
  ('Carta de Objeto: Poción', 'Carta de objeto para tu mazo.', 900, 50, 'Base Set', 'Común', '/imagenes/productos/objeto-pocion.png', 4, 2),
  ('Entrenador: Profesor Oak', 'Carta de entrenador para tu mazo.', 1500, 40, 'Base Set', 'Poco común', '/imagenes/productos/entrenador-profesor-oak.png', 4, 2),
  ('Fundas protectoras x50', 'Fundas de colores para proteger tus cartas.', 2500, 60, null, null, '/imagenes/productos/fundas-protectoras.png', 4, 2),
  ('Pack de Energías Eléctricas x20', '20 cartas de energía tipo Eléctrico para armar tu mazo.', 2200, 40, 'Base Set', 'Común', '/imagenes/productos/energias-electricas.png', 4, 2),
  ('Pack de Energías Fuego x20', '20 cartas de energía tipo Fuego para armar tu mazo.', 2200, 40, 'Base Set', 'Común', '/imagenes/productos/energias-fuego.png', 4, 2),
  ('Carpeta para 360 cartas', 'Carpeta con hojas para guardar y exhibir tu colección.', 9500, 15, null, null, '/imagenes/productos/carpeta-360.png', 4, 2),
  -- Extras: fundas, mousepads y merchandising
  ('Funda de celular PokeCard', 'Funda rígida para celular con diseño PokeCard.', 6500, 30, null, null, '/imagenes/productos/funda-celular.png', 5, 2),
  ('Funda para notebook 15"', 'Funda acolchada para notebook de hasta 15 pulgadas.', 14000, 12, null, null, '/imagenes/productos/funda-notebook.png', 5, 2),
  ('Funda para tablet', 'Funda acolchada para tablet de 10 pulgadas.', 9000, 15, null, null, '/imagenes/productos/funda-tablet.png', 5, 2),
  ('Mousepad XL', 'Tapete grande para escritorio o para jugar cartas.', 12000, 20, null, null, '/imagenes/productos/mousepad-xl.png', 5, 2),
  ('Mousepad de colección', 'Mousepad clásico con diseño PokeCard.', 4500, 40, null, null, '/imagenes/productos/mousepad.png', 5, 2),
  ('Stickers PokeCard x10', 'Pack de 10 stickers para laptop y cuaderno.', 1800, 80, null, null, '/imagenes/productos/stickers.png', 5, 2),
  ('Llavero PokeCard', 'Llavero de metal con el isotipo de PokeCard.', 2500, 50, null, null, '/imagenes/productos/llavero.png', 5, 2);

insert into usuario (nombre, email, contrasena_hash, rol) values
  ('Administrador', 'admin@pokecard.com',   '$2b$12$P10AU8y9D6ejg8VMa5XBVe4KOEwv1BpQCb.WQP/cCnOBR.izFN82O', 'admin'),
  ('Cliente Demo',  'cliente@pokecard.com', '$2b$12$2sBCjo9s97qaEGpXZ2KB9OPFzbYRd0b.ug2kysdFoJ1O1bYuHRWEm', 'cliente');
