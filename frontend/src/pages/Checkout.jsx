import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card } from 'crd-ui/react';
import 'crd-ui/styles.css';
import { api, precio } from '../api';
import { useCarrito } from '../CarritoContext';
import { validarTarjeta } from '../validaciones';

export default function Checkout() {
  const { items, subtotal, vaciar } = useCarrito();
  const [form, setForm] = useState({ number: '', name: '', expiry: '', cvc: '' });
  const [focused, setFocused] = useState(null);
  const [errores, setErrores] = useState({});
  const [pagando, setPagando] = useState(false);
  const [error, setError] = useState('');
  const [recibo, setRecibo] = useState(null);

  if (recibo) {
    return (
      <main className="contenedor checkout-ok">
        <div className="sello-ok">✓</div>
        <h1>¡Pago aprobado!</h1>
        <p className="comprobante">Comprobante <b>{recibo.comprobante}</b></p>
        <p>Pagaste <b>{precio(recibo.total)}</b> con la tarjeta terminada en <b>{recibo.tarjeta_ultimos4}</b>.</p>
        <p className="aviso">Este pago es una simulación: no se realizó ningún cobro real.</p>
        <div className="hero-acciones">
          <Link to="/pedidos" className="btn btn-rojo">Ver mis pedidos</Link>
          <Link to="/catalogo" className="btn btn-borde">Seguir comprando</Link>
        </div>
      </main>
    );
  }

  if (items.length === 0) {
    return (
      <main className="contenedor vacio">
        <h1>Pago</h1>
        <p>Tu carrito está vacío.</p>
        <Link to="/catalogo" className="btn btn-rojo">Ver catálogo</Link>
      </main>
    );
  }

  // Da formato mientras se escribe
  const set = (campo) => (e) => {
    let v = e.target.value;
    if (campo === 'number') v = v.replace(/\D/g, '').slice(0, 19).replace(/(.{4})/g, '$1 ').trim();
    if (campo === 'name') v = v.replace(/[^\p{L} .'-]/gu, '').toUpperCase().slice(0, 40);
    if (campo === 'expiry') {
      v = v.replace(/\D/g, '').slice(0, 4);
      if (v.length > 2) v = v.slice(0, 2) + '/' + v.slice(2);
    }
    if (campo === 'cvc') v = v.replace(/\D/g, '').slice(0, 4);
    setForm({ ...form, [campo]: v });
    if (errores[campo]) setErrores({ ...errores, [campo]: undefined });
  };

  async function pagar(e) {
    e.preventDefault();
    setError('');
    const encontrados = validarTarjeta(form);
    setErrores(encontrados);
    if (Object.keys(encontrados).length) return;

    setPagando(true);
    try {
      const r = await api('/pedidos', {
        method: 'POST',
        body: {
          items: items.map((i) => ({ producto_id: i.id, cantidad: i.cantidad })),
          tarjeta: { numero: form.number, nombre: form.name, vencimiento: form.expiry, cvc: form.cvc },
        },
      });
      setForm({ number: '', name: '', expiry: '', cvc: '' }); // no dejar los datos de la tarjeta en memoria
      vaciar();
      setRecibo(r);
    } catch (err) {
      setError(err.message);
    } finally {
      setPagando(false);
    }
  }

  const campo = (etiqueta, nombre, props = {}) => (
    <label>
      {etiqueta}
      <input value={form[nombre]} onChange={set(nombre)} disabled={pagando} aria-invalid={!!errores[nombre]}
        onFocus={() => setFocused(nombre)} onBlur={() => setFocused((f) => (f === nombre ? null : f))} {...props} />
      {errores[nombre] && <small className="error">{errores[nombre]}</small>}
    </label>
  );

  return (
    <main className="contenedor">
      <h1>Pago</h1>
      <div className="carrito">
        <form className="checkout-form panel" onSubmit={pagar} noValidate>
          <Card number={form.number} name={form.name} expiry={form.expiry} cvc={form.cvc}
            focused={focused} variant="graphite" tilt
            placeholders={{ name: 'NOMBRE COMPLETO' }} locale={{ validThru: 'válida hasta' }} />
          {campo('Número de tarjeta', 'number', { inputMode: 'numeric', autoComplete: 'cc-number', placeholder: '4111 1111 1111 1111' })}
          {campo('Nombre del titular', 'name', { autoComplete: 'cc-name' })}
          <div className="grilla-2">
            {campo('Vencimiento', 'expiry', { placeholder: 'MM/AA', inputMode: 'numeric', autoComplete: 'cc-exp' })}
            {campo('Código de seguridad', 'cvc', { inputMode: 'numeric', autoComplete: 'cc-csc', type: 'password' })}
          </div>
          {error && <p className="error" role="alert">{error}</p>}
          <button className="btn btn-rojo btn-grande btn-block" disabled={pagando}>
            {pagando ? 'Procesando pago…' : `Pagar ${precio(subtotal)}`}
          </button>
          <p className="aviso">
            🔒 Pago simulado: usá <b>4111 1111 1111 1111</b> con cualquier fecha futura. Si la tarjeta
            termina en <b>0002</b>, el pago se rechaza. El número completo nunca se guarda.
          </p>
        </form>

        <aside className="resumen">
          <h2>Tu compra</h2>
          {items.map((i) => (
            <div key={i.id} className="resumen-fila"><span>{i.cantidad} × {i.nombre}</span><span>{precio(i.precio * i.cantidad)}</span></div>
          ))}
          <div className="resumen-fila"><span>Envío</span><span className="texto-ok">Gratis</span></div>
          <div className="resumen-fila resumen-total"><span>Total</span><span>{precio(subtotal)}</span></div>
          <p className="nota chica">El total final lo calcula el servidor con los precios vigentes.</p>
        </aside>
      </div>
    </main>
  );
}
