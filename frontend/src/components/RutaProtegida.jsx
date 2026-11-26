import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../AuthContext';

// Sin sesión → al login (y después vuelve a esta página). Ruta de admin sin ser admin → al inicio.
// Es solo comodidad visual: la protección real está en el backend.
export default function RutaProtegida({ children, soloAdmin = false }) {
  const { usuario, esAdmin, cargando } = useAuth();
  const location = useLocation();
  if (cargando) return <main className="contenedor"><p className="nota">Cargando…</p></main>;
  if (!usuario) return <Navigate to="/login" replace state={{ desde: location.pathname }} />;
  if (soloAdmin && !esAdmin) return <Navigate to="/" replace />;
  return children;
}
