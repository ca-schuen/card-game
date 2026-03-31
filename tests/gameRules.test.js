const {
  GAME_TYPES,
  createLongDeck,
  dealCards,
  isTrump,
  determineTrickWinner,
  getCardPoints,
  calculateHandValue,
  countTrickPoints
} = require('../src/gameRules');

describe('Schafkopf long deck', () => {
  test('creates a 32-card long deck with unique cards', () => {
    const deck = createLongDeck();
    expect(deck).toHaveLength(32);

    const unique = new Set(deck.map((card) => `${card.suit}${card.rank}`));
    expect(unique.size).toBe(32);
  });

  test('deals exactly 8 cards to 4 players', () => {
    const deck = createLongDeck();
    const hands = dealCards(deck, 4, 8);
    expect(hands).toHaveLength(4);
    hands.forEach((hand) => expect(hand).toHaveLength(8));
  });

  test('throws when deck size is not 32 for 4 players x 8 cards', () => {
    const invalidDeck = createLongDeck().slice(0, 31);
    expect(() => dealCards(invalidDeck, 4, 8)).toThrow(
      'deck must contain exactly 32 cards'
    );
  });
});

describe('trump rules', () => {
  test('all Obers and Unters are always trumps', () => {
    expect(isTrump({ suit: 'E', rank: 'O' }, GAME_TYPES.SAUSPIEL)).toBe(true);
    expect(isTrump({ suit: 'S', rank: 'U' }, GAME_TYPES.WENZ)).toBe(true);
  });

  test('Sauspiel has hearts as suit trumps', () => {
    expect(isTrump({ suit: 'H', rank: 'A' }, GAME_TYPES.SAUSPIEL)).toBe(true);
    expect(isTrump({ suit: 'E', rank: 'A' }, GAME_TYPES.SAUSPIEL)).toBe(false);
  });

  test('Wenz has no suit trumps', () => {
    expect(isTrump({ suit: 'H', rank: 'A' }, GAME_TYPES.WENZ)).toBe(false);
  });

  test('Solo uses selected suit as trump', () => {
    expect(isTrump({ suit: 'E', rank: 'K' }, GAME_TYPES.SOLO, { soloSuit: 'E' })).toBe(
      true
    );
    expect(isTrump({ suit: 'G', rank: 'K' }, GAME_TYPES.SOLO, { soloSuit: 'E' })).toBe(
      false
    );
  });
});

describe('trick winner', () => {
  test('highest trump wins trick in Sauspiel', () => {
    const trick = [
      { player: 0, card: { suit: 'E', rank: 'A' } },
      { player: 1, card: { suit: 'H', rank: '10' } },
      { player: 2, card: { suit: 'G', rank: 'O' } },
      { player: 3, card: { suit: 'S', rank: 'U' } }
    ];

    expect(determineTrickWinner(trick, GAME_TYPES.SAUSPIEL)).toBe(2);
  });

  test('without trumps highest lead suit card wins', () => {
    const trick = [
      { player: 0, card: { suit: 'E', rank: '10' } },
      { player: 1, card: { suit: 'E', rank: 'A' } },
      { player: 2, card: { suit: 'G', rank: 'A' } },
      { player: 3, card: { suit: 'E', rank: 'K' } }
    ];

    expect(determineTrickWinner(trick, GAME_TYPES.WENZ)).toBe(1);
  });
});

describe('point counting', () => {
  test('maps Schafkopf card points correctly', () => {
    expect(getCardPoints({ suit: 'S', rank: 'A' })).toBe(11);
    expect(getCardPoints({ suit: 'S', rank: '10' })).toBe(10);
    expect(getCardPoints({ suit: 'S', rank: 'K' })).toBe(4);
    expect(getCardPoints({ suit: 'S', rank: 'O' })).toBe(3);
    expect(getCardPoints({ suit: 'S', rank: 'U' })).toBe(2);
    expect(getCardPoints({ suit: 'S', rank: '9' })).toBe(0);
  });

  test('calculates hand value as Schafkopf points sum', () => {
    const hand = [
      { suit: 'E', rank: 'A' },
      { suit: 'G', rank: '10' },
      { suit: 'H', rank: 'K' },
      { suit: 'S', rank: '9' }
    ];

    expect(calculateHandValue(hand)).toBe(25);
  });

  test('counts trick points from played cards', () => {
    const trick = [
      { player: 0, card: { suit: 'E', rank: 'A' } },
      { player: 1, card: { suit: 'E', rank: '10' } },
      { player: 2, card: { suit: 'E', rank: 'K' } },
      { player: 3, card: { suit: 'E', rank: '9' } }
    ];

    expect(countTrickPoints(trick)).toBe(25);
  });
});
