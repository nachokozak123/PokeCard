import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
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

export default function App() {
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
        </Route>

        <Route path="*" element={<main className="contenedor"><h1>Página no encontrada</h1></main>} />
      </Routes>
    </>
  );
}
