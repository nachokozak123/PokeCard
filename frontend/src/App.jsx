import { Routes, Route, Link } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import RutaProtegida from './components/RutaProtegida';
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

export default function App() {
  return (
    <>
      <a href="#contenido" className="saltar">Saltar al contenido</a>
      <Navbar />
      <div id="contenido" tabIndex={-1}>
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
        </Route>

        <Route path="*" element={
          <main className="contenedor vacio">
            <h1>Página no encontrada</h1>
            <p>La carta que buscás no está acá. Probá desde el catálogo.</p>
            <Link to="/catalogo" className="btn btn-rojo">Ir al catálogo</Link>
          </main>
        } />
      </Routes>
      </div>
      <Footer />
    </>
  );
}
