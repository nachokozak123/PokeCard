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
  const [cargando, setCargando] = useState(true);
  const [total, setTotal] = useState(0);
  const [busqueda, setBusqueda] = useState('');
  const [q, setQ] = useState('');
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

  // Espera a que el usuario deje de escribir para no pedir datos en cada letra
  useEffect(() => {
    const t = setTimeout(() => setQ(busqueda.trim()), 350);
    return () => clearTimeout(t);
  }, [busqueda]);

  useEffect(() => {
    let vigente = true; // ignora respuestas viejas si los filtros cambiaron mientras tanto
    setCargando(true);
    const qs = new URLSearchParams();
    if (q) qs.set('q', q);
    ['categoria', 'coleccion', 'rareza'].forEach((k) => filtros[k].length && qs.set(k, filtros[k].join(',')));
    qs.set('orden', filtros.orden);
    api('/productos?' + qs.toString())
      .then((r) => { if (vigente) { setProductos(r); setTotal(r.total ?? r.length); setError(''); } })
      .catch((e) => vigente && setError(e.message))
      .finally(() => vigente && setCargando(false));
    return () => { vigente = false; };
  }, [filtros, q]);

  const hayFiltros = q || filtros.categoria.length || filtros.coleccion.length || filtros.rareza.length;
  const limpiar = () => { setBusqueda(''); setFiltros((f) => ({ ...f, categoria: [], coleccion: [], rareza: [] })); };

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
        <label className="buscador">Buscar
          <input type="search" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Nombre de la carta…" maxLength={80} />
        </label>
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
        <p className="nota" aria-live="polite">
          {cargando ? 'Buscando…' : `${total} ${total === 1 ? 'producto' : 'productos'}`}
          {hayFiltros && !cargando && <> · <button type="button" className="link-boton" onClick={limpiar}>Limpiar filtros</button></>}
        </p>
        {error && <p className="error" role="alert">{error}</p>}
        {!error && !cargando && productos.length === 0 && (
          <div className="vacio"><p>No encontramos cartas con esos filtros.</p>
            <button type="button" className="btn btn-morado" onClick={limpiar}>Ver todo el catálogo</button></div>
        )}
        <div className={`grilla-productos ${cargando ? 'cargando' : ''}`}>
          {productos.map((p) => <TarjetaProducto key={p.id} p={p} />)}
        </div>
      </section>
    </main>
  );
}
