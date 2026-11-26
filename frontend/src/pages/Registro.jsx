import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { PanelMarca } from './Login';
import { validarRegistro } from '../validaciones';

export default function Registro() {
  const { registro } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ nombre: '', email: '', password: '' });
  const [error, setError] = useState('');
  const cambiar = (campo) => (e) => setForm({ ...form, [campo]: e.target.value });

  async function enviar(e) {
    e.preventDefault();
    setError('');
    const invalido = validarRegistro(form);
    if (invalido) return setError(invalido);
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
          <label>Nombre<input autoComplete="name" maxLength={100} value={form.nombre} onChange={cambiar('nombre')} required /></label>
          <label>Email<input type="email" autoComplete="email" value={form.email} onChange={cambiar('email')} required /></label>
          <label>Contraseña
            <input type="password" minLength={8} maxLength={72} autoComplete="new-password" value={form.password} onChange={cambiar('password')} required aria-describedby="ayuda-pass" />
            <small id="ayuda-pass" className="ayuda">Mínimo 8 caracteres, con letras y números.</small>
          </label>
          {error && <p className="error" role="alert">{error}</p>}
          <button className="btn btn-rojo btn-grande btn-block">Registrarme</button>
          <p className="auth-alt">¿Ya tenés cuenta? <Link to="/login">Ingresá</Link></p>
        </form>
      </div>
    </main>
  );
}
