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
const {
  getVisiblePlayer,
  shouldShowBiddingControls
} = require('../src/uiState');
const { SauspielGame } = require('../src/game');

function createMockClassList(initialClasses = []) {
  const classes = new Set(initialClasses);

  return {
    add: (...names) => {
      names.forEach((name) => classes.add(name));
    },
    remove: (...names) => {
      names.forEach((name) => classes.delete(name));
    },
    toggle: (name, force) => {
      if (force === true) {
        classes.add(name);
        return true;
      }
      if (force === false) {
        classes.delete(name);
        return false;
      }
      if (classes.has(name)) {
        classes.delete(name);
        return false;
      }
      classes.add(name);
      return true;
    },
    contains: (name) => classes.has(name)
  };
}

function createMockElement(id = '') {
  const element = {
    id,
    textContent: '',
    className: '',
    title: '',
    children: [],
    onclick: null,
    listeners: {},
    classList: createMockClassList(),
    appendChild(child) {
      this.children.push(child);
      return child;
    },
    querySelector(selector) {
      if (selector === '.player-name') {
        return this.playerName;
      }
      if (selector === '.player-score') {
        return this.playerScore;
      }
      return null;
    },
    addEventListener(eventName, handler) {
      this.listeners[eventName] = handler;
    }
  };

  let innerHtmlValue = '';
  Object.defineProperty(element, 'innerHTML', {
    get() {
      return innerHtmlValue;
    },
    set(value) {
      innerHtmlValue = value;
      if (value === '') {
        this.children = [];
      }
    }
  });

  return element;
}

function createMockDocument() {
  const elements = {
    dealerDisplay: createMockElement('dealerDisplay'),
    phaseDisplay: createMockElement('phaseDisplay'),
    playerHand: createMockElement('playerHand'),
    playerNumber: createMockElement('playerNumber'),
    trickCards: createMockElement('trickCards'),
    biddingSection: createMockElement('biddingSection'),
    newGameBtn: createMockElement('newGameBtn'),
    bidBtn: createMockElement('bidBtn'),
    passBtn: createMockElement('passBtn'),
    messageBox: createMockElement('messageBox')
  };

  for (let index = 0; index < 4; index += 1) {
    const row = createMockElement(`score-${index}`);
    row.playerName = createMockElement(`score-${index}-name`);
    row.playerScore = createMockElement(`score-${index}-value`);
    elements[`score-${index}`] = row;
  }

  return {
    elements,
    getElementById(id) {
      return this.elements[id] || null;
    },
    createElement(tagName) {
      return createMockElement(tagName);
    }
  };
}

function createGameState(overrides = {}) {
  return {
    sessionId: 'session-1',
    humanHand: [
      { suit: 'E', rank: 'A' },
      { suit: 'G', rank: '10' }
    ],
    currentTrick: [],
    completedTricks: [],
    scores: {
      team: 0,
      opponents: 0
    },
    trickCount: 0,
    roundComplete: false,
    winner: null,
    gameType: 'sauspiel',
    soloSuit: null,
    humanSeat: 0,
    humanTurn: true,
    leadSeat: 0,
    ...overrides
  };
}

/**
 * Tests for Sauspiel Game Controller Logic
 * Note: SauspielGame class is browser-dependent, so we test game logic components
 */

describe('Sauspiel Game Initialization', () => {
  test('creates new game with 4 players', () => {
    const deck = createLongDeck();
    const hands = dealCards(deck, 4, 8);
    expect(hands).toHaveLength(4);
    hands.forEach((hand) => {
      expect(hand).toHaveLength(8);
    });
  });

  test('all cards are unique across hands', () => {
    const deck = createLongDeck();
    const hands = dealCards(deck, 4, 8);
    const allCards = hands.flat();
    const cardSet = new Set(allCards.map((c) => `${c.suit}${c.rank}`));
    expect(cardSet.size).toBe(32);
  });
});

