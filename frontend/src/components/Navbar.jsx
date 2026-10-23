import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { useCarrito } from '../CarritoContext';

export default function Navbar() {
  const { usuario, esAdmin, logout } = useAuth();
  const { cantidadTotal } = useCarrito();
  const navigate = useNavigate();

  function salir() {
    logout();
    navigate('/');
  }

  return (
    <header className="navbar">
      <div className="navbar-interior">
        <Link to="/" className="marca">
          <img src="/logo.png" alt="" />
          <span>PokeCard</span>
        </Link>
        <nav className="nav-links">
          <NavLink to="/" end>Inicio</NavLink>
          <NavLink to="/catalogo">Catálogo</NavLink>
          {usuario && !esAdmin && <NavLink to="/pedidos">Mis pedidos</NavLink>}
          {esAdmin && <NavLink to="/admin">Panel admin</NavLink>}
          <NavLink to="/carrito" className="btn btn-rojo btn-chico">Carrito ({cantidadTotal})</NavLink>
          {usuario ? (
            <>
              <span className="nav-usuario">Hola, {usuario.nombre.split(' ')[0]}</span>
              <button className="btn btn-rojo btn-chico" onClick={salir}>Salir</button>
            </>
          ) : (
            <NavLink to="/login">Ingresar</NavLink>
          )}
        </nav>
      </div>
    </header>
  );
}
