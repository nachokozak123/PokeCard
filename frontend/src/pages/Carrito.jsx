import { Link, useNavigate } from 'react-router-dom';
import { useCarrito } from '../CarritoContext';
import { useAuth } from '../AuthContext';
import { precio } from '../api';

export default function Carrito() {
  const { items, cambiarCantidad, quitar, subtotal } = useCarrito();
  const { usuario } = useAuth();
  const navigate = useNavigate();

  if (items.length === 0) {
    return (
      <main className="contenedor">
        <h1>Tu carrito</h1>
        <p>Todavía no agregaste cartas.</p>
        <Link to="/catalogo" className="btn btn-rojo">Ver catálogo</Link>
      </main>
    );
  }

  return (
    <main className="contenedor">
      <h1>Tu carrito</h1>
      <div className="carrito">
        <div>
          {items.map((i) => (
            <article key={i.id} className="carrito-item">
              <div className="producto-img carrito-img">
                {i.imagen ? <img src={i.imagen} alt={i.nombre} /> : <span>Imagen</span>}
              </div>
              <div>
                <h3>{i.nombre}</h3>
                <small className="carrito-detalle">{i.detalle}</small>
                <div><button className="link-boton" onClick={() => quitar(i.id)}>Quitar</button></div>
              </div>
              <label className="carrito-cant">
                Cant.
                <input type="number" min="1" max={i.stock} value={i.cantidad}
                  onChange={(e) => cambiarCantidad(i.id, Number(e.target.value) || 1)} />
              </label>
              <strong className="precio">{precio(i.precio * i.cantidad)}</strong>
            </article>
          ))}
        </div>

        <aside className="resumen">
          <h2>Resumen</h2>
          <div className="resumen-fila"><span>Subtotal</span><span>{precio(subtotal)}</span></div>
          <div className="resumen-fila"><span>Envío</span><span>Gratis</span></div>
          <div className="resumen-fila resumen-total"><span>Total</span><span>{precio(subtotal)}</span></div>
          <button className="btn btn-rojo btn-grande btn-block"
            onClick={() => navigate(usuario ? '/checkout' : '/login')}>
            {usuario ? 'Finalizar compra' : 'Ingresá para comprar'}
          </button>
          <Link to="/catalogo" className="resumen-seguir">Seguir comprando</Link>
        </aside>
      </div>
    </main>
  );
}