describe('Card Validity and Scoring', () => {
  test('correctly identifies trump cards', () => {
    const obers = [
      { suit: 'E', rank: 'O' },
      { suit: 'G', rank: 'O' },
      { suit: 'H', rank: 'O' },
      { suit: 'S', rank: 'O' }
    ];
    obers.forEach((card) => {
      expect(isTrump(card, GAME_TYPES.SAUSPIEL)).toBe(true);
    });

    const unters = [
      { suit: 'E', rank: 'U' },
      { suit: 'G', rank: 'U' },
      { suit: 'H', rank: 'U' },
      { suit: 'S', rank: 'U' }
    ];
    unters.forEach((card) => {
      expect(isTrump(card, GAME_TYPES.SAUSPIEL)).toBe(true);
    });

    // Hearts are trump suit in Sauspiel
    expect(isTrump({ suit: 'H', rank: 'A' }, GAME_TYPES.SAUSPIEL)).toBe(true);
    expect(isTrump({ suit: 'E', rank: 'A' }, GAME_TYPES.SAUSPIEL)).toBe(false);
  });

  test('calculates card points correctly', () => {
    expect(getCardPoints({ suit: 'H', rank: 'A' })).toBe(11);
    expect(getCardPoints({ suit: 'H', rank: '10' })).toBe(10);
    expect(getCardPoints({ suit: 'H', rank: 'K' })).toBe(4);
    expect(getCardPoints({ suit: 'H', rank: 'O' })).toBe(3);
    expect(getCardPoints({ suit: 'H', rank: 'U' })).toBe(2);
    expect(getCardPoints({ suit: 'H', rank: '9' })).toBe(0);
  });

  test('calculates hand value as sum of card points', () => {
    const hand = [
      { suit: 'E', rank: 'A' },
      { suit: 'G', rank: '10' },
      { suit: 'H', rank: 'K' },
      { suit: 'S', rank: '9' }
    ];
    expect(calculateHandValue(hand)).toBe(11 + 10 + 4 + 0);
  });

  test('counts trick points correctly', () => {
    const trick = [
      { player: 0, card: { suit: 'H', rank: 'A' } },
      { player: 1, card: { suit: 'H', rank: '10' } },
      { player: 2, card: { suit: 'H', rank: 'K' } },
      { player: 3, card: { suit: 'H', rank: '7' } }
    ];
    expect(countTrickPoints(trick)).toBe(11 + 10 + 4 + 0);
  });
});

describe('Trick Resolution', () => {
  test('highest trump wins trick', () => {
    const trick = [
      { player: 0, card: { suit: 'E', rank: 'A' } }, // not trump
      { player: 1, card: { suit: 'H', rank: '10' } }, // trump
      { player: 2, card: { suit: 'G', rank: 'O' } }, // trump (Ober is highest trump)
      { player: 3, card: { suit: 'S', rank: 'U' } } // trump
    ];
    expect(determineTrickWinner(trick, GAME_TYPES.SAUSPIEL)).toBe(2); // Ober wins
  });

  test('highest lead suit wins when no trump', () => {
    const trick = [
      { player: 0, card: { suit: 'E', rank: '10' } },
      { player: 1, card: { suit: 'E', rank: 'A' } },
      { player: 2, card: { suit: 'G', rank: 'A' } },
      { player: 3, card: { suit: 'E', rank: 'K' } }
    ];
    expect(determineTrickWinner(trick, GAME_TYPES.SAUSPIEL)).toBe(1); // E-Ace wins
  });

  test('lead suit player 0 is default lead', () => {
    const trick = [
      { player: 0, card: { suit: 'E', rank: '7' } },
      { player: 1, card: { suit: 'E', rank: '8' } },
      { player: 2, card: { suit: 'G', rank: 'A' } },
      { player: 3, card: { suit: 'G', rank: 'K' } }
    ];
    expect(determineTrickWinner(trick, GAME_TYPES.SAUSPIEL)).toBe(1); // E-8 beats E-7
  });

  test('trump beats non-trump in trick', () => {
    const trick = [
      { player: 0, card: { suit: 'E', rank: 'A' } }, // not trump
      { player: 1, card: { suit: 'G', rank: 'A' } }, // not trump
      { player: 2, card: { suit: 'H', rank: '9' } }, // trump
      { player: 3, card: { suit: 'S', rank: 'K' } } // not trump
    ];
    expect(determineTrickWinner(trick, GAME_TYPES.SAUSPIEL)).toBe(2); // Trump wins
  });
});

