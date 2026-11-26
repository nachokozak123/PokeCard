import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../api';
import TarjetaProducto from '../components/TarjetaProducto';

const VACIOS = { categoria: [], coleccion: [], rareza: [] };

export default function Catalogo() {
  const [params] = useSearchParams();
  const [categorias, setCategorias] = useState([]);
  const [opciones, setOpciones] = useState({ colecciones: [], rarezas: [] });
  const [productos, setProductos] = useState(null); // null = cargando
  const [error, setError] = useState('');
  const [verFiltros, setVerFiltros] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [q, setQ] = useState('');
  const [orden, setOrden] = useState(params.get('orden') || 'precio_asc');
  const [filtros, setFiltros] = useState({ ...VACIOS, categoria: params.get('categoria') ? [params.get('categoria')] : [] });

  useEffect(() => {
    api('/categorias').then(setCategorias).catch(() => {});
    api('/productos/filtros').then(setOpciones).catch(() => {});
  }, []);

  // Espera a que el usuario deje de escribir (300 ms) antes de buscar
  useEffect(() => {
    const t = setTimeout(() => setQ(busqueda.trim()), 300);
    return () => clearTimeout(t);
  }, [busqueda]);

  useEffect(() => {
    const qs = new URLSearchParams({ orden });
    Object.entries(filtros).forEach(([k, v]) => v.length && qs.set(k, v.join(',')));
    if (q) qs.set('q', q);
    let vigente = true;
    setError('');
    api('/productos?' + qs).then((r) => vigente && setProductos(r)).catch((e) => vigente && setError(e.message));
    return () => { vigente = false; }; // ignora respuestas viejas si el filtro cambió
  }, [filtros, orden, q]);

  function alternar(campo, valor) {
    const v = String(valor);
    setFiltros((f) => ({ ...f, [campo]: f[campo].includes(v) ? f[campo].filter((x) => x !== v) : [...f[campo], v] }));
  }

  const cantidadFiltros = Object.values(filtros).flat().length;
  const grupo = (titulo, campo, items) => (
    <div className="filtro-grupo">
      <h4>{titulo}</h4>
      <div className="filtro-chips">
        {items.map(([valor, texto]) => (
          <button key={valor} type="button" aria-pressed={filtros[campo].includes(String(valor))}
            className={`chip ${filtros[campo].includes(String(valor)) ? 'chip-activo' : ''}`}
            onClick={() => alternar(campo, valor)}>
            {texto}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <main className="contenedor catalogo">
      <aside className={`filtros ${verFiltros ? 'abierto' : ''}`}>
        <div className="filtros-cabecera">
          <h3>Filtros</h3>
          {cantidadFiltros > 0 && <button className="link-boton" onClick={() => setFiltros(VACIOS)}>Limpiar</button>}
        </div>
        {grupo('Categoría', 'categoria', categorias.map((c) => [c.id, c.nombre]))}
        {grupo('Colección', 'coleccion', opciones.colecciones.map((c) => [c, c]))}
        {grupo('Rareza', 'rareza', opciones.rarezas.map((r) => [r, r]))}
      </aside>

      <section>
        <div className="catalogo-cabecera">
          <div>
            <h1>Catálogo</h1>
            {productos && <p className="nota">{productos.length} {productos.length === 1 ? 'producto' : 'productos'}</p>}
          </div>
          <div className="catalogo-controles">
            <input type="search" className="buscador" placeholder="Buscar cartas…" aria-label="Buscar"
              value={busqueda} onChange={(e) => setBusqueda(e.target.value)} maxLength={60} />
            <select value={orden} onChange={(e) => setOrden(e.target.value)} aria-label="Ordenar">
              <option value="precio_asc">Precio: menor a mayor</option>
              <option value="precio_desc">Precio: mayor a menor</option>
              <option value="nombre">Nombre</option>
              <option value="nuevos">Más nuevos</option>
            </select>
            <button className="btn btn-borde solo-movil" onClick={() => setVerFiltros(!verFiltros)}>
              Filtros{cantidadFiltros > 0 && ` (${cantidadFiltros})`}
            </button>
          </div>
        </div>

        {error && <p className="error">{error}</p>}
        {!productos && !error && (
          <div className="grilla-productos">{[1, 2, 3, 4, 5, 6].map((i) => <div key={i} className="esqueleto" />)}</div>
        )}
        {productos?.length === 0 && (
          <div className="vacio">
            <p>No hay productos con esos filtros.</p>
            <button className="btn btn-borde" onClick={() => { setFiltros(VACIOS); setBusqueda(''); }}>Ver todo</button>
          </div>
        )}
        {productos?.length > 0 && (
          <div className="grilla-productos">{productos.map((p) => <TarjetaProducto key={p.id} p={p} />)}</div>
        )}
      </section>
    </main>
  );
}
