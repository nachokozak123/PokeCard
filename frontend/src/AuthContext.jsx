import { createContext, useContext, useEffect, useState } from 'react';
import { api } from './api';

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [cargando, setCargando] = useState(true); // mientras se consulta si hay sesión abierta

  useEffect(() => {
    // Al abrir la página se pregunta al servidor si la cookie de sesión sigue siendo válida
    api('/usuarios/yo').then(setUsuario).catch(() => setUsuario(null)).finally(() => setCargando(false));
    const vencida = () => setUsuario(null);
    window.addEventListener('sesion-vencida', vencida);
    return () => window.removeEventListener('sesion-vencida', vencida);
  }, []);

  async function login(email, password) {
    const u = await api('/usuarios/login', { method: 'POST', body: { email, password } });
    setUsuario(u);
    return u;
  }

  async function registro(nombre, email, password) {
    const u = await api('/usuarios/registro', { method: 'POST', body: { nombre, email, password } });
    setUsuario(u);
    return u;
  }

  async function logout() {
    await api('/usuarios/logout', { method: 'POST' }).catch(() => {});
    setUsuario(null);
  }

  return (
    <AuthContext.Provider value={{ usuario, cargando, login, registro, logout, esAdmin: usuario?.rol === 'admin' }}>
      {children}
    </AuthContext.Provider>
  );
}
