import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, precio } from '../api';
import { useCarrito } from '../CarritoContext';

export default function DetalleProducto() {
  const { id } = useParams();
  const [p, setP] = useState(null);
  const [error, setError] = useState('');
  const [agregado, setAgregado] = useState(false);
  const { agregar } = useCarrito();

  useEffect(() => { api(`/productos/${id}`).then(setP).catch((e) => setError(e.message)); }, [id]);

  if (error) return <main className="contenedor"><p className="error">{error}</p></main>;
  if (!p) return <main className="contenedor"><p>Cargando…</p></main>;

  return (
    <main className="contenedor">
      <p className="migas">
        <Link to="/catalogo">Catálogo</Link> / {p.categoria} / {p.nombre}
      </p>
      <div className="detalle">
        <div className="detalle-img">
          {p.imagen ? <img src={p.imagen} alt={p.nombre} /> : <span>Imagen de la carta</span>}
        </div>
        <div>
          {(p.rareza || p.coleccion) && <span className="chip">{[p.rareza, p.coleccion].filter(Boolean).join(' · ')}</span>}
          <h1>{p.nombre}</h1>
          <p className="precio precio-grande">{precio(p.precio)}</p>
          <p>{p.descripcion}</p>
          <dl className="datos">
            <dt>Categoría</dt><dd>{p.categoria}</dd>
            {p.coleccion && <><dt>Colección</dt><dd>{p.coleccion}</dd></>}
            {p.rareza && <><dt>Rareza</dt><dd>{p.rareza}</dd></>}
            <dt>Stock</dt><dd>{p.stock > 0 ? `${p.stock} unidades` : 'Sin stock'}</dd>
          </dl>
          <button className="btn btn-rojo btn-grande btn-block" disabled={p.stock < 1}
            onClick={() => { agregar(p); setAgregado(true); }}>
            {p.stock < 1 ? 'Sin stock' : 'Agregar al carrito'}
          </button>
          {agregado && <p className="exito">Agregado. <Link to="/carrito">Ver carrito</Link></p>}
          <p className="aviso">Autenticidad verificada · Cartas únicas, compras seguras</p>
        </div>
      </div>
    </main>
  );
}
