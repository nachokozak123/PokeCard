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
  nombre varchar(80) not null unique
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
  imagen       varchar(500)  check (imagen is null or imagen ~ '^https://'),
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
insert into categoria (nombre) values ('Cartas sueltas'), ('Sobres'), ('Mazos'), ('Accesorios');

insert into proveedor (nombre, contacto) values
  ('Distribuidora Kanto', 'ventas@kanto.example'),
  ('Johto Import',        'contacto@johto.example');

insert into producto (nombre, descripcion, precio, stock, coleccion, rareza, categoria_id, proveedor_id) values
  ('Carta Holo Fuego',      'Carta holográfica de colección, tipo Fuego.',     4500, 10, 'Base Set', 'Rara Holo', 1, 1),
  ('Carta Holo Agua',       'Carta holográfica de colección, tipo Agua.',      5200,  8, 'Base Set', 'Rara Holo', 1, 1),
  ('Carta Holo Planta',     'Carta holográfica de colección, tipo Planta.',    2800, 12, 'Base Set', 'Rara Holo', 1, 1),
  ('Carta Holo Eléctrica',  'Carta holográfica de colección, tipo Eléctrico.', 6100,  4, 'Base Set', 'Rara Holo', 1, 1),
  ('Carta Holo Psíquica',   'Carta holográfica de colección, tipo Psíquico.',  7300,  3, 'Base Set', 'Rara Holo', 1, 1),
  ('Carta Holo Sombra',     'Carta holográfica de colección, tipo Fantasma.',  9900,  2, 'Base Set', 'Rara Holo', 1, 1),
  ('Sobre Booster',         'Sobre sellado de 10 cartas.',                     3200, 40, 'Base Set', 'Común',     2, 2),
  ('Mazo Inicial',          'Mazo listo para jugar de 60 cartas.',            15000, 15, 'Base Set', 'Común',     3, 2),
  ('Fundas protectoras x50','Fundas de colores para proteger tus cartas.',     2500, 60, null,       null,        4, 2);

insert into usuario (nombre, email, contrasena_hash, rol) values
  ('Administrador', 'admin@pokecard.com',   '$2b$12$P10AU8y9D6ejg8VMa5XBVe4KOEwv1BpQCb.WQP/cCnOBR.izFN82O', 'admin'),
  ('Cliente Demo',  'cliente@pokecard.com', '$2b$12$2sBCjo9s97qaEGpXZ2KB9OPFzbYRd0b.ug2kysdFoJ1O1bYuHRWEm', 'cliente');
