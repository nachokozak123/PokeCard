// Validaciones de la tarjeta (las mismas reglas se vuelven a validar en el backend)

// Algoritmo de Luhn: detecta números de tarjeta mal escritos
export const luhn = (num) => {
  const d = String(num).replace(/\D/g, '');
  if (d.length < 13) return false;
  let suma = 0;
  [...d].reverse().forEach((c, i) => {
    let n = Number(c);
    if (i % 2 === 1) { n *= 2; if (n > 9) n -= 9; }
    suma += n;
  });
  return suma % 10 === 0;
};

// "MM/AA": la tarjeta vale hasta el último día de ese mes
export const vencimientoOk = (exp, hoy = new Date()) => {
  const m = String(exp).match(/^(\d{2})\/(\d{2})$/);
  if (!m) return false;
  const mes = Number(m[1]);
  const anio = 2000 + Number(m[2]);
  if (mes < 1 || mes > 12) return false;
  return anio > hoy.getFullYear() || (anio === hoy.getFullYear() && mes >= hoy.getMonth() + 1);
};

// Devuelve un objeto { campo: mensaje } con los errores encontrados (vacío si está todo bien)
export const validarTarjeta = (f) => {
  const e = {};
  const digitos = f.number.replace(/\D/g, '');
  if (digitos.length < 13 || digitos.length > 19 || !luhn(digitos)) e.number = 'El número de tarjeta no es válido.';
  if (f.name.trim().length < 3) e.name = 'Ingresá el nombre como figura en la tarjeta.';
  if (!vencimientoOk(f.expiry)) e.expiry = 'La fecha no es válida o la tarjeta está vencida.';
  if (!/^\d{3,4}$/.test(f.cvc)) e.cvc = 'Debe tener 3 o 4 dígitos.';
  return e;
};

export const validarRegistro = ({ nombre, email, password }) => {
  if (!nombre.trim()) return 'El nombre es obligatorio.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'El email no es válido.';
  return validarPassword(password);
};

// Mismas reglas que el backend: 8 a 72 caracteres, con letras y números
export const validarPassword = (p) => {
  if (p.length < 8) return 'La contraseña debe tener al menos 8 caracteres.';
  if (p.length > 72) return 'La contraseña no puede superar los 72 caracteres.';
  if (!/[A-Za-z]/.test(p) || !/\d/.test(p)) return 'La contraseña debe incluir letras y números.';
  return null;
};

// Datos de envío del checkout. Devuelve { campo: mensaje } (vacío si está todo bien)
export const validarEnvio = (f) => {
  const e = {};
  if (f.nombre.trim().length < 3) e.nombre = 'Ingresá nombre y apellido de quien recibe.';
  if (f.direccion.trim().length < 5) e.direccion = 'Ingresá calle y número.';
  if (f.ciudad.trim().length < 2) e.ciudad = 'Ingresá la ciudad.';
  if (f.provincia.trim().length < 2) e.provincia = 'Ingresá la provincia.';
  if (!/^[A-Za-z0-9 -]{4,10}$/.test(f.cp.trim())) e.cp = 'Código postal no válido.';
  if (!/^[\d+() -]{6,30}$/.test(f.telefono.trim())) e.telefono = 'Teléfono no válido (solo números, +, - y paréntesis).';
  return e;
};
