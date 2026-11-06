import { useEffect, useState } from 'react';
import { api, precio } from '../../api';

// Mismos cambios de estado que permite el backend
const SIGUIENTES = {
  pendiente: ['pagado', 'cancelado'],
  pagado: ['enviado', 'cancelado'],
  enviado: [],
  cancelado: [],
};

export default function AdminPedidos() {
  const [pedidos, setPedidos] = useState(null);
  const [filtro, setFiltro] = useState('');
  const [detalle, setDetalle] = useState(null);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');

  const cargar = () => api('/pedidos' + (filtro ? `?estado=${filtro}` : ''))
    .then(setPedidos).catch((e) => setError(e.message));

  useEffect(() => { cargar(); }, [filtro]);

  async function verDetalle(id) {
    setError('');
    try { setDetalle(await api(`/pedidos/${id}`)); } catch (err) { setError(err.message); }
  }

  async function cambiarEstado(p, estado) {
    if (estado === 'cancelado' && !window.confirm(`¿Cancelar el pedido #${p.id}? Se devuelve el stock.`)) return;
    setError(''); setOk('');
    try {
      await api(`/pedidos/${p.id}/estado`, { method: 'PATCH', body: { estado } });
      setOk(`Pedido #${p.id} ahora está ${estado}`);
      if (detalle?.id === p.id) setDetalle(null);
      cargar();
    } catch (err) { setError(err.message); }
  }

  return (
    <>
      <div className="barra-acciones">
        <h2>Pedidos</h2>
        <select value={filtro} onChange={(e) => setFiltro(e.target.value)} aria-label="Filtrar por estado">
          <option value="">Todos los estados</option>
          {Object.keys(SIGUIENTES).map((e) => <option key={e} value={e}>{e}</option>)}
        </select>
      </div>
      {error && <p className="error">{error}</p>}
      {ok && <p className="exito">{ok}</p>}

      {detalle && (
        <div className="panel">
          <div className="barra-acciones">
            <h3>Pedido #{detalle.id}</h3>
            <button className="btn btn-morado btn-chico" onClick={() => setDetalle(null)}>Cerrar</button>
          </div>
          <table>
            <thead><tr><th>Producto</th><th>Cantidad</th><th>Precio unitario</th><th>Subtotal</th></tr></thead>
            <tbody>
              {detalle.items.map((i) => (
                <tr key={i.producto_id}>
                  <td>{i.nombre}</td><td>{i.cantidad}</td>
                  <td>{precio(i.precio_unitario)}</td><td className="precio">{precio(i.precio_unitario * i.cantidad)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!pedidos && !error && <p>Cargando…</p>}
      {pedidos?.length === 0 && <p className="nota">No hay pedidos{filtro && ` en estado "${filtro}"`}.</p>}
      {pedidos?.length > 0 && (
        <div className="tabla-scroll panel">
          <table>
            <thead><tr><th>N.º</th><th>Fecha</th><th>Cliente</th><th>Total</th><th>Estado</th><th></th></tr></thead>
            <tbody>
              {pedidos.map((p) => (
                <tr key={p.id}>
                  <td>#{p.id}</td>
                  <td>{new Date(p.fecha).toLocaleDateString('es-AR')}</td>
                  <td>{p.cliente}<br /><small className="nota">{p.email}</small></td>
                  <td className="precio">{precio(p.total)}</td>
                  <td>{p.estado}</td>
                  <td className="acciones">
                    <button className="btn btn-morado btn-chico" onClick={() => verDetalle(p.id)}>Ver</button>
                    {SIGUIENTES[p.estado].map((e) => (
                      <button key={e} className={`btn btn-chico ${e === 'cancelado' ? 'btn-rojo' : 'btn-morado'}`}
                        onClick={() => cambiarEstado(p, e)}>
                        {e === 'cancelado' ? 'Cancelar' : `Marcar ${e}`}
                      </button>
                    ))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
