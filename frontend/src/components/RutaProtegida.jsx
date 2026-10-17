import { Navigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';

// Redirige al login si no hay sesión, y al inicio si la ruta es solo admin y el usuario no lo es
export default function RutaProtegida({ children, soloAdmin = false }) {
  const { usuario, esAdmin } = useAuth();
  if (!usuario) return <Navigate to="/login" replace />;
  if (soloAdmin && !esAdmin) return <Navigate to="/" replace />;
  return children;
}
