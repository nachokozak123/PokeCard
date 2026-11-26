import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';

// Panel izquierdo con la marca (lo usa también Registro)
export function PanelMarca() {
  return (
    <div className="auth-marca">
      <img src="/logo.png" alt="" />
      <h2>PokeCard</h2>
      <p>Cartas únicas, compras seguras.</p>
      <ul>
        <li>✓ Tus pedidos siempre a mano</li>
        <li>✓ Carrito guardado en tu cuenta</li>
        <li>✓ Contraseñas encriptadas y sesión protegida</li>
      </ul>
    </div>
  );
}

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);

  async function enviar(e) {
    e.preventDefault();
    setError('');
    setEnviando(true);
    try {
      const u = await login(form.email, form.password);
      navigate(location.state?.desde || (u.rol === 'admin' ? '/admin' : '/'), { replace: true });
    } catch (err) {
      setError(err.message);
      setEnviando(false);
    }
  }

  return (
    <main className="auth">
      <PanelMarca />
      <div className="auth-form-wrap">
        <form className="auth-form" onSubmit={enviar}>
          <h1>Ingresar</h1>
          <p className="nota">Qué bueno verte de nuevo.</p>
          <label>Email
            <input type="email" autoComplete="email" value={form.email} required
              onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </label>
          <label>Contraseña
            <input type="password" autoComplete="current-password" value={form.password} required
              onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </label>
          {error && <p className="error" role="alert">{error}</p>}
          <button className="btn btn-rojo btn-grande btn-block" disabled={enviando}>{enviando ? 'Ingresando…' : 'Ingresar'}</button>
          <p className="auth-alt">¿No tenés cuenta? <Link to="/registro">Registrate</Link></p>
        </form>
      </div>
    </main>
  );
}
