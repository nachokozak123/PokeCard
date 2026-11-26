import { useState } from 'react';
import { Link } from 'react-router-dom';
import { precio } from '../api';
import { useCarrito } from '../CarritoContext';

// Etiqueta de disponibilidad: ayuda a decidir y genera confianza
export function EstadoStock({ stock }) {
  if (stock < 1) return <span className="badge badge-agotado">Sin stock</span>;
  if (stock <= 3) return <span className="badge badge-ultimas">¡Últimas {stock}!</span>;
  return null;
}

export default function TarjetaProducto({ p }) {
  const { agregar } = useCarrito();
  const [ok, setOk] = useState(false);

  function comprar() {
    agregar(p);
    setOk(true);
    setTimeout(() => setOk(false), 1800);
  }

  return (
    <article className="tarjeta-producto">
      <Link to={`/producto/${p.id}`} className="producto-img" aria-label={`Ver ${p.nombre}`}>
        {p.imagen ? <img src={p.imagen} alt={p.nombre} loading="lazy" /> : <span>Imagen de la carta</span>}
        <EstadoStock stock={p.stock} />
      </Link>
      <div className="producto-info">
        <small>{[p.rareza, p.coleccion].filter(Boolean).join(' · ') || p.categoria}</small>
        <h3>{p.nombre}</h3>
        <div className="producto-pie">
          <strong className="precio">{precio(p.precio)}</strong>
          <div className="producto-acciones">
            <Link to={`/producto/${p.id}`} className="btn btn-morado btn-chico">Ver</Link>
            <button type="button" className="btn btn-rojo btn-chico" disabled={p.stock < 1} onClick={comprar}
              aria-label={`Agregar ${p.nombre} al carrito`}>
              {ok ? '¡Listo!' : 'Agregar'}
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}
