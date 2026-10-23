import { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';

const CarritoContext = createContext(null);
export const useCarrito = () => useContext(CarritoContext);

function claveCarrito(usuario) {
  return usuario ? `carrito_${usuario.id}` : 'carrito_invitado';
}

export function CarritoProvider({ children }) {
  const { usuario } = useAuth();
  const [items, setItems] = useState([]);

  // Cuando cambia el usuario, carga su carrito
  useEffect(() => {
    try {
      const guardado = JSON.parse(localStorage.getItem(claveCarrito(usuario))) || [];
      setItems(guardado);
    } catch {
      setItems([]);
    }
  }, [usuario?.id]);

  // Guarda el carrito del usuario actual
  useEffect(() => {
    localStorage.setItem(claveCarrito(usuario), JSON.stringify(items));
  }, [items, usuario?.id]);

  function agregar(p, cantidad = 1) {
    setItems((prev) => {
      const existe = prev.find((i) => i.id === p.id);
      const nuevaCant = Math.min((existe?.cantidad || 0) + cantidad, p.stock);
      if (existe) return prev.map((i) => (i.id === p.id ? { ...i, cantidad: nuevaCant, stock: p.stock } : i));
      return [...prev, {
        id: p.id, nombre: p.nombre, precio: Number(p.precio), imagen: p.imagen, stock: p.stock,
        detalle: [p.rareza, p.coleccion].filter(Boolean).join(' · ') || p.categoria, cantidad: nuevaCant,
      }];
    });
  }

  const cambiarCantidad = (id, cantidad) =>
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, cantidad: Math.max(1, Math.min(cantidad, i.stock)) } : i)));
  const quitar = (id) => setItems((prev) => prev.filter((i) => i.id !== id));
  const vaciar = () => setItems([]);

  const cantidadTotal = items.reduce((s, i) => s + i.cantidad, 0);
  const subtotal = items.reduce((s, i) => s + i.precio * i.cantidad, 0);

  return (
    <CarritoContext.Provider value={{ items, agregar, cambiarCantidad, quitar, vaciar, cantidadTotal, subtotal }}>
      {children}
    </CarritoContext.Provider>
  );
}