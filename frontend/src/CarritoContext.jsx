import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useAuth } from './AuthContext';
import { detalleProducto } from './api';

const CarritoContext = createContext(null);
export const useCarrito = () => useContext(CarritoContext);

// Cada usuario tiene su carrito guardado en el navegador (solo productos y cantidades, nada sensible)
const claveCarrito = (usuario) => (usuario ? `carrito_${usuario.id}` : 'carrito_invitado');

function leerCarrito(clave) {
  try {
    const items = JSON.parse(localStorage.getItem(clave));
    return Array.isArray(items) ? items : [];
  } catch {
    return [];
  }
}

export function CarritoProvider({ children }) {
  const { usuario } = useAuth();
  const clave = claveCarrito(usuario);
  const [carrito, setCarrito] = useState(() => ({ clave, items: leerCarrito(clave) }));
  const [aviso, setAviso] = useState('');
  const temporizador = useRef();

  // Si cambia el usuario (login / logout) se carga su carrito.
  // Lo que se agregó sin sesión se suma al carrito de la cuenta al ingresar.
  if (carrito.clave !== clave) {
    let nuevos = leerCarrito(clave);
    if (carrito.clave === 'carrito_invitado' && usuario) {
      for (const inv of carrito.items) {
        const ya = nuevos.find((i) => i.id === inv.id);
        nuevos = ya
          ? nuevos.map((i) => (i.id === inv.id ? { ...i, cantidad: Math.min(i.cantidad + inv.cantidad, inv.stock) } : i))
          : [...nuevos, inv];
      }
      localStorage.removeItem('carrito_invitado');
    }
    setCarrito({ clave, items: nuevos });
  }

  useEffect(() => {
    localStorage.setItem(carrito.clave, JSON.stringify(carrito.items));
  }, [carrito]);

  const items = carrito.items;
  const setItems = (cambio) => setCarrito((c) => ({ ...c, items: cambio(c.items) }));

  function mostrarAviso(texto) {
    setAviso(texto);
    clearTimeout(temporizador.current);
    temporizador.current = setTimeout(() => setAviso(''), 2500);
  }

  function agregar(p, cantidad = 1) {
    setItems((prev) => {
      const existe = prev.find((i) => i.id === p.id);
      const nueva = Math.min((existe?.cantidad || 0) + cantidad, p.stock);
      if (existe) return prev.map((i) => (i.id === p.id ? { ...i, cantidad: nueva, stock: p.stock, precio: p.precio } : i));
      return [...prev, { id: p.id, nombre: p.nombre, precio: p.precio, imagen: p.imagen, stock: p.stock, detalle: detalleProducto(p), cantidad: nueva }];
    });
    mostrarAviso(`"${p.nombre}" se agregó al carrito`);
  }

  const cambiarCantidad = (id, cantidad) =>
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, cantidad: Math.max(1, Math.min(cantidad, i.stock)) } : i)));
  const quitar = (id) => setItems((prev) => prev.filter((i) => i.id !== id));
  const vaciar = () => setItems(() => []);
  const enCarrito = (id) => items.find((i) => i.id === id)?.cantidad || 0;

  const cantidadTotal = items.reduce((s, i) => s + i.cantidad, 0);
  const subtotal = items.reduce((s, i) => s + i.precio * i.cantidad, 0);

  return (
    <CarritoContext.Provider value={{ items, agregar, cambiarCantidad, quitar, vaciar, enCarrito, cantidadTotal, subtotal, aviso }}>
      {children}
    </CarritoContext.Provider>
  );
}
