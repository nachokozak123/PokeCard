import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="contenedor footer-interior">
        <div>
          <strong className="footer-marca">PokeCard</strong>
          <p>Cartas únicas, compras seguras.</p>
        </div>
        <nav aria-label="Tienda">
          <h4>Tienda</h4>
          <Link to="/catalogo">Catálogo</Link>
          <Link to="/carrito">Carrito</Link>
          <Link to="/pedidos">Mis pedidos</Link>
        </nav>
        <div>
          <h4>Compra segura</h4>
          <p>Pagos cifrados. No guardamos los datos de tu tarjeta.</p>
          <p>Cada carta se verifica antes de enviarse.</p>
        </div>
      </div>
      <div className="footer-pie">© {new Date().getFullYear()} PokeCard · Proyecto académico. Pokémon es marca de sus respectivos dueños; PokeCard no está afiliada a ellos.</div>
    </footer>
  );
}