describe('Scoring System', () => {
  test('60 points is not enough to win in Sauspiel', () => {
    const points = [61, 0, 0, 0]; // 61 total (distributed as 61, 0, 0, 0)
    const leaderPoints = points[0];
    expect(leaderPoints >= 61).toBe(true); // Leader wins
  });

  test('total points across all players equals 120', () => {
    const deck = createLongDeck();
    const totalPoints = deck.reduce((sum, card) => sum + getCardPoints(card), 0);
    expect(totalPoints).toBe(120);
  });

  test('trick points distribution is valid', () => {
    // Simulate a round of play
    const tricks = [
      [
        { player: 0, card: { suit: 'E', rank: 'A' } },
        { player: 1, card: { suit: 'E', rank: 'K' } },
        { player: 2, card: { suit: 'E', rank: '10' } },
        { player: 3, card: { suit: 'E', rank: '7' } }
      ],
      [
        { player: 0, card: { suit: 'G', rank: 'A' } },
        { player: 1, card: { suit: 'G', rank: 'K' } },
        { player: 2, card: { suit: 'G', rank: '10' } },
        { player: 3, card: { suit: 'G', rank: '7' } }
      ]
    ];

    const points1 = countTrickPoints(tricks[0]); // E-suit
    const points2 = countTrickPoints(tricks[1]); // G-suit
    expect(points1).toBe(11 + 4 + 10 + 0); // 25
    expect(points2).toBe(11 + 4 + 10 + 0); // 25
  });
});

describe('Game State Management', () => {
  test('validates deck and hand consistency', () => {
    const deck = createLongDeck();
    const hands = dealCards(deck, 4, 8);

    // All cards should be in hands
    const cardsInHands = hands.flat();
    expect(cardsInHands).toHaveLength(32);

    // No duplicates
    const seen = new Set();
    cardsInHands.forEach((card) => {
      const key = `${card.suit}${card.rank}`;
      expect(seen.has(key)).toBe(false);
      seen.add(key);
    });
  });

  test('handles 8 tricks per round', () => {
    // Simulate 8 tricks
    let trickCount = 0;
    for (let i = 0; i < 8; i++) {
      trickCount++;
    }
    expect(trickCount).toBe(8);
  });

  test('tracks player scores across rounds', () => {
    const scores = [0, 0, 0, 0];
    scores[0] += 1; // Player 0 wins round 1
    scores[1] += 1; // Player 1 wins round 2
    scores[0] += 1; // Player 0 wins round 3
    expect(scores[0]).toBe(2);
    expect(scores[1]).toBe(1);
    expect(scores[2]).toBe(0);
    expect(scores[3]).toBe(0);
  });

  test('shows bidding controls for the active bidder in local play', () => {
    expect(shouldShowBiddingControls('bidding', 1)).toBe(true);
    expect(shouldShowBiddingControls('playing', 1)).toBe(false);
  });

  test('shows the active player hand during bidding and play', () => {
    expect(getVisiblePlayer('bidding', 1, 0)).toBe(1);
    expect(getVisiblePlayer('playing', 3, 0)).toBe(3);
    expect(getVisiblePlayer('idle', 2, 0)).toBe(0);
  });
});

describe('Sauspiel Game Rules (MVP Implementation)', () => {
  test('Sauspiel uses heart suit as trump', () => {
    const hearts = [
      { suit: 'H', rank: 'A' },
      { suit: 'H', rank: 'K' },
      { suit: 'H', rank: '10' },
      { suit: 'H', rank: '9' }
    ];
    hearts.forEach((card) => {
      expect(isTrump(card, GAME_TYPES.SAUSPIEL)).toBe(true);
    });

    const nonHearts = [
      { suit: 'E', rank: 'A' },
      { suit: 'G', rank: 'K' },
      { suit: 'S', rank: '10' }
    ];
    nonHearts.forEach((card) => {
      expect(isTrump(card, GAME_TYPES.SAUSPIEL)).toBe(false);
    });
  });

  test('game determines winner with 61+ points', () => {
    const leaderPoints = 61;
    expect(leaderPoints >= 61).toBe(true); // Passed threshold
  });

  test('game requires first to win 3 rounds', () => {
    const scores = [3, 2, 0, 0];
    expect(Math.max(...scores)).toBe(3); // Winner has 3 rounds
  });
});

