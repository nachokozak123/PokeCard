import { useEffect, useState } from 'react';
import { api, precio } from '../../api';

export default function Dashboard() {
  const [d, setD] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => { api('/admin/dashboard').then(setD).catch((e) => setError(e.message)); }, []);

  if (error) return <p className="error">{error}</p>;
  if (!d) return <p>Cargando…</p>;

  const maxCat = Math.max(1, ...d.productosPorCategoria.map((c) => c.cantidad));

  return (
    <>
      <div className="grilla-4">
        <div className="stat"><span>Productos</span><strong>{d.totalProductos}</strong></div>
        <div className="stat"><span>Clientes</span><strong>{d.totalClientes}</strong></div>
        <div className="stat"><span>Pedidos</span><strong>{d.totalPedidos}</strong></div>
        <div className="stat"><span>Ventas</span><strong>{precio(d.ventasTotales)}</strong></div>
      </div>
      <p className="nota">Valor del inventario: <strong>{precio(d.valorInventario)}</strong></p>

      <div className="grilla-2">
        <section className="panel">
          <h3>Stock bajo (≤ {d.umbralStockBajo})</h3>
          {d.stockBajo.length === 0 ? <p>Todo el stock está en orden.</p> : (
            <table><thead><tr><th>Producto</th><th>Stock</th></tr></thead>
              <tbody>{d.stockBajo.map((p) => <tr key={p.id}><td>{p.nombre}</td><td className="precio">{p.stock}</td></tr>)}</tbody>
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
        <h3>Últimos usuarios registrados</h3>
        <div className="tabla-scroll">
          <table><thead><tr><th>Nombre</th><th>Email</th><th>Rol</th><th>Alta</th></tr></thead>
            <tbody>{d.ultimosUsuarios.map((u) => (
              <tr key={u.id}><td>{u.nombre}</td><td>{u.email}</td><td>{u.rol}</td>
                <td>{new Date(u.creado_en).toLocaleDateString('es-AR')}</td></tr>
            ))}</tbody>
          </table>
        </div>
      </section>
    </>
  );
}
