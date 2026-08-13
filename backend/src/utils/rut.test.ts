import { describe, it, expect } from 'vitest';
import { validateRut, formatRut } from './rut.js';

describe('validateRut', () => {
  it('acepta RUTs válidos conocidos', () => {
    expect(validateRut('11.111.111-1')).toBe(true);
    expect(validateRut('15482664-5')).toBe(true);
  });

  it('acepta RUT con dígito verificador K', () => {
    // 7.897.432-K es un RUT sintético válido
    expect(validateRut('7897432-K')).toBe(true);
    expect(validateRut('7897432-k')).toBe(true); // insensible a mayúsculas
  });

  it('rechaza dígito verificador incorrecto', () => {
    expect(validateRut('11.111.111-2')).toBe(false);
  });

  it('rechaza formatos con cuerpo demasiado corto', () => {
    expect(validateRut('123-4')).toBe(false);
  });

  it('rechaza cuerpos no numéricos', () => {
    expect(validateRut('ABCDEFGH-9')).toBe(false);
  });

  it('funciona sin puntos ni guión', () => {
    expect(validateRut('111111111')).toBe(true);
  });
});

describe('formatRut', () => {
  it('formatea un RUT sin puntos a formato con puntos y guión', () => {
    expect(formatRut('111111111')).toBe('11.111.111-1');
  });
});
