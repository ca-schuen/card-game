const { calculateHandValue } = require('../src/gameRules');

describe('calculateHandValue', () => {
  test('returns 0 for empty hand', () => {
    expect(calculateHandValue([])).toBe(0);
  });

  test('adds card values', () => {
    const hand = [{ value: 2 }, { value: 9 }, { value: 4 }];
    expect(calculateHandValue(hand)).toBe(15);
  });

  test('throws for invalid card entry', () => {
    expect(() => calculateHandValue([{ value: 3 }, { rank: 'K' }])).toThrow(
      'each card must have a numeric value'
    );
  });
});
