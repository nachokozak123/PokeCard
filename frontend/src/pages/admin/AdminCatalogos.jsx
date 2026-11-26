import { useEffect, useState } from 'react';
import { api } from '../../api';

// Pantalla de categorías y proveedores (los dos usan el mismo componente)
export default function AdminCatalogos() {
  return (
    <div className="grilla-2">
      <Tabla titulo="Categorías" ruta="/categorias" campos={[['nombre', 'Nombre', 80]]} />
      <Tabla titulo="Proveedores" ruta="/proveedores" campos={[['nombre', 'Nombre', 100], ['contacto', 'Contacto', 150]]} />
    </div>
  );
}

function Tabla({ titulo, ruta, campos }) {
  const vacio = Object.fromEntries(campos.map(([c]) => [c, '']));
  const [filas, setFilas] = useState([]);
  const [form, setForm] = useState(vacio);
  const [editandoId, setEditandoId] = useState(null);
  const [mensaje, setMensaje] = useState({ tipo: '', texto: '' });

  const cargar = () => api(ruta).then(setFilas).catch((e) => setMensaje({ tipo: 'error', texto: e.message }));
  useEffect(() => { cargar(); }, []);

  async function guardar(e) {
    e.preventDefault();
    try {
      await api(editandoId ? `${ruta}/${editandoId}` : ruta, { method: editandoId ? 'PUT' : 'POST', body: form });
      setMensaje({ tipo: 'exito', texto: editandoId ? 'Cambios guardados' : 'Agregado' });
      setForm(vacio); setEditandoId(null); cargar();
    } catch (err) { setMensaje({ tipo: 'error', texto: err.message }); }
  }

  async function eliminar(f) {
    if (!window.confirm(`¿Eliminar "${f.nombre}"?`)) return;
    try {
      await api(`${ruta}/${f.id}`, { method: 'DELETE' });
      setMensaje({ tipo: 'exito', texto: 'Eliminado' }); cargar();
    } catch (err) { setMensaje({ tipo: 'error', texto: err.message }); }
  }

  return (
    <section className="panel">
      <h3>{titulo}</h3>
      <form className="form-linea" onSubmit={guardar}>
        {campos.map(([c, etiqueta, max]) => (
          <input key={c} placeholder={etiqueta} aria-label={etiqueta} value={form[c] || ''} maxLength={max}
            required={c === 'nombre'} onChange={(e) => setForm({ ...form, [c]: e.target.value })} />
        ))}
        <button className="btn btn-rojo btn-chico">{editandoId ? 'Guardar' : 'Agregar'}</button>
        {editandoId && <button type="button" className="btn btn-borde btn-chico" onClick={() => { setForm(vacio); setEditandoId(null); }}>Cancelar</button>}
      </form>
      {mensaje.texto && <p className={mensaje.tipo} role="status">{mensaje.texto}</p>}
      <table>
        <tbody>
          {filas.map((f) => (
            <tr key={f.id}>
              <td>{f.nombre}{f.contacto && <><br /><small className="nota">{f.contacto}</small></>}</td>
              <td className="acciones">
                <button className="btn btn-morado btn-chico" onClick={() => { setEditandoId(f.id); setForm({ ...vacio, ...f }); }}>Editar</button>
                <button className="btn btn-rojo btn-chico" onClick={() => eliminar(f)}>Eliminar</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
