import { NavLink, Outlet } from 'react-router-dom';

export default function AdminLayout() {
  return (
    <main className="contenedor">
      <h1>Panel administrativo</h1>
      <nav className="tabs">
        <NavLink to="/admin" end>Dashboard</NavLink>
        <NavLink to="/admin/productos">Productos</NavLink>
        <NavLink to="/admin/pedidos">Pedidos</NavLink>
      </nav>
      <Outlet />
    </main>
  );
}