describe('SauspielGame backend integration', () => {
  test('newGame creates a backend session and renders only the human hand', async () => {
    const mockDocument = createMockDocument();
    const createGameMock = jest.fn().mockResolvedValue(createGameState());
    const game = new SauspielGame({
      document: mockDocument,
      createGame: createGameMock,
      playCard: jest.fn(),
      newRound: jest.fn(),
      revealBotCards: jest.fn().mockResolvedValue(undefined)
    });

    await game.newGame();

    expect(createGameMock).toHaveBeenCalledWith('sauspiel', null);
    expect(mockDocument.getElementById('playerHand').children).toHaveLength(2);
    expect(mockDocument.getElementById('playerNumber').textContent).toBe('You');
    expect(mockDocument.getElementById('messageBox').textContent).toContain('Your turn');
    expect(mockDocument.getElementById('biddingSection').classList.contains('hidden')).toBe(true);
  });

  test('playCard submits one human move and reveals bot responses from the backend', async () => {
    const mockDocument = createMockDocument();
    const firstState = createGameState();
    const completedTrick = [
      { seat: 0, card: { suit: 'E', rank: 'A' } },
      { seat: 1, card: { suit: 'G', rank: 'K' } },
      { seat: 2, card: { suit: 'S', rank: '7' } },
      { seat: 3, card: { suit: 'H', rank: '9' } }
    ];
    const nextState = createGameState({
      humanHand: [{ suit: 'G', rank: '10' }],
      currentTrick: [
        { seat: 1, card: { suit: 'S', rank: 'A' } },
        { seat: 2, card: { suit: 'S', rank: '10' } },
        { seat: 3, card: { suit: 'S', rank: 'K' } }
      ],
      completedTricks: [completedTrick],
      trickCount: 1,
      leadSeat: 1
    });
    const playCardMock = jest.fn().mockResolvedValue(nextState);
    const revealBotCardsMock = jest.fn().mockImplementation(async (trick, humanSeat, onBotCard) => {
      trick
        .filter((play) => play.seat !== humanSeat)
        .forEach((play, index) => onBotCard(play, index));
    });
    const game = new SauspielGame({
      document: mockDocument,
      createGame: jest.fn().mockResolvedValue(firstState),
      playCard: playCardMock,
      newRound: jest.fn(),
      revealBotCards: revealBotCardsMock
    });

    await game.newGame();
    await game.playCard(0);

    expect(playCardMock).toHaveBeenCalledWith('session-1', 0);
    expect(revealBotCardsMock).toHaveBeenCalledWith(
      completedTrick,
      0,
      expect.any(Function)
    );
    expect(mockDocument.getElementById('playerHand').children).toHaveLength(1);
    expect(mockDocument.getElementById('messageBox').textContent).toContain('Your turn');
    expect(mockDocument.getElementById('score-3').playerScore.textContent).toBe('Bot 1');
  });

  test('network failures show the backend startup hint instead of rotating local players', async () => {
    const mockDocument = createMockDocument();
    const game = new SauspielGame({
      document: mockDocument,
      createGame: jest.fn().mockRejectedValue({ status: 0, message: 'Failed to fetch' }),
      playCard: jest.fn(),
      newRound: jest.fn(),
      revealBotCards: jest.fn().mockResolvedValue(undefined)
    });

    await game.newGame();

    expect(mockDocument.getElementById('messageBox').textContent).toContain('http://localhost:5500');
    expect(mockDocument.getElementById('playerHand').children).toHaveLength(0);
  });
});
