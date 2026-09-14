import { describe, expect, it } from 'vitest';

function normalizeCardName(value: unknown) {
  return String(value ?? '')
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .toUpperCase();
}

describe('card management safety rules', () => {
  it('treats accented/cased variants as the same active card name', () => {
    expect(normalizeCardName(' Cartão Ázul ')).toBe(normalizeCardName('cartao azul'));
  });

  it('keeps distinct card names independent', () => {
    expect(normalizeCardName('LATAM Pass')).not.toBe(normalizeCardName('Mercado Pago'));
  });
});
