import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, precio, fecha } from '../api';

// Etiqueta de color según el estado (también la usa el panel admin)
export function EstadoPedido({ estado }) {
  return <span className={`estado estado-${estado}`}>{estado}</span>;
}

export default function MisPedidos() {
  const [pedidos, setPedidos] = useState(null);
  const [error, setError] = useState('');
  const [abierto, setAbierto] = useState(null);

  useEffect(() => { api('/pedidos/mios').then(setPedidos).catch((e) => setError(e.message)); }, []);

  return (
    <main className="contenedor">
      <h1>Mis pedidos</h1>
      {error && <p className="error">{error}</p>}
      {!pedidos && !error && <div className="esqueleto bajo" />}
      {pedidos?.length === 0 && (
        <div className="vacio">
          <p>Todavía no hiciste ninguna compra.</p>
          <Link to="/catalogo" className="btn btn-rojo">Ver catálogo</Link>
        </div>
      )}
      <div className="lista-pedidos">
        {pedidos?.map((p) => (
          <article key={p.id} className="pedido">
            <button className="pedido-cabecera" onClick={() => setAbierto(abierto === p.id ? null : p.id)} aria-expanded={abierto === p.id}>
              <span><b>#{String(p.id).padStart(6, '0')}</b><small className="nota">{fecha(p.fecha)}</small></span>
              <EstadoPedido estado={p.estado} />
              <strong className="precio">{precio(p.total)}</strong>
              <span className="flecha">{abierto === p.id ? '▴' : '▾'}</span>
            </button>
            {abierto === p.id && (
              <div className="pedido-detalle">
                {p.items.map((i, n) => (
                  <div key={n} className="resumen-fila"><span>{i.cantidad} × {i.nombre}</span><span>{precio(i.cantidad * i.precio_unitario)}</span></div>
                ))}
                {p.tarjeta_ultimos4 && <p className="nota chica">Pagado con tarjeta terminada en {p.tarjeta_ultimos4} · Comprobante PAY-{String(p.id).padStart(6, '0')}</p>}
              </div>
            )}
          </article>
        ))}
      </div>
    </main>
  );
}
