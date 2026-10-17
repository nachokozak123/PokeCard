import { Link } from 'react-router-dom';
import { precio } from '../api';

export default function TarjetaProducto({ p }) {
  return (
    <article className="tarjeta-producto">
      <div className="producto-img">
        {p.imagen ? <img src={p.imagen} alt={p.nombre} /> : <span>Imagen de la carta</span>}
      </div>
      <div className="producto-info">
        <small>{[p.rareza, p.coleccion].filter(Boolean).join(' · ') || p.categoria}</small>
        <h3>{p.nombre}</h3>
        <div className="producto-pie">
          <strong className="precio">{precio(p.precio)}</strong>
          <Link to={`/producto/${p.id}`} className="btn btn-rojo btn-chico">Ver</Link>
        </div>
      </div>
    </article>
  );
}
