import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';

export function PanelMarca() {
  return (
    <div className="auth-marca">
      <img src="/logo.png" alt="" />
      <h2>PokeCard</h2>
      <p>Cartas únicas, compras seguras.</p>
    </div>
  );
}

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  async function enviar(e) {
    e.preventDefault();
    setError('');
    try {
      const u = await login(email, password);
      navigate(u.rol === 'admin' ? '/admin' : '/');
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <main className="auth">
      <PanelMarca />
      <div className="auth-form-wrap">
        <form className="auth-form" onSubmit={enviar}>
          <h1>Ingresar</h1>
          <label>Email<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></label>
          <label>Contraseña<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required /></label>
          {error && <p className="error">{error}</p>}
          <button className="btn btn-rojo btn-grande btn-block">Ingresar</button>
          <p className="auth-alt">¿No tenés cuenta? <Link to="/registro">Registrate</Link></p>
        </form>
      </div>
    </main>
  );
}
