import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { PanelMarca } from './Login';

export default function Registro() {
  const { registro } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ nombre: '', email: '', password: '' });
  const [error, setError] = useState('');
  const cambiar = (campo) => (e) => setForm({ ...form, [campo]: e.target.value });

  async function enviar(e) {
    e.preventDefault();
    setError('');
    try {
      await registro(form.nombre, form.email, form.password);
      navigate('/');
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <main className="auth">
      <PanelMarca />
      <div className="auth-form-wrap">
        <form className="auth-form" onSubmit={enviar}>
          <h1>Crear cuenta</h1>
          <label>Nombre<input value={form.nombre} onChange={cambiar('nombre')} required /></label>
          <label>Email<input type="email" value={form.email} onChange={cambiar('email')} required /></label>
          <label>Contraseña<input type="password" minLength={6} value={form.password} onChange={cambiar('password')} required /></label>
          {error && <p className="error">{error}</p>}
          <button className="btn btn-rojo btn-grande btn-block">Registrarme</button>
          <p className="auth-alt">¿Ya tenés cuenta? <Link to="/login">Ingresá</Link></p>
        </form>
      </div>
    </main>
  );
}
