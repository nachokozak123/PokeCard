// Cliente de la API. La sesión viaja en una cookie httpOnly que pone el servidor:
// el frontend nunca ve ni guarda el token.
export async function api(ruta, { method = 'GET', body } = {}) {
  let res;
  try {
    res = await fetch('/api' + ruta, {
      method,
      credentials: 'same-origin',
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error('No se pudo conectar con el servidor');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    // Si la sesión venció en medio de una acción, AuthContext se entera y cierra la sesión
    if (res.status === 401) window.dispatchEvent(new Event('sesion-vencida'));
    throw new Error(data.error || 'Error en la solicitud');
  }
  return data;
}

export const precio = (n) => '$' + Number(n).toLocaleString('es-AR', { maximumFractionDigits: 2 });
export const fecha = (f) => new Date(f).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
export const detalleProducto = (p) => [p.rareza, p.coleccion].filter(Boolean).join(' · ') || p.categoria;
