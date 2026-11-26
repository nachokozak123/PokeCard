import { useEffect } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import RutaProtegida from './components/RutaProtegida';
import { useCarrito } from './CarritoContext';
import Home from './pages/Home';
import Login from './pages/Login';
import Registro from './pages/Registro';
import Catalogo from './pages/Catalogo';
import DetalleProducto from './pages/DetalleProducto';
import Carrito from './pages/Carrito';
import Checkout from './pages/Checkout';
import MisPedidos from './pages/MisPedidos';
import AdminLayout from './pages/admin/AdminLayout';
import Dashboard from './pages/admin/Dashboard';
import AdminProductos from './pages/admin/AdminProductos';
import AdminPedidos from './pages/admin/AdminPedidos';
import AdminCatalogos from './pages/admin/AdminCatalogos';

export default function App() {
  const { pathname } = useLocation();
  const { aviso } = useCarrito();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]); // cada página empieza arriba

  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/registro" element={<Registro />} />
        <Route path="/catalogo" element={<Catalogo />} />
        <Route path="/producto/:id" element={<DetalleProducto />} />
        <Route path="/carrito" element={<Carrito />} />
        <Route path="/checkout" element={<RutaProtegida><Checkout /></RutaProtegida>} />
        <Route path="/pedidos" element={<RutaProtegida><MisPedidos /></RutaProtegida>} />

        {/* Solo para administradores */}
        <Route path="/admin" element={<RutaProtegida soloAdmin><AdminLayout /></RutaProtegida>}>
          <Route index element={<Dashboard />} />
          <Route path="productos" element={<AdminProductos />} />
          <Route path="pedidos" element={<AdminPedidos />} />
          <Route path="catalogos" element={<AdminCatalogos />} />
        </Route>

        <Route path="*" element={
          <main className="contenedor vacio">
            <h1>Página no encontrada</h1>
            <p>La dirección no existe o se movió.</p>
            <Link to="/" className="btn btn-rojo">Volver al inicio</Link>
          </main>
        } />
      </Routes>
      <Footer />
      {aviso && <div className="toast" role="status">{aviso} · <Link to="/carrito">Ver carrito</Link></div>}
    </>
  );
}

function Footer() {
  return (
    <footer className="footer">
      <div className="footer-interior">
        <div>
          <Link to="/" className="marca"><img src="/logo.png" alt="" /><span>PokeCard</span></Link>
          <p>Cartas únicas, compras seguras.</p>
        </div>
        <div>
          <h4>Tienda</h4>
          <Link to="/catalogo">Catálogo</Link>
          <Link to="/carrito">Carrito</Link>
          <Link to="/pedidos">Mis pedidos</Link>
        </div>
        <div>
          <h4>Local</h4>
          <p>Anacleto Rojas 60, Monte Grande</p>
          <p>Lun a vie 10 a 19 h · Sáb 10 a 14 h</p>
          <p>contacto@pokecard.com.ar</p>
        </div>
      </div>
      <p className="footer-legal">
        © {new Date().getFullYear()} PokeCard · Proyecto académico. Pokémon y sus personajes son marcas de sus respectivos dueños.
      </p>
    </footer>
  );
}
