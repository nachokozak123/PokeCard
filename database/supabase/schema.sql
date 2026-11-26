-- =====================================================================
-- PokeCard - Esquema de base de datos para Supabase (PostgreSQL 15+)
-- ---------------------------------------------------------------------
-- Cómo usarlo: Supabase > SQL Editor > New query > pegar todo > Run.
-- Es idempotente en lo posible (IF NOT EXISTS / OR REPLACE), pero NO borra datos.
--
-- Modelo de acceso (importante para la seguridad):
--   * Supabase expone una API REST pública (PostgREST) con la clave "anon".
--     Por eso TODAS las tablas tienen RLS (Row Level Security) activado.
--   * El rol "anon" y "authenticated" solo pueden LEER el catálogo público
--     (categorías y productos activos). Nada más.
--   * Usuarios, pedidos, proveedores, etc. quedan sin acceso desde la API
--     pública: solo el backend Express (conexión directa con el rol postgres
--     o la service_role key) puede tocarlos.
--   * La compra se hace con la función crear_pedido(), que es atómica
--     (bloquea filas, valida stock, descuenta y registra en una transacción).
-- =====================================================================

-- ---------- Tipos ----------
DO $$ BEGIN
  CREATE TYPE rol_usuario AS ENUM ('cliente', 'admin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE estado_pedido AS ENUM ('pendiente', 'pagado', 'enviado', 'cancelado');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------- Función genérica: actualizar "actualizado_en" ----------
CREATE OR REPLACE FUNCTION set_actualizado_en() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  NEW.actualizado_en = now();
  RETURN NEW;
END $$;

-- ---------- Usuarios ----------
CREATE TABLE IF NOT EXISTS usuario (
  id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nombre          VARCHAR(100) NOT NULL CHECK (length(btrim(nombre)) > 0),
  email           VARCHAR(150) NOT NULL,
  contrasena_hash VARCHAR(255) NOT NULL,
  rol             rol_usuario NOT NULL DEFAULT 'cliente',
  activo          BOOLEAN NOT NULL DEFAULT TRUE,          -- baja lógica / bloqueo de cuenta
  telefono        VARCHAR(30),
  creado_en       TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizado_en  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT usuario_email_formato CHECK (email ~* '^[^\s@]+@[^\s@]+\.[^\s@]+$')
);
-- Email único sin importar mayúsculas/minúsculas
CREATE UNIQUE INDEX IF NOT EXISTS usuario_email_unico ON usuario (lower(email));

DROP TRIGGER IF EXISTS trg_usuario_upd ON usuario;
CREATE TRIGGER trg_usuario_upd BEFORE UPDATE ON usuario
  FOR EACH ROW EXECUTE FUNCTION set_actualizado_en();

-- ---------- Catálogo ----------
CREATE TABLE IF NOT EXISTS categoria (
  id     BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nombre VARCHAR(80) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS proveedor (
  id       BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nombre   VARCHAR(100) NOT NULL,
  contacto VARCHAR(150)
);

CREATE TABLE IF NOT EXISTS producto (
  id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nombre         VARCHAR(120) NOT NULL CHECK (length(btrim(nombre)) > 0),
  descripcion    TEXT,
  precio         NUMERIC(10,2) NOT NULL CHECK (precio >= 0),
  stock          INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  coleccion      VARCHAR(80),
  rareza         VARCHAR(50),
  imagen         VARCHAR(500) CHECK (imagen IS NULL OR imagen ~* '^https?://'),
  destacado      BOOLEAN NOT NULL DEFAULT FALSE,           -- aparece en el Home
  activo         BOOLEAN NOT NULL DEFAULT TRUE,            -- baja lógica (no se borra si tuvo ventas)
  categoria_id   BIGINT NOT NULL REFERENCES categoria(id),
  proveedor_id   BIGINT REFERENCES proveedor(id) ON DELETE SET NULL,
  creado_en      TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS producto_categoria_idx ON producto (categoria_id);
CREATE INDEX IF NOT EXISTS producto_proveedor_idx ON producto (proveedor_id);
CREATE INDEX IF NOT EXISTS producto_coleccion_idx ON producto (coleccion);
CREATE INDEX IF NOT EXISTS producto_rareza_idx    ON producto (rareza);
CREATE INDEX IF NOT EXISTS producto_destacado_idx ON producto (destacado) WHERE destacado;
-- Búsqueda por nombre sin distinguir mayúsculas (ILIKE '%texto%')
CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions;
CREATE INDEX IF NOT EXISTS producto_nombre_trgm_idx ON producto USING gin (nombre extensions.gin_trgm_ops);

DROP TRIGGER IF EXISTS trg_producto_upd ON producto;
CREATE TRIGGER trg_producto_upd BEFORE UPDATE ON producto
  FOR EACH ROW EXECUTE FUNCTION set_actualizado_en();

-- ---------- Pedidos ----------
CREATE TABLE IF NOT EXISTS pedido (
  id               BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  usuario_id       BIGINT NOT NULL REFERENCES usuario(id),
  fecha            TIMESTAMPTZ NOT NULL DEFAULT now(),
  estado           estado_pedido NOT NULL DEFAULT 'pendiente',
  total            NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (total >= 0),
  -- Pago: NUNCA se guarda el número completo ni el CVC, solo los últimos 4
  comprobante      VARCHAR(20),
  tarjeta_last4    CHAR(4) CHECK (tarjeta_last4 IS NULL OR tarjeta_last4 ~ '^\d{4}$'),
  -- Datos de envío (copia al momento de la compra, no cambia si el usuario edita su perfil)
  envio_nombre     VARCHAR(100),
  envio_direccion  VARCHAR(200),
  envio_ciudad     VARCHAR(100),
  envio_provincia  VARCHAR(100),
  envio_cp         VARCHAR(10),
  envio_telefono   VARCHAR(30),
  actualizado_en   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS pedido_usuario_idx ON pedido (usuario_id, fecha DESC);
CREATE INDEX IF NOT EXISTS pedido_estado_idx  ON pedido (estado);

DROP TRIGGER IF EXISTS trg_pedido_upd ON pedido;
CREATE TRIGGER trg_pedido_upd BEFORE UPDATE ON pedido
  FOR EACH ROW EXECUTE FUNCTION set_actualizado_en();

CREATE TABLE IF NOT EXISTS detalle_pedido (
  id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  pedido_id       BIGINT NOT NULL REFERENCES pedido(id) ON DELETE CASCADE,
  producto_id     BIGINT NOT NULL REFERENCES producto(id),
  cantidad        INTEGER NOT NULL CHECK (cantidad > 0),
  precio_unitario NUMERIC(10,2) NOT NULL CHECK (precio_unitario >= 0)  -- precio al momento de la compra
);
CREATE INDEX IF NOT EXISTS detalle_pedido_idx   ON detalle_pedido (pedido_id);
CREATE INDEX IF NOT EXISTS detalle_producto_idx ON detalle_pedido (producto_id);

-- ---------- Reseñas (confianza y prueba social) ----------
CREATE TABLE IF NOT EXISTS resena (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  producto_id BIGINT NOT NULL REFERENCES producto(id) ON DELETE CASCADE,
  usuario_id  BIGINT NOT NULL REFERENCES usuario(id) ON DELETE CASCADE,
  puntaje     SMALLINT NOT NULL CHECK (puntaje BETWEEN 1 AND 5),
  comentario  VARCHAR(1000),
  creado_en   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (producto_id, usuario_id)               -- una reseña por usuario y producto
);
CREATE INDEX IF NOT EXISTS resena_producto_idx ON resena (producto_id);

-- ---------- Favoritos / lista de deseos ----------
CREATE TABLE IF NOT EXISTS favorito (
  usuario_id  BIGINT NOT NULL REFERENCES usuario(id) ON DELETE CASCADE,
  producto_id BIGINT NOT NULL REFERENCES producto(id) ON DELETE CASCADE,
  creado_en   TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (usuario_id, producto_id)
);

-- ---------- Auditoría de acciones del admin ----------
CREATE TABLE IF NOT EXISTS auditoria (
  id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  usuario_id BIGINT REFERENCES usuario(id) ON DELETE SET NULL,
  accion     VARCHAR(60) NOT NULL,          -- ej. 'producto.editar', 'pedido.cancelar'
  entidad    VARCHAR(40),
  entidad_id BIGINT,
  detalle    JSONB,
  creado_en  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS auditoria_fecha_idx ON auditoria (creado_en DESC);

-- =====================================================================
-- Función de compra ATÓMICA
-- Recibe: usuario, items [{producto_id, cantidad}], datos de envío y últimos 4 de la tarjeta.
-- Bloquea las filas de producto (FOR UPDATE, en orden de id para evitar deadlocks),
-- toma el PRECIO de la base (nunca del cliente), valida stock, descuenta y crea el pedido.
-- Si algo falla, se revierte todo.
-- =====================================================================
CREATE OR REPLACE FUNCTION crear_pedido(
  p_usuario_id BIGINT,
  p_items      JSONB,
  p_envio      JSONB,
  p_last4      TEXT
) RETURNS TABLE (pedido_id BIGINT, total NUMERIC, comprobante TEXT)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_total  NUMERIC(10,2) := 0;
  v_pedido BIGINT;
  v_comp   TEXT;
  r        RECORD;
BEGIN
  IF jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'CARRITO_VACIO' USING ERRCODE = 'P0001';
  END IF;

  -- Suma cantidades si el mismo producto viene repetido
  CREATE TEMP TABLE _items ON COMMIT DROP AS
    SELECT (i->>'producto_id')::BIGINT AS producto_id, SUM((i->>'cantidad')::INT) AS cantidad
    FROM jsonb_array_elements(p_items) i
    GROUP BY 1;

  IF EXISTS (SELECT 1 FROM _items WHERE cantidad < 1) THEN
    RAISE EXCEPTION 'ITEMS_INVALIDOS' USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO pedido (usuario_id, estado, total, tarjeta_last4,
                      envio_nombre, envio_direccion, envio_ciudad, envio_provincia, envio_cp, envio_telefono)
  VALUES (p_usuario_id, 'pagado', 0, p_last4,
          p_envio->>'nombre', p_envio->>'direccion', p_envio->>'ciudad',
          p_envio->>'provincia', p_envio->>'cp', p_envio->>'telefono')
  RETURNING id INTO v_pedido;

  -- Todos los productos del carrito deben existir y estar activos
  IF EXISTS (
    SELECT 1 FROM _items i
    WHERE NOT EXISTS (SELECT 1 FROM producto p WHERE p.id = i.producto_id AND p.activo)
  ) THEN
    RAISE EXCEPTION 'PRODUCTO_INEXISTENTE' USING ERRCODE = 'P0002';
  END IF;

  FOR r IN
    SELECT p.id, p.nombre, p.precio, p.stock, i.cantidad
    FROM _items i
    JOIN producto p ON p.id = i.producto_id AND p.activo
    ORDER BY p.id
    FOR UPDATE OF p
  LOOP
    IF r.stock < r.cantidad THEN
      RAISE EXCEPTION 'STOCK_INSUFICIENTE:%:%', r.nombre, r.stock USING ERRCODE = 'P0003';
    END IF;
    UPDATE producto SET stock = stock - r.cantidad WHERE id = r.id;
    INSERT INTO detalle_pedido (pedido_id, producto_id, cantidad, precio_unitario)
    VALUES (v_pedido, r.id, r.cantidad, r.precio);
    v_total := v_total + r.precio * r.cantidad;
  END LOOP;

  v_comp := 'PAY-' || lpad(v_pedido::TEXT, 6, '0');
  UPDATE pedido SET total = v_total, comprobante = v_comp WHERE id = v_pedido;

  RETURN QUERY SELECT v_pedido, v_total, v_comp;
END $$;

-- Cancelar un pedido devuelve el stock (también atómico)
CREATE OR REPLACE FUNCTION cancelar_pedido(p_pedido_id BIGINT) RETURNS VOID
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE v_estado estado_pedido;
BEGIN
  SELECT estado INTO v_estado FROM pedido WHERE id = p_pedido_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'PEDIDO_INEXISTENTE' USING ERRCODE = 'P0002'; END IF;
  IF v_estado IN ('enviado', 'cancelado') THEN
    RAISE EXCEPTION 'TRANSICION_INVALIDA:%', v_estado USING ERRCODE = 'P0004';
  END IF;
  UPDATE producto p SET stock = p.stock + d.cantidad
  FROM detalle_pedido d WHERE d.pedido_id = p_pedido_id AND d.producto_id = p.id;
  UPDATE pedido SET estado = 'cancelado' WHERE id = p_pedido_id;
END $$;

-- =====================================================================
-- SEGURIDAD: RLS + permisos
-- =====================================================================
ALTER TABLE usuario        ENABLE ROW LEVEL SECURITY;
ALTER TABLE categoria      ENABLE ROW LEVEL SECURITY;
ALTER TABLE proveedor      ENABLE ROW LEVEL SECURITY;
ALTER TABLE producto       ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedido         ENABLE ROW LEVEL SECURITY;
ALTER TABLE detalle_pedido ENABLE ROW LEVEL SECURITY;
ALTER TABLE resena         ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorito       ENABLE ROW LEVEL SECURITY;
ALTER TABLE auditoria      ENABLE ROW LEVEL SECURITY;

-- Lectura pública SOLO del catálogo
DROP POLICY IF EXISTS categoria_lectura_publica ON categoria;
CREATE POLICY categoria_lectura_publica ON categoria FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS producto_lectura_publica ON producto;
CREATE POLICY producto_lectura_publica ON producto FOR SELECT TO anon, authenticated USING (activo);

-- Las reseñas se pueden leer públicamente (se escriben vía backend)
DROP POLICY IF EXISTS resena_lectura_publica ON resena;
CREATE POLICY resena_lectura_publica ON resena FOR SELECT TO anon, authenticated USING (true);

-- Defensa en profundidad: quitar todo permiso a la API pública y dar solo lo mínimo
REVOKE ALL ON ALL TABLES    IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC, anon, authenticated;
GRANT SELECT ON categoria, producto, resena TO anon, authenticated;
-- Las columnas internas del producto (proveedor, auditoría) no deberían exponerse:
REVOKE SELECT ON producto FROM anon, authenticated;
GRANT SELECT (id, nombre, descripcion, precio, stock, coleccion, rareza, imagen, destacado, categoria_id)
  ON producto TO anon, authenticated;

-- Para que las tablas futuras tampoco queden abiertas por defecto
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated;

-- =====================================================================
-- DATOS DE EJEMPLO (solo catálogo; los usuarios se crean con `npm run seed`
-- para no dejar contraseñas conocidas dentro de un archivo SQL)
-- =====================================================================
INSERT INTO categoria (nombre)
SELECT v FROM (VALUES ('Cartas sueltas'), ('Sobres'), ('Mazos'), ('Accesorios')) t(v)
WHERE NOT EXISTS (SELECT 1 FROM categoria);

INSERT INTO proveedor (nombre, contacto)
SELECT * FROM (VALUES
  ('Distribuidora Kanto', 'ventas@kanto.example'),
  ('Johto Import', 'contacto@johto.example')
) t(n, c)
WHERE NOT EXISTS (SELECT 1 FROM proveedor);

INSERT INTO producto (nombre, descripcion, precio, stock, coleccion, rareza, destacado, categoria_id, proveedor_id)
SELECT * FROM (VALUES
  ('Carta Holo Fuego',      'Carta holográfica de colección, tipo Fuego.',     4500, 10, 'Base Set', 'Rara Holo', TRUE,  1, 1),
  ('Carta Holo Agua',       'Carta holográfica de colección, tipo Agua.',      5200,  8, 'Base Set', 'Rara Holo', TRUE,  1, 1),
  ('Carta Holo Planta',     'Carta holográfica de colección, tipo Planta.',    2800, 12, 'Base Set', 'Rara Holo', FALSE, 1, 1),
  ('Carta Holo Eléctrica',  'Carta holográfica de colección, tipo Eléctrico.', 6100,  4, 'Base Set', 'Rara Holo', TRUE,  1, 1),
  ('Carta Holo Psíquica',   'Carta holográfica de colección, tipo Psíquico.',  7300,  3, 'Base Set', 'Rara Holo', FALSE, 1, 1),
  ('Carta Holo Sombra',     'Carta holográfica de colección, tipo Fantasma.',  9900,  2, 'Base Set', 'Rara Holo', TRUE,  1, 1),
  ('Sobre Booster',         'Sobre sellado de 10 cartas.',                     3200, 40, 'Base Set', 'Común',     FALSE, 2, 2),
  ('Mazo Inicial',          'Mazo listo para jugar de 60 cartas.',            15000, 15, 'Base Set', 'Común',     FALSE, 3, 2),
  ('Fundas protectoras x50','Fundas de colores para proteger tus cartas.',     2500, 60, NULL,       NULL,        FALSE, 4, 2)
) t(nombre, descripcion, precio, stock, coleccion, rareza, destacado, categoria_id, proveedor_id)
WHERE NOT EXISTS (SELECT 1 FROM producto);
