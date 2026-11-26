import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { PanelMarca } from './Login';
import { validarRegistro, fuerzaPassword } from '../validaciones';

const NIVELES = ['Muy débil', 'Débil', 'Aceptable', 'Fuerte'];

export default function Registro() {
  const { registro } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ nombre: '', email: '', password: '', confirmar: '' });
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);
  const cambiar = (campo) => (e) => setForm({ ...form, [campo]: e.target.value });
  const fuerza = fuerzaPassword(form.password);

  async function enviar(e) {
    e.preventDefault();
    setError('');
    const invalido = validarRegistro(form);
    if (invalido) return setError(invalido);
    setEnviando(true);
    try {
      await registro(form.nombre.trim(), form.email.trim(), form.password);
      navigate('/');
    } catch (err) {
      setError(err.message);
      setEnviando(false);
    }
  }

  return (
    <main className="auth">
      <PanelMarca />
      <div className="auth-form-wrap">
        <form className="auth-form" onSubmit={enviar} noValidate>
          <h1>Crear cuenta</h1>
          <label>Nombre<input autoComplete="name" value={form.nombre} onChange={cambiar('nombre')} maxLength={100} /></label>
          <label>Email<input type="email" autoComplete="email" value={form.email} onChange={cambiar('email')} maxLength={150} /></label>
          <label>Contraseña
            <input type="password" autoComplete="new-password" value={form.password} onChange={cambiar('password')} maxLength={72} />
            {form.password && (
              <span className={`fuerza fuerza-${fuerza}`}><i /><small>{NIVELES[fuerza]}</small></span>
            )}
            <small className="nota">Mínimo 8 caracteres, con letras y números.</small>
          </label>
          <label>Repetir contraseña
            <input type="password" autoComplete="new-password" value={form.confirmar} onChange={cambiar('confirmar')} maxLength={72} />
          </label>
          {error && <p className="error" role="alert">{error}</p>}
          <button className="btn btn-rojo btn-grande btn-block" disabled={enviando}>{enviando ? 'Creando cuenta…' : 'Registrarme'}</button>
          <p className="auth-alt">¿Ya tenés cuenta? <Link to="/login">Ingresá</Link></p>
        </form>
      </div>
    </main>
  );
}
