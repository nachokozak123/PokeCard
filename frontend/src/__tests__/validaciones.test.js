// Tests de las validaciones del checkout y del registro
import { describe, test, expect } from 'vitest';
import { luhn, vencimientoOk, validarTarjeta, validarRegistro } from '../validaciones';

const hoy = new Date(2026, 10, 6); // 6 de noviembre de 2026
const tarjetaOk = { number: '4111 1111 1111 1111', name: 'ASH KETCHUM', expiry: '12/30', cvc: '123' };

describe('luhn', () => {
  test('acepta números válidos', () => {
    expect(luhn('4111 1111 1111 1111')).toBe(true);
    expect(luhn('4000 0000 0000 0002')).toBe(true); // la de pago rechazado también es válida
  });
  test('rechaza números mal escritos o cortos', () => {
    expect(luhn('1234 5678 9012 3456')).toBe(false);
    expect(luhn('4111')).toBe(false);
  });
});

describe('vencimientoOk', () => {
  test('el mes actual todavía vale', () => expect(vencimientoOk('11/26', hoy)).toBe(true));
  test('una fecha futura vale', () => expect(vencimientoOk('01/27', hoy)).toBe(true));
  test('el mes pasado está vencido', () => expect(vencimientoOk('10/26', hoy)).toBe(false));
  test('el mes 13 no existe', () => expect(vencimientoOk('13/30', hoy)).toBe(false));
  test('el formato tiene que ser MM/AA', () => expect(vencimientoOk('1230', hoy)).toBe(false));
});

describe('validarTarjeta', () => {
  test('una tarjeta correcta no tiene errores', () => {
    expect(validarTarjeta(tarjetaOk)).toEqual({});
  });
  test('marca cada campo inválido', () => {
    const e = validarTarjeta({ number: '1234 5678 9012 3456', name: 'A', expiry: '01/20', cvc: '1' });
    expect(Object.keys(e).sort()).toEqual(['cvc', 'expiry', 'name', 'number']);
  });
});

describe('validarRegistro', () => {
  test('datos correctos', () => {
    expect(validarRegistro({ nombre: 'Misty', email: 'misty@mail.com', password: 'starmie' })).toBeNull();
  });
  test('email inválido', () => {
    expect(validarRegistro({ nombre: 'Misty', email: 'misty@', password: 'starmie' })).toMatch(/email/);
  });
  test('contraseña corta', () => {
    expect(validarRegistro({ nombre: 'Misty', email: 'misty@mail.com', password: '123' })).toMatch(/6/);
  });
});
