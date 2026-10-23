import { useEffect, useState } from 'react';
import { api, precio } from '../api';

export default function MisPedidos() {
  const [pedidos, setPedidos] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => { api('/pedidos/mios').then(setPedidos).catch((e) => setError(e.message)); }, []);

  return (
    <main className="contenedor">
      <h1>Mis pedidos</h1>
      {error && <p className="error">{error}</p>}
      {!pedidos && !error && <p>Cargando…</p>}
      {pedidos?.length === 0 && <p>Todavía no hiciste ninguna compra.</p>}
      {pedidos?.length > 0 && (
        <div className="tabla-scroll">
          <table>
            <thead><tr><th>N.º</th><th>Fecha</th><th>Estado</th><th>Total</th></tr></thead>
            <tbody>
              {pedidos.map((p) => (
                <tr key={p.id}>
                  <td>#{p.id}</td>
                  <td>{new Date(p.fecha).toLocaleDateString('es-AR')}</td>
                  <td>{p.estado}</td>
                  <td>{precio(p.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
