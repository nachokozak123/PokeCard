import { useEffect, useState } from 'react';
import { api, precio } from '../../api';
import { ImagenProducto } from '../../components/TarjetaProducto';

const VACIO = { nombre: '', descripcion: '', precio: '', stock: '', coleccion: '', rareza: '', imagen: '', categoria_id: '', proveedor_id: '', activo: true };

export default function AdminProductos() {
  const [productos, setProductos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [proveedores, setProveedores] = useState([]);
  const [form, setForm] = useState(null); // null = formulario cerrado
  const [editandoId, setEditandoId] = useState(null);
  const [buscar, setBuscar] = useState('');
  const [mensaje, setMensaje] = useState({ tipo: '', texto: '' });

  const cargar = () => api('/admin/productos').then(setProductos).catch((e) => setMensaje({ tipo: 'error', texto: e.message }));

  useEffect(() => {
    cargar();
    api('/categorias').then(setCategorias).catch(() => {});
    api('/proveedores').then(setProveedores).catch(() => {});
  }, []);

  const cambiar = (campo) => (e) => setForm({ ...form, [campo]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });

  function abrir(p) {
    setMensaje({ tipo: '', texto: '' });
    setEditandoId(p?.id || null);
    setForm(p ? Object.fromEntries(Object.keys(VACIO).map((k) => [k, p[k] ?? ''])) : VACIO);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function guardar(e) {
    e.preventDefault();
    try {
      await api(editandoId ? `/productos/${editandoId}` : '/productos', { method: editandoId ? 'PUT' : 'POST', body: form });
      setMensaje({ tipo: 'exito', texto: editandoId ? 'Producto actualizado' : 'Producto creado' });
      setForm(null);
      cargar();
    } catch (err) { setMensaje({ tipo: 'error', texto: err.message }); }
  }

  async function eliminar(p) {
    if (!window.confirm(`¿Eliminar "${p.nombre}"? Si ya se vendió, se archiva en lugar de borrarse.`)) return;
    try {
      const r = await api(`/productos/${p.id}`, { method: 'DELETE' });
      setMensaje({ tipo: 'exito', texto: r.mensaje });
      cargar();
    } catch (err) { setMensaje({ tipo: 'error', texto: err.message }); }
  }

  const visibles = productos.filter((p) => p.nombre.toLowerCase().includes(buscar.toLowerCase()));

  return (
    <>
      <div className="barra-acciones">
        <h2>Productos</h2>
        <div className="barra-acciones">
          <input type="search" placeholder="Buscar…" value={buscar} onChange={(e) => setBuscar(e.target.value)} aria-label="Buscar producto" />
          <button className="btn btn-rojo" onClick={() => abrir(null)}>+ Nuevo producto</button>
        </div>
      </div>
      {mensaje.texto && <p className={mensaje.tipo} role="status">{mensaje.texto}</p>}

      {form && (
        <form className="panel form-producto" onSubmit={guardar}>
          <h3>{editandoId ? 'Editar producto' : 'Nuevo producto'}</h3>
          <div className="grilla-form">
            <label>Nombre *<input value={form.nombre} onChange={cambiar('nombre')} required maxLength={120} /></label>
            <label>Precio *<input type="number" min="0" step="0.01" value={form.precio} onChange={cambiar('precio')} required /></label>
            <label>Stock *<input type="number" min="0" step="1" value={form.stock} onChange={cambiar('stock')} required /></label>
            <label>Categoría *
              <select value={form.categoria_id} onChange={cambiar('categoria_id')} required>
                <option value="">Elegir…</option>
                {categorias.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
            </label>
            <label>Proveedor
              <select value={form.proveedor_id} onChange={cambiar('proveedor_id')}>
                <option value="">Sin proveedor</option>
                {proveedores.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
              </select>
            </label>
            <label>Colección<input value={form.coleccion} onChange={cambiar('coleccion')} maxLength={80} /></label>
            <label>Rareza<input value={form.rareza} onChange={cambiar('rareza')} maxLength={50} /></label>
            <label>Imagen (link https:// o /imagenes/productos/archivo.png)<input value={form.imagen} onChange={cambiar('imagen')} maxLength={500} placeholder="/imagenes/productos/charizard-holo.png" /></label>
          </div>
          <label>Descripción<textarea rows="3" value={form.descripcion} onChange={cambiar('descripcion')} maxLength={2000} /></label>
          <label className="check"><input type="checkbox" checked={form.activo} onChange={cambiar('activo')} /> Visible en la tienda</label>
          <div className="barra-acciones">
            <button className="btn btn-rojo">Guardar</button>
            <button type="button" className="btn btn-borde" onClick={() => setForm(null)}>Cancelar</button>
          </div>
        </form>
      )}

      <div className="tabla-scroll panel">
        <table>
          <thead><tr><th></th><th>Nombre</th><th>Categoría</th><th>Precio</th><th>Stock</th><th>Estado</th><th></th></tr></thead>
          <tbody>
            {visibles.map((p) => (
              <tr key={p.id} className={p.activo ? '' : 'archivado'}>
                <td><ImagenProducto p={p} className="miniatura" /></td>
                <td>{p.nombre}<br /><small className="nota">{[p.rareza, p.coleccion].filter(Boolean).join(' · ')}</small></td>
                <td>{p.categoria}</td>
                <td className="precio">{precio(p.precio)}</td>
                <td className={p.stock <= 5 ? 'texto-alerta' : ''}>{p.stock}</td>
                <td><span className={`estado ${p.activo ? 'estado-pagado' : 'estado-cancelado'}`}>{p.activo ? 'visible' : 'archivado'}</span></td>
                <td className="acciones">
                  <button className="btn btn-morado btn-chico" onClick={() => abrir(p)}>Editar</button>
                  {p.activo && <button className="btn btn-rojo btn-chico" onClick={() => eliminar(p)}>Eliminar</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {visibles.length === 0 && <p className="nota">No hay productos.</p>}
      </div>
    </>
  );
}
