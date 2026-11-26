import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, precio } from '../api';
import { useCarrito } from '../CarritoContext';
import { ImagenProducto } from '../components/TarjetaProducto';

export default function DetalleProducto() {
  const { id } = useParams();
  const [p, setP] = useState(null);
  const [error, setError] = useState('');
  const [cantidad, setCantidad] = useState(1);
  const { agregar, enCarrito } = useCarrito();

  useEffect(() => {
    setP(null); setError(''); setCantidad(1);
    api(`/productos/${id}`).then(setP).catch((e) => setError(e.message));
  }, [id]);

  if (error) {
    return (
      <main className="contenedor vacio">
        <p className="error">{error}</p>
        <Link to="/catalogo" className="btn btn-borde">Volver al catálogo</Link>
      </main>
    );
  }
  if (!p) return <main className="contenedor"><div className="detalle"><div className="esqueleto alto" /><div className="esqueleto alto" /></div></main>;

  const disponible = p.stock - enCarrito(p.id); // lo que todavía se puede agregar

  return (
    <main className="contenedor">
      <p className="migas">
        <Link to="/catalogo">Catálogo</Link> / <Link to={`/catalogo?categoria=${p.categoria_id}`}>{p.categoria}</Link> / {p.nombre}
      </p>
      <div className="detalle">
        <ImagenProducto p={p} className="detalle-img" />
        <div>
          {(p.rareza || p.coleccion) && <span className="chip chip-detalle">{[p.rareza, p.coleccion].filter(Boolean).join(' · ')}</span>}
          <h1>{p.nombre}</h1>
          <p className="precio precio-grande">{precio(p.precio)}</p>
          {p.descripcion && <p className="descripcion">{p.descripcion}</p>}
          <dl className="datos">
            <dt>Categoría</dt><dd>{p.categoria}</dd>
            {p.coleccion && <><dt>Colección</dt><dd>{p.coleccion}</dd></>}
            {p.rareza && <><dt>Rareza</dt><dd>{p.rareza}</dd></>}
            <dt>Disponibilidad</dt>
            <dd className={p.stock < 1 ? 'texto-rojo' : p.stock <= 3 ? 'texto-alerta' : 'texto-ok'}>
              {p.stock < 1 ? 'Sin stock' : p.stock <= 3 ? `¡Quedan ${p.stock}!` : `${p.stock} unidades`}
            </dd>
          </dl>

          {disponible > 0 ? (
            <div className="comprar">
              <Cantidad valor={cantidad} max={disponible} onChange={setCantidad} />
              <button className="btn btn-rojo btn-grande" onClick={() => { agregar(p, cantidad); setCantidad(1); }}>
                Agregar al carrito
              </button>
            </div>
          ) : (
            <button className="btn btn-rojo btn-grande btn-block" disabled>
              {p.stock < 1 ? 'Sin stock' : 'Ya tenés todo el stock en el carrito'}
            </button>
          )}
          <p className="aviso">🛡️ Autenticidad verificada · Envío gratis · Cartas únicas, compras seguras</p>
        </div>
      </div>
    </main>
  );
}

// Selector − / + (también lo usa el carrito)
export function Cantidad({ valor, max, onChange }) {
  return (
    <div className="cantidad" role="group" aria-label="Cantidad">
      <button type="button" onClick={() => onChange(Math.max(1, valor - 1))} disabled={valor <= 1} aria-label="Menos">−</button>
      <span>{valor}</span>
      <button type="button" onClick={() => onChange(Math.min(max, valor + 1))} disabled={valor >= max} aria-label="Más">+</button>
    </div>
  );
}
