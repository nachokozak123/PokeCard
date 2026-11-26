import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import TarjetaProducto from '../components/TarjetaProducto';

// Íconos simples (dibujos propios, sin personajes de la franquicia)
const ICONOS = {
  'Cartas sueltas': <path d="M7 3h10a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Zm5 6.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5Z" />,
  Sobres: <path d="M6 2h12l-1 3 1 3-1 3 1 3-1 3 1 3-1 2H6l1-2-1-3 1-3-1-3 1-3-1-3 1-3-1-3Zm4 8h4" />,
  Mazos: <path d="M8 2h11v16H8zM5 5v16h11M8 7h11" />,
  Accesorios: <path d="M12 2 4 5v6c0 5 3.4 9.4 8 11 4.6-1.6 8-6 8-11V5l-8-3Zm-3 10 2 2 4-4" />,
};

export default function Home() {
  const [categorias, setCategorias] = useState([]);
  const [destacados, setDestacados] = useState([]);

  useEffect(() => {
    api('/categorias').then(setCategorias).catch(() => {});
    api('/productos?orden=precio_desc&limite=4').then(setDestacados).catch(() => {});
  }, []);

  return (
    <main>
      <section className="hero">
        <div className="contenedor hero-interior">
          <div>
            <span className="etiqueta">Tienda para coleccionistas</span>
            <h1>Cartas únicas,<br /><span className="texto-acento">compras seguras.</span></h1>
            <p>Productos seleccionados, autenticidad verificada y una experiencia pensada para coleccionistas.</p>
            <div className="hero-acciones">
              <Link to="/catalogo" className="btn btn-rojo btn-grande">Ver catálogo</Link>
              <Link to="/registro" className="btn btn-borde btn-grande">Crear cuenta</Link>
            </div>
            <ul className="hero-garantias">
              <li>✓ Autenticidad verificada</li>
              <li>✓ Envío gratis</li>
              <li>✓ Pago protegido</li>
            </ul>
          </div>
          <div className="hero-arte" aria-hidden="true">
            <div className="carta-flotante carta-1" />
            <div className="carta-flotante carta-2" />
            <div className="hero-logo"><img src="/logo.png" alt="" /></div>
          </div>
        </div>
      </section>

      <section className="contenedor">
        <div className="seccion-titulo">
          <h2>Categorías</h2>
          <Link to="/catalogo">Ver todo →</Link>
        </div>
        <div className="grilla-4">
          {categorias.map((c) => (
            <Link key={c.id} to={`/catalogo?categoria=${c.id}`} className="categoria-card">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" aria-hidden="true">
                {ICONOS[c.nombre] || ICONOS['Cartas sueltas']}
              </svg>
              <span>{c.nombre}</span>
            </Link>
          ))}
        </div>

        {destacados.length > 0 && (
          <>
            <div className="seccion-titulo">
              <h2>Destacadas</h2>
              <Link to="/catalogo?orden=precio_desc">Ver más →</Link>
            </div>
            <div className="grilla-productos">
              {destacados.map((p) => <TarjetaProducto key={p.id} p={p} />)}
            </div>
          </>
        )}

        <div className="grilla-3 beneficios">
          <div className="beneficio"><span>01</span><h3>Autenticidad verificada</h3><p>Cada carta se revisa antes de venderse.</p></div>
          <div className="beneficio"><span>02</span><h3>Productos seleccionados</h3><p>Un catálogo curado, sin relleno.</p></div>
          <div className="beneficio"><span>03</span><h3>Pensado para coleccionistas</h3><p>Buscá y filtrá por colección y rareza.</p></div>
        </div>
      </section>
    </main>
  );
}
