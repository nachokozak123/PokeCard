export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// Wrapper de fetch: agrega el token JWT guardado y lanza un Error con el mensaje de la API
export async function api(ruta, { method = 'GET', body, headers: extra } = {}) {
  const token = localStorage.getItem('token');
  let res;
  try {
    res = await fetch(API_URL + ruta, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...extra,
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error('No pudimos conectarnos con el servidor. Revisá tu conexión e intentá de nuevo.');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    // Token vencido o inválido con una sesión abierta: se avisa para cerrar la sesión (ver AuthContext)
    if (res.status === 401 && token && !ruta.startsWith('/usuarios/login')) {
      window.dispatchEvent(new Event('sesion-vencida'));
    }
    throw new Error(data.error || 'Error en la solicitud');
  }
  // Para la paginación: el backend informa el total en esta cabecera
  const total = res.headers.get('X-Total-Count');
  if (total !== null && Array.isArray(data)) Object.defineProperty(data, 'total', { value: Number(total) });
  return data;
}

export const precio = (n) => '$' + Number(n).toLocaleString('es-AR');
