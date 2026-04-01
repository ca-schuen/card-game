const { toCardPresentation, SUIT_LABELS } = require('../src/cardPresentation');

describe('card presentation mapping contract', () => {
  test('maps canonical rank and suit labels for known cards', () => {
    const presentation = toCardPresentation({ suit: 'E', rank: 'A' });

    expect(presentation).toEqual({
      id: 'EA',
      rankCode: 'A',
      suitCode: 'E',
      rankText: 'A',
      suitText: 'Eichel',
      shortLabel: 'A Eichel',
      ariaLabel: 'Ass Eichel',
      semanticClass: 'suit-eichel',
      isKnownCard: true
    });
  });

  test('keeps canonical suit mapping stable', () => {
    expect(SUIT_LABELS).toEqual({
      E: 'Eichel',
      G: 'Gras',
      H: 'Herz',
      S: 'Schellen'
    });
  });

  test('falls back to raw token values for unknown rank or suit', () => {
    const presentation = toCardPresentation({ suit: 'X', rank: '11' });

    expect(presentation.id).toBe('X11');
    expect(presentation.shortLabel).toBe('11 X');
    expect(presentation.ariaLabel).toBe('11 X');
    expect(presentation.semanticClass).toBe('suit-unknown');
    expect(presentation.isKnownCard).toBe(false);
  });

  test('uses safe placeholders for blank or missing tokens', () => {
    const presentation = toCardPresentation({ suit: ' ', rank: undefined });

    expect(presentation.id).toBe('??');
    expect(presentation.rankCode).toBe('?');
    expect(presentation.suitCode).toBe('?');
    expect(presentation.shortLabel).toBe('? ?');
    expect(presentation.ariaLabel).toBe('? ?');
    expect(presentation.isKnownCard).toBe(false);
  });
});
