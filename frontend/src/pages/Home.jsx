import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import TarjetaProducto from '../components/TarjetaProducto';

export default function Home() {
  const [categorias, setCategorias] = useState([]);
  const [destacados, setDestacados] = useState([]);
  useEffect(() => {
    api('/categorias').then(setCategorias).catch(() => {});
    api('/productos?destacados=1&limite=4&orden=precio_desc').then(setDestacados).catch(() => {});
  }, []);

  return (
    <main>
      <section className="hero">
        <div className="contenedor hero-interior">
          <div>
            <h1>Cartas únicas,<br />compras seguras.</h1>
            <p>Productos seleccionados, autenticidad verificada y una experiencia pensada para coleccionistas.</p>
            <div className="hero-acciones">
              <Link to="/catalogo" className="btn btn-rojo btn-grande">Ver catálogo</Link>
              <Link to="/catalogo?categoria=2" className="btn btn-morado btn-grande">Sobres y mazos</Link>
            </div>
          </div>
          <div className="hero-logo"><img src="/logo.png" alt="PokeCard" /></div>
        </div>
      </section>

      <section className="franja-confianza" aria-label="Garantías de compra">
        <div className="contenedor franja-interior">
          <span>🔒 Pago protegido</span>
          <span>✅ Autenticidad verificada</span>
          <span>📦 Envíos a todo el país</span>
          <span>↩️ Soporte post-venta</span>
        </div>
      </section>

      <section className="contenedor">
        {destacados.length > 0 && (
          <>
            <div className="seccion-cabecera">
              <h2>Destacados</h2>
              <Link to="/catalogo">Ver todo →</Link>
            </div>
            <div className="grilla-productos">
              {destacados.map((p) => <TarjetaProducto key={p.id} p={p} />)}
            </div>
          </>
        )}

        <h2 className="seccion-titulo">Categorías</h2>
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
