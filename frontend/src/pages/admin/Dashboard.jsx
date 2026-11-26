import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, precio, fecha } from '../../api';
import { EstadoPedido } from '../MisPedidos';

export default function Dashboard() {
  const [d, setD] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => { api('/admin/dashboard').then(setD).catch((e) => setError(e.message)); }, []);

  if (error) return <p className="error">{error}</p>;
  if (!d) return <div className="grilla-4">{[1, 2, 3, 4].map((i) => <div key={i} className="esqueleto bajo" />)}</div>;

  const maxCat = Math.max(1, ...d.productosPorCategoria.map((c) => c.cantidad));
  const maxDia = Math.max(1, ...d.ventasUltimos7Dias.map((v) => v.total));

  return (
    <>
      <div className="grilla-4">
        <div className="stat"><span>Ventas</span><strong>{precio(d.ventasTotales)}</strong><small>sin contar cancelados</small></div>
        <div className="stat"><span>Pedidos</span><strong>{d.totalPedidos}</strong><small>{d.pedidosPorEnviar} por enviar</small></div>
        <div className="stat"><span>Clientes</span><strong>{d.totalClientes}</strong><small>cuentas registradas</small></div>
        <div className="stat"><span>Productos</span><strong>{d.totalProductos}</strong><small>inventario: {precio(d.valorInventario)}</small></div>
      </div>

      <section className="panel">
        <h3>Ventas de los últimos 7 días</h3>
        <div className="grafico">
          {d.ventasUltimos7Dias.map((v) => (
            <div key={v.dia} className="grafico-col" title={`${v.dia}: ${precio(v.total)}`}>
              <small>{v.total > 0 ? precio(v.total) : ''}</small>
              <div style={{ height: `${Math.max(2, (v.total / maxDia) * 100)}%` }} />
              <span>{v.dia}</span>
            </div>
          ))}
        </div>
      </section>

      <div className="grilla-2">
        <section className="panel">
          <h3>Stock bajo (≤ {d.umbralStockBajo})</h3>
          {d.stockBajo.length === 0 ? <p className="nota">Todo el stock está en orden.</p> : (
            <table>
              <thead><tr><th>Producto</th><th>Stock</th></tr></thead>
              <tbody>{d.stockBajo.map((p) => (
                <tr key={p.id}><td>{p.nombre}</td><td className={p.stock === 0 ? 'texto-rojo' : 'texto-alerta'}><b>{p.stock}</b></td></tr>
              ))}</tbody>
            </table>
          )}
        </section>

        <section className="panel">
          <h3>Productos por categoría</h3>
          {d.productosPorCategoria.map((c) => (
            <div key={c.categoria} className="barra-fila">
              <span>{c.categoria}</span>
              <div className="barra"><div style={{ width: `${(c.cantidad / maxCat) * 100}%` }} /></div>
              <b>{c.cantidad}</b>
            </div>
          ))}
        </section>
      </div>

      <section className="panel">
        <div className="barra-acciones"><h3>Últimos pedidos</h3><Link to="/admin/pedidos">Ver todos →</Link></div>
        {d.ultimosPedidos.length === 0 ? <p className="nota">Todavía no hay pedidos.</p> : (
          <div className="tabla-scroll">
            <table>
              <thead><tr><th>N.º</th><th>Fecha</th><th>Cliente</th><th>Estado</th><th>Total</th></tr></thead>
              <tbody>{d.ultimosPedidos.map((p) => (
                <tr key={p.id}><td>#{p.id}</td><td>{fecha(p.fecha)}</td><td>{p.cliente}</td>
                  <td><EstadoPedido estado={p.estado} /></td><td className="precio">{precio(p.total)}</td></tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
