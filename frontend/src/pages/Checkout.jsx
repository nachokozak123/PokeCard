import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card } from 'crd-ui/react';
import 'crd-ui/styles.css';
import { api, precio } from '../api';
import { useCarrito } from '../CarritoContext';

// ---------- Validaciones (las mismas reglas se vuelven a validar en el backend) ----------
const luhn = (num) => {
  const d = num.replace(/\D/g, '');
  if (d.length < 13) return false;
  let suma = 0;
  [...d].reverse().forEach((c, i) => {
    let n = Number(c);
    if (i % 2 === 1) { n *= 2; if (n > 9) n -= 9; }
    suma += n;
  });
  return suma % 10 === 0;
};
const vencimientoOk = (exp) => {
  const m = exp.match(/^(\d{2})\/(\d{2})$/);
  if (!m) return false;
  const mes = Number(m[1]);
  return mes >= 1 && mes <= 12;
};

const validar = (f) => {
  const e = {};
  const digitos = f.number.replace(/\D/g, '');
  if (digitos.length < 13 || digitos.length > 19) e.number = 'El número de tarjeta no es válido.';
  if (f.name.trim().length < 3) e.name = 'Ingresá el nombre como figura en la tarjeta.';
  if (!vencimientoOk(f.expiry)) e.expiry = 'La fecha no es válida o la tarjeta está vencida.';
  if (!/^\d{3,4}$/.test(f.cvc)) e.cvc = 'Debe tener 3 o 4 dígitos.';
  return e;
};

export default function Checkout() {
  const { items, subtotal, vaciar } = useCarrito();
  const [form, setForm] = useState({ number: '', name: '', expiry: '', cvc: '' });
  const [focused, setFocused] = useState(null);
  const [errores, setErrores] = useState({});
  const [estado, setEstado] = useState('idle'); // idle | pagando | listo
  const [error, setError] = useState('');
  const [recibo, setRecibo] = useState(null);

  if (estado === 'listo') {
    return (
      <main className="contenedor checkout-ok">
        <h1>¡Pago aprobado!</h1>
        <p className="exito">Comprobante {recibo.comprobante}</p>
        <p>Pagaste {precio(recibo.total)} con la tarjeta terminada en {recibo.tarjeta_last4}.</p>
        <p className="aviso">Este pago es una simulación: no se realizó ningún cobro real.</p>
        <Link to="/pedidos" className="btn btn-rojo">Ver mis pedidos</Link>
      </main>
    );
  }

  if (items.length === 0) {
    return (
      <main className="contenedor">
        <h1>Pago</h1>
        <p>Tu carrito está vacío.</p>
        <Link to="/catalogo" className="btn btn-rojo">Ver catálogo</Link>
      </main>
    );
  }
  const set = (campo) => (e) => {
    let v = e.target.value;
    if (campo === 'number') { // solo dígitos, máximo 19, agrupados de a 4
      v = v.replace(/\D/g, '').slice(0, 19).replace(/(.{4})/g, '$1 ').trim();
    }
    if (campo === 'name') { // solo letras
      v = v.replace(/[^\p{L} .'-]/gu, '').toUpperCase();
    }
    if (campo === 'expiry') { // formatea MM/AA mientras escribe
      v = v.replace(/\D/g, '').slice(0, 4);
      if (v.length > 2) v = v.slice(0, 2) + '/' + v.slice(2);
    }
    if (campo === 'cvc') v = v.replace(/\D/g, '').slice(0, 4);
    setForm({ ...form, [campo]: v });
  };

  const foco = (campo) => ({
    onFocus: () => setFocused(campo),
    onBlur: () => setFocused((f) => (f === campo ? null : f)),
  });

  async function pagar(e) {
    e.preventDefault();
    setError('');
    const encontrados = validar(form);
    setErrores(encontrados);
    if (Object.keys(encontrados).length) return;

    setEstado('pagando');
    try {
      const r = await api('/pedidos', {
        method: 'POST',
        body: {
          items: items.map((i) => ({ producto_id: i.id, cantidad: i.cantidad })),
          tarjeta: { numero: form.number, nombre: form.name, vencimiento: form.expiry, cvc: form.cvc },
        },
      });
      vaciar();
      setRecibo(r);
      setEstado('listo');
    } catch (err) {
      setError(err.message);
      setEstado('idle');
    }
  }

  const campo = (etiqueta, nombre, props = {}) => (
    <label>
      {etiqueta}
      <input value={form[nombre]} onChange={set(nombre)} {...foco(nombre)} disabled={estado === 'pagando'} {...props} />
      {errores[nombre] && <small className="error">{errores[nombre]}</small>}
    </label>
  );

  return (
    <main className="contenedor">
      <h1>Pago</h1>
      <div className="carrito">
        <form className="checkout-form" onSubmit={pagar} noValidate>
          <Card
            number={form.number} name={form.name} expiry={form.expiry} cvc={form.cvc}
            focused={focused} variant="graphite" tilt
            placeholders={{ name: 'NOMBRE COMPLETO' }} locale={{ validThru: 'válida hasta' }}
          />
          {campo('Número de tarjeta', 'number', { inputMode: 'numeric', autoComplete: 'cc-number', placeholder: '4111 1111 1111 1111' , maxLength: 23})}
          {campo('Nombre del titular', 'name', { autoComplete: 'cc-name' })}
          <div className="grilla-2">
            {campo('Vencimiento', 'expiry', { placeholder: 'MM/AA', inputMode: 'numeric', autoComplete: 'cc-exp' })}
            {campo('Código de seguridad', 'cvc', { inputMode: 'numeric', autoComplete: 'cc-csc' })}
          </div>
          {error && <p className="error" role="alert">{error}</p>}
          <button className="btn btn-rojo btn-grande btn-block" disabled={estado === 'pagando'}>
            {estado === 'pagando' ? 'Procesando pago…' : `Pagar ${precio(subtotal)}`}
          </button>
          <p className="aviso">
            Pago simulado: usá <b>4111 1111 1111 1111</b> con cualquier fecha futura. Si la tarjeta
            termina en <b>0002</b>, el pago se rechaza.
          </p>
        </form>

        <aside className="resumen">
          <h2>Tu compra</h2>
          {items.map((i) => (
            <div key={i.id} className="resumen-fila"><span>{i.cantidad} × {i.nombre}</span><span>{precio(i.precio * i.cantidad)}</span></div>
          ))}
          <div className="resumen-fila resumen-total"><span>Total</span><span>{precio(subtotal)}</span></div>
        </aside>
      </div>
    </main>
  );
}
