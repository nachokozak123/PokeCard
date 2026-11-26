// Validaciones de formularios. El backend vuelve a validar todo: estas son para avisar antes.

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

// Devuelve { campo: mensaje } con los errores de la tarjeta (vacío si está todo bien)
export const validarTarjeta = (f) => {
  const e = {};
  const digitos = f.number.replace(/\D/g, '');
  if (digitos.length < 13 || digitos.length > 19 || !luhn(digitos)) e.number = 'El número de tarjeta no es válido.';
  if (f.name.trim().length < 3) e.name = 'Ingresá el nombre como figura en la tarjeta.';
  if (!vencimientoOk(f.expiry)) e.expiry = 'La fecha no es válida o la tarjeta está vencida.';
  if (!/^\d{3,4}$/.test(f.cvc)) e.cvc = 'Debe tener 3 o 4 dígitos.';
  return e;
};

// Mismas reglas que el backend para crear una cuenta
export const validarRegistro = ({ nombre, email, password, confirmar }) => {
  if (nombre.trim().length < 2) return 'Ingresá tu nombre.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) return 'El email no es válido.';
  if (password.length < 8) return 'La contraseña debe tener al menos 8 caracteres.';
  if (!/[a-zA-Z]/.test(password) || !/\d/.test(password)) return 'La contraseña debe tener letras y números.';
  if (password !== confirmar) return 'Las contraseñas no coinciden.';
  return null;
};

// Nivel de la contraseña de 0 a 3, para la barrita del registro
export const fuerzaPassword = (p) =>
  [p.length >= 8, /[a-zA-Z]/.test(p) && /\d/.test(p), p.length >= 12 || /[^a-zA-Z0-9]/.test(p)].filter(Boolean).length;
