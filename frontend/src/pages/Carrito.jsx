import { Link, useNavigate } from 'react-router-dom';
import { useCarrito } from '../CarritoContext';
import { useAuth } from '../AuthContext';
import { precio } from '../api';
import { ImagenProducto } from '../components/TarjetaProducto';
import { Cantidad } from './DetalleProducto';

export default function Carrito() {
  const { items, cambiarCantidad, quitar, subtotal, cantidadTotal } = useCarrito();
  const { usuario } = useAuth();
  const navigate = useNavigate();

  if (items.length === 0) {
    return (
      <main className="contenedor vacio">
        <h1>Tu carrito está vacío</h1>
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
              <Link to={`/producto/${i.id}`}><ImagenProducto p={i} className="carrito-img" /></Link>
              <div>
                <h3><Link to={`/producto/${i.id}`}>{i.nombre}</Link></h3>
                <small className="nota">{i.detalle}</small>
                <p className="nota">{precio(i.precio)} c/u</p>
                <button className="link-boton" onClick={() => quitar(i.id)}>Quitar</button>
              </div>
              <Cantidad valor={i.cantidad} max={i.stock} onChange={(c) => cambiarCantidad(i.id, c)} />
              <strong className="precio">{precio(i.precio * i.cantidad)}</strong>
            </article>
          ))}
        </div>

        <aside className="resumen">
          <h2>Resumen</h2>
          <div className="resumen-fila"><span>Productos ({cantidadTotal})</span><span>{precio(subtotal)}</span></div>
          <div className="resumen-fila"><span>Envío</span><span className="texto-ok">Gratis</span></div>
          <div className="resumen-fila resumen-total"><span>Total</span><span>{precio(subtotal)}</span></div>
          <button className="btn btn-rojo btn-grande btn-block"
            onClick={() => navigate(usuario ? '/checkout' : '/login', { state: { desde: '/checkout' } })}>
            {usuario ? 'Finalizar compra' : 'Ingresá para comprar'}
          </button>
          <Link to="/catalogo" className="resumen-seguir">Seguir comprando</Link>
        </aside>
      </div>
    </main>
  );
}
