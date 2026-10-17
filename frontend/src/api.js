export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// Wrapper de fetch: agrega el token JWT guardado y lanza un Error con el mensaje de la API
export async function api(ruta, { method = 'GET', body } = {}) {
  const token = localStorage.getItem('token');
  const res = await fetch(API_URL + ruta, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Error en la solicitud');
  return data;
}

export const precio = (n) => '$' + Number(n).toLocaleString('es-AR');
