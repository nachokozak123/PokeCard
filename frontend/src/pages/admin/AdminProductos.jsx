import { useEffect, useState } from 'react';
import { api, precio } from '../../api';

const VACIO = { nombre: '', descripcion: '', precio: '', stock: '', coleccion: '', rareza: '', imagen: '', categoria_id: '', proveedor_id: '' };

export default function AdminProductos() {
  const [productos, setProductos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [proveedores, setProveedores] = useState([]);
  const [form, setForm] = useState(null);      // null = formulario cerrado
  const [editandoId, setEditandoId] = useState(null);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');

  const cargar = () => api('/productos').then(setProductos).catch((e) => setError(e.message));

  useEffect(() => {
    cargar();
    api('/categorias').then(setCategorias).catch(() => {});
    api('/proveedores').then(setProveedores).catch(() => {});
  }, []);

  const cambiar = (campo) => (e) => setForm({ ...form, [campo]: e.target.value });

  function nuevo() { setForm(VACIO); setEditandoId(null); setError(''); setOk(''); }
  function editar(p) {
    setForm({
      nombre: p.nombre, descripcion: p.descripcion || '', precio: p.precio, stock: p.stock,
      coleccion: p.coleccion || '', rareza: p.rareza || '', imagen: p.imagen || '',
      categoria_id: p.categoria_id, proveedor_id: p.proveedor_id || '',
    });
    setEditandoId(p.id); setError(''); setOk('');
  }

  async function guardar(e) {
    e.preventDefault();
    setError(''); setOk('');
    try {
      if (editandoId) await api(`/productos/${editandoId}`, { method: 'PUT', body: form });
      else await api('/productos', { method: 'POST', body: form });
      setOk(editandoId ? 'Producto actualizado' : 'Producto creado');
      setForm(null);
      cargar();
    } catch (err) { setError(err.message); }
  }

  async function eliminar(p) {
    if (!window.confirm(`¿Eliminar "${p.nombre}"?`)) return;
    setError(''); setOk('');
    try {
      await api(`/productos/${p.id}`, { method: 'DELETE' });
      setOk('Producto eliminado');
      cargar();
    } catch (err) { setError(err.message); }
  }

  return (
    <>
      <div className="barra-acciones">
        <h2>Productos</h2>
        <button className="btn btn-rojo" onClick={nuevo}>+ Nuevo producto</button>
      </div>
      {error && <p className="error">{error}</p>}
      {ok && <p className="exito">{ok}</p>}

      {form && (
        <form className="panel form-producto" onSubmit={guardar}>
          <h3>{editandoId ? 'Editar producto' : 'Nuevo producto'}</h3>
          <div className="grilla-form">
            <label>Nombre *<input value={form.nombre} onChange={cambiar('nombre')} required /></label>
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
            <label>Colección<input value={form.coleccion} onChange={cambiar('coleccion')} /></label>
            <label>Rareza<input value={form.rareza} onChange={cambiar('rareza')} /></label>
            <label>URL de la imagen<input value={form.imagen} onChange={cambiar('imagen')} /></label>
          </div>
          <label>Descripción<textarea rows="3" value={form.descripcion} onChange={cambiar('descripcion')} /></label>
          <div className="barra-acciones">
            <button className="btn btn-rojo">Guardar</button>
            <button type="button" className="btn btn-morado" onClick={() => setForm(null)}>Cancelar</button>
          </div>
        </form>
      )}

      <div className="tabla-scroll panel">
        <table>
          <thead><tr><th>Nombre</th><th>Categoría</th><th>Precio</th><th>Stock</th><th></th></tr></thead>
          <tbody>
            {productos.map((p) => (
              <tr key={p.id}>
                <td>{p.nombre}</td><td>{p.categoria}</td>
                <td className="precio">{precio(p.precio)}</td><td>{p.stock}</td>
                <td className="acciones">
                  <button className="btn btn-morado btn-chico" onClick={() => editar(p)}>Editar</button>
                  <button className="btn btn-rojo btn-chico" onClick={() => eliminar(p)}>Eliminar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
