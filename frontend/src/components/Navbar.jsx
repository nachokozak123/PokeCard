import { useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { useCarrito } from '../CarritoContext';

export default function Navbar() {
  const { usuario, esAdmin, logout } = useAuth();
  const { cantidadTotal } = useCarrito();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [abierto, setAbierto] = useState(false);
  const [rutaMenu, setRutaMenu] = useState(pathname);

  // El menú del celular se cierra solo al cambiar de página
  if (rutaMenu !== pathname) { setRutaMenu(pathname); setAbierto(false); }

  async function salir() {
    navigate('/'); // primero salir de la página actual (puede ser una ruta protegida)
    await logout();
  }

  return (
    <header className="navbar">
      <div className="navbar-interior">
        <Link to="/" className="marca">
          <img src="/logo.png" alt="" />
          <span>PokeCard</span>
        </Link>

        <Link to="/carrito" className="carrito-boton solo-movil" aria-label={`Carrito (${cantidadTotal})`}>
          <IconoCarrito />{cantidadTotal > 0 && <b>{cantidadTotal}</b>}
        </Link>
        <button className="menu-boton" aria-label="Abrir menú" aria-expanded={abierto} onClick={() => setAbierto(!abierto)}>
          <span /><span /><span />
        </button>

        <nav className={`nav-links ${abierto ? 'abierto' : ''}`}>
          <NavLink to="/" end>Inicio</NavLink>
          <NavLink to="/catalogo">Catálogo</NavLink>
          {usuario && !esAdmin && <NavLink to="/pedidos">Mis pedidos</NavLink>}
          {esAdmin && <NavLink to="/admin">Panel admin</NavLink>}
          {usuario ? (
            <>
              <span className="nav-usuario">Hola, {usuario.nombre.split(' ')[0]}</span>
              <button className="btn btn-borde btn-chico" onClick={salir}>Salir</button>
            </>
          ) : (
            <NavLink to="/login">Ingresar</NavLink>
          )}
          <Link to="/carrito" className="carrito-boton solo-escritorio" aria-label={`Carrito (${cantidadTotal})`}>
            <IconoCarrito /> Carrito {cantidadTotal > 0 && <b>{cantidadTotal}</b>}
          </Link>
        </nav>
      </div>
    </header>
  );
}

function IconoCarrito() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="9" cy="20" r="1.4" /><circle cx="18" cy="20" r="1.4" />
      <path d="M2.5 3h2.6l2.4 12.2a1.6 1.6 0 0 0 1.6 1.3h8.4a1.6 1.6 0 0 0 1.6-1.2L21 8H6.2" />
    </svg>
  );
}
