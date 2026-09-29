-- PokeCard - Esquema de base de datos (MySQL 8+)
-- Basado en el DER: Usuario, Categoria, Proveedor, Producto, Pedido, DetallePedido, CarritoItem

CREATE DATABASE IF NOT EXISTS pokecard;
USE pokecard;

-- Usuarios de la tienda (clientes y administradores)
CREATE TABLE usuario (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    nombre          VARCHAR(100) NOT NULL,
    apellido        VARCHAR(100) NOT NULL,
    email           VARCHAR(150) NOT NULL UNIQUE,
    password_hash   VARCHAR(255) NOT NULL,
    rol             ENUM('cliente', 'admin') NOT NULL DEFAULT 'cliente',
    fecha_registro  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Categorías de producto: cartas sueltas, sobres, cajas y mazos, accesorios
CREATE TABLE categoria (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    nombre      VARCHAR(100) NOT NULL,
    descripcion VARCHAR(255)
);

-- Proveedores de los productos
CREATE TABLE proveedor (
    id       INT AUTO_INCREMENT PRIMARY KEY,
    nombre   VARCHAR(150) NOT NULL,
    email    VARCHAR(150),
    telefono VARCHAR(50)
);

-- Productos: cartas, sobres, cajas, mazos y accesorios
CREATE TABLE producto (
    id             INT AUTO_INCREMENT PRIMARY KEY,
    nombre         VARCHAR(150) NOT NULL,
    descripcion    TEXT,
    precio         DECIMAL(10,2) NOT NULL CHECK (precio >= 0),
    stock          INT NOT NULL DEFAULT 0 CHECK (stock >= 0),
    set_expansion  VARCHAR(100),
    rareza         VARCHAR(50),
    imagen_url     VARCHAR(255),
    categoria_id   INT NOT NULL,
    proveedor_id   INT,
    fecha_alta     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (categoria_id) REFERENCES categoria(id) ON DELETE RESTRICT,
    FOREIGN KEY (proveedor_id) REFERENCES proveedor(id) ON DELETE SET NULL
);

-- Pedidos realizados por un usuario
CREATE TABLE pedido (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id  INT NOT NULL,
    fecha       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    estado      ENUM('pendiente', 'pagado', 'enviado', 'entregado', 'cancelado') NOT NULL DEFAULT 'pendiente',
    total       DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (total >= 0),
    FOREIGN KEY (usuario_id) REFERENCES usuario(id) ON DELETE RESTRICT
);

-- Detalle de cada pedido: qué productos y en qué cantidad
CREATE TABLE detalle_pedido (
    id               INT AUTO_INCREMENT PRIMARY KEY,
    pedido_id        INT NOT NULL,
    producto_id      INT NOT NULL,
    cantidad         INT NOT NULL CHECK (cantidad > 0),
    precio_unitario  DECIMAL(10,2) NOT NULL CHECK (precio_unitario >= 0),
    subtotal         DECIMAL(10,2) NOT NULL CHECK (subtotal >= 0),
    FOREIGN KEY (pedido_id) REFERENCES pedido(id) ON DELETE CASCADE,
    FOREIGN KEY (producto_id) REFERENCES producto(id) ON DELETE RESTRICT
);

-- Carrito persistente por usuario (un producto aparece una sola vez por carrito)
CREATE TABLE carrito_item (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id      INT NOT NULL,
    producto_id     INT NOT NULL,
    cantidad        INT NOT NULL DEFAULT 1 CHECK (cantidad > 0),
    fecha_agregado  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_usuario_producto (usuario_id, producto_id),
    FOREIGN KEY (usuario_id) REFERENCES usuario(id) ON DELETE CASCADE,
    FOREIGN KEY (producto_id) REFERENCES producto(id) ON DELETE CASCADE
);

-- Datos base de categorías
INSERT INTO categoria (nombre, descripcion) VALUES
    ('Cartas sueltas', 'Cartas individuales de distintos sets y rarezas'),
    ('Sobres', 'Sobres de expansión sellados'),
    ('Cajas y mazos', 'Display boxes y mazos temáticos'),
    ('Accesorios', 'Fundas, playmats y otros accesorios para cartas');
