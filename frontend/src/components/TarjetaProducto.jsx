import { Link } from 'react-router-dom';
import { precio, detalleProducto } from '../api';
import { useCarrito } from '../CarritoContext';

// Imagen del producto o, si no tiene, un marco de carta con el isotipo
export function ImagenProducto({ p, className = '' }) {
  return (
    <div className={`producto-img ${className}`}>
      {p.imagen
        ? <img src={p.imagen} alt={p.nombre} loading="lazy" referrerPolicy="no-referrer" />
        : <div className="carta-vacia"><img src="/logo.png" alt="" /><span>{p.categoria || 'PokeCard'}</span></div>}
    </div>
  );
}

export default function TarjetaProducto({ p }) {
  const { agregar, enCarrito } = useCarrito();
  const sinStock = p.stock < 1;
  const tope = enCarrito(p.id) >= p.stock;

  return (
    <article className="tarjeta-producto">
      <Link to={`/producto/${p.id}`} className="tarjeta-link" aria-label={p.nombre}>
        <ImagenProducto p={p} />
        {p.rareza && <span className={`insignia ${p.rareza.toLowerCase().includes('holo') ? 'insignia-holo' : ''}`}>{p.rareza}</span>}
        {!sinStock && p.stock <= 3 && <span className="insignia insignia-stock">¡Últimas {p.stock}!</span>}
      </Link>
      <div className="producto-info">
        <small>{detalleProducto(p)}</small>
        <h3><Link to={`/producto/${p.id}`}>{p.nombre}</Link></h3>
        <div className="producto-pie">
          <strong className="precio">{precio(p.precio)}</strong>
          <button className="btn btn-rojo btn-chico" disabled={sinStock || tope} onClick={() => agregar(p)}>
            {sinStock ? 'Sin stock' : tope ? 'Máximo' : 'Agregar'}
          </button>
        </div>
      </div>
    </article>
  );
}
