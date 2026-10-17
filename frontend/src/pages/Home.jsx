import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';

export default function Home() {
  const [categorias, setCategorias] = useState([]);
  useEffect(() => { api('/categorias').then(setCategorias).catch(() => {}); }, []);

  return (
    <main>
      <section className="hero">
        <div className="contenedor hero-interior">
          <div>
            <h1>Cartas únicas,<br />compras seguras.</h1>
            <p>Productos seleccionados, autenticidad verificada y una experiencia pensada para coleccionistas.</p>
            <Link to="/catalogo" className="btn btn-rojo btn-grande">Ver catálogo</Link>
          </div>
          <div className="hero-logo"><img src="/logo.png" alt="PokeCard" /></div>
        </div>
      </section>

      <section className="contenedor">
        <h2>Categorías</h2>
        <div className="grilla-4">
          {categorias.map((c) => (
            <Link key={c.id} to={`/catalogo?categoria=${c.id}`} className="categoria-card">{c.nombre}</Link>
          ))}
        </div>

        <div className="grilla-3 beneficios">
          <div className="beneficio"><h3>Autenticidad verificada</h3><p>Cada carta se revisa antes de venderse.</p></div>
          <div className="beneficio"><h3>Productos seleccionados</h3><p>Un catálogo curado, sin relleno.</p></div>
          <div className="beneficio"><h3>Pensado para coleccionistas</h3><p>Filtros por colección y rareza.</p></div>
        </div>
      </section>
    </main>
  );
}
