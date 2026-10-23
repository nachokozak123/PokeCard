import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../api';
import TarjetaProducto from '../components/TarjetaProducto';

export default function Catalogo() {
  const [params] = useSearchParams();
  const [categorias, setCategorias] = useState([]);
  const [opciones, setOpciones] = useState({ colecciones: [], rarezas: [] });
  const [productos, setProductos] = useState([]);
  const [error, setError] = useState('');
  const [filtros, setFiltros] = useState({
    categoria: params.get('categoria') ? [params.get('categoria')] : [],
    coleccion: [],
    rareza: [],
    orden: 'precio_asc',
  });

  useEffect(() => {
    api('/categorias').then(setCategorias).catch(() => {});
    api('/productos/filtros').then(setOpciones).catch(() => {});
  }, []);

  useEffect(() => {
    const qs = new URLSearchParams();
    ['categoria', 'coleccion', 'rareza'].forEach((k) => filtros[k].length && qs.set(k, filtros[k].join(',')));
    qs.set('orden', filtros.orden);
    api('/productos?' + qs.toString()).then(setProductos).catch((e) => setError(e.message));
  }, [filtros]);

  function alternar(campo, valor) {
    const v = String(valor);
    setFiltros((f) => ({
      ...f,
      [campo]: f[campo].includes(v) ? f[campo].filter((x) => x !== v) : [...f[campo], v],
    }));
  }

const Grupo = ({ titulo, campo, items }) => (
  <div className="filtro-grupo">
    <h4>{titulo}</h4>
    <div className="filtro-chips">
      {items.map(([valor, texto]) => {
        const activo = filtros[campo].includes(String(valor));
        return (
          <button
            key={valor}
            type="button"
            className={`chip ${activo ? 'chip-activo' : ''}`}
            onClick={() => alternar(campo, valor)}
          >
            {texto}
          </button>
        );
      })}
    </div>
  </div>
);
  return (
    <main className="contenedor catalogo">
      <aside className="filtros">
        <h3>Filtros</h3>
        <Grupo titulo="Categoría" campo="categoria" items={categorias.map((c) => [c.id, c.nombre])} />
        <Grupo titulo="Colección" campo="coleccion" items={opciones.colecciones.map((c) => [c, c])} />
        <Grupo titulo="Rareza" campo="rareza" items={opciones.rarezas.map((r) => [r, r])} />
      </aside>

      <section>
        <div className="catalogo-cabecera">
          <h1>Catálogo</h1>
          <label className="orden">Ordenar por
            <select value={filtros.orden} onChange={(e) => setFiltros({ ...filtros, orden: e.target.value })}>
              <option value="precio_asc">Precio: menor a mayor</option>
              <option value="precio_desc">Precio: mayor a menor</option>
              <option value="nombre">Nombre</option>
            </select>
          </label>
        </div>
        {error && <p className="error">{error}</p>}
        {!error && productos.length === 0 && <p>No hay productos con esos filtros.</p>}
        <div className="grilla-productos">
          {productos.map((p) => <TarjetaProducto key={p.id} p={p} />)}
        </div>
      </section>
    </main>
  );
}
