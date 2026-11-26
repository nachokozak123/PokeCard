import { createContext, useContext, useEffect, useState } from 'react';
import { api } from './api';

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(() => {
    try { return JSON.parse(localStorage.getItem('usuario')); } catch { return null; }
  });

  async function login(email, password) {
    const data = await api('/usuarios/login', { method: 'POST', body: { email, password } });
    localStorage.setItem('token', data.token);
    localStorage.setItem('usuario', JSON.stringify(data.usuario));
    setUsuario(data.usuario);
    return data.usuario;
  }

  async function registro(nombre, email, password) {
    await api('/usuarios/registro', { method: 'POST', body: { nombre, email, password } });
    return login(email, password); // después de registrarse, inicia sesión
  }

  function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    setUsuario(null);
  }

  // Si la API responde 401 con una sesión abierta (token vencido), se cierra la sesión
  useEffect(() => {
    const vencida = () => { logout(); window.alert('Tu sesión venció. Ingresá de nuevo para continuar.'); };
    window.addEventListener('sesion-vencida', vencida);
    return () => window.removeEventListener('sesion-vencida', vencida);
  }, []);

  return (
    <AuthContext.Provider value={{ usuario, login, registro, logout, esAdmin: usuario?.rol === 'admin' }}>
      {children}
    </AuthContext.Provider>
  );
}
