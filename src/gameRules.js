const SUITS = ['E', 'G', 'H', 'S'];
const RANKS = ['7', '8', '9', 'U', 'O', 'K', '10', 'A'];

const GAME_TYPES = {
  SAUSPIEL: 'sauspiel',
  WENZ: 'wenz',
  SOLO: 'solo'
};

const CARD_POINTS = {
  A: 11,
  '10': 10,
  K: 4,
  O: 3,
  U: 2,
  '9': 0,
  '8': 0,
  '7': 0
};

const OBER_ORDER = ['E', 'G', 'H', 'S'];
const UNTER_ORDER = ['E', 'G', 'H', 'S'];
const PLAIN_ORDER = ['A', '10', 'K', 'O', 'U', '9', '8', '7'];
const TRUMP_SUIT_ORDER = ['A', '10', 'K', '9', '8', '7'];

function isValidCard(card) {
  return (
    Boolean(card) &&
    typeof card === 'object' &&
    SUITS.includes(card.suit) &&
    RANKS.includes(card.rank)
  );
}

function cardKey(card) {
  return `${card.suit}${card.rank}`;
}

function createLongDeck() {
  return SUITS.flatMap((suit) => RANKS.map((rank) => ({ suit, rank })));
}

function dealCards(deck, playerCount = 4, cardsPerPlayer = 8) {
  if (!Array.isArray(deck)) {
    throw new TypeError('deck must be an array');
  }
  if (!Number.isInteger(playerCount) || playerCount <= 0) {
    throw new TypeError('playerCount must be a positive integer');
  }
  if (!Number.isInteger(cardsPerPlayer) || cardsPerPlayer <= 0) {
    throw new TypeError('cardsPerPlayer must be a positive integer');
  }

  const requiredCards = playerCount * cardsPerPlayer;
  if (deck.length !== requiredCards) {
    throw new RangeError(`deck must contain exactly ${requiredCards} cards`);
  }

  const seenCards = new Set();
  deck.forEach((card) => {
    if (!isValidCard(card)) {
      throw new TypeError('deck contains invalid card objects');
    }
    const key = cardKey(card);
    if (seenCards.has(key)) {
      throw new TypeError('deck contains duplicate cards');
    }
    seenCards.add(key);
  });

  const hands = Array.from({ length: playerCount }, () => []);
  deck.forEach((card, index) => {
    hands[index % playerCount].push(card);
  });

  return hands;
}

function getCardPoints(card) {
  if (!isValidCard(card)) {
    throw new TypeError('invalid card');
  }
  return CARD_POINTS[card.rank];
}

function getTrumpSuit(gameType, options = {}) {
  if (gameType === GAME_TYPES.SAUSPIEL) {
    return 'H';
  }
  if (gameType === GAME_TYPES.SOLO) {
    if (!SUITS.includes(options.soloSuit)) {
      throw new TypeError('soloSuit must be one of E, G, H, S for solo');
    }
    return options.soloSuit;
  }
  if (gameType === GAME_TYPES.WENZ) {
    return null;
  }
  throw new TypeError('unsupported game type');
}

function isTrump(card, gameType, options = {}) {
  if (!isValidCard(card)) {
    throw new TypeError('invalid card');
  }

  if (card.rank === 'O') {
    return true;
  }
  if (card.rank === 'U') {
    return true;
  }
  if (gameType === GAME_TYPES.WENZ) {
    return false;
  }

  const trumpSuit = getTrumpSuit(gameType, options);
  return card.suit === trumpSuit;
}

function scoreTrump(card, gameType, options = {}) {
  if (card.rank === 'O') {
    return 300 - OBER_ORDER.indexOf(card.suit);
  }
  if (card.rank === 'U') {
    return 200 - UNTER_ORDER.indexOf(card.suit);
  }

  if (gameType === GAME_TYPES.WENZ) {
    throw new TypeError('only Unters are trumps in Wenz');
  }

  const trumpSuit = getTrumpSuit(gameType, options);
  if (card.suit !== trumpSuit) {
    throw new TypeError('card is not a suit trump');
  }

  return 100 - TRUMP_SUIT_ORDER.indexOf(card.rank);
}

function scorePlain(card) {
  return 100 - PLAIN_ORDER.indexOf(card.rank);
}

function determineTrickWinner(trick, gameType, options = {}) {
  if (!Array.isArray(trick) || trick.length !== 4) {
    throw new TypeError('trick must contain exactly 4 played cards');
  }

  trick.forEach((play) => {
    if (
      !play ||
      typeof play !== 'object' ||
      typeof play.player !== 'number' ||
      !isValidCard(play.card)
    ) {
      throw new TypeError('each trick entry must be { player, card }');
    }
  });

  const trumpPlays = trick.filter((play) => isTrump(play.card, gameType, options));
  if (trumpPlays.length > 0) {
    return trumpPlays.reduce((bestPlay, currentPlay) => {
      return scoreTrump(currentPlay.card, gameType, options) >
        scoreTrump(bestPlay.card, gameType, options)
        ? currentPlay
        : bestPlay;
    }).player;
  }

  const leadSuit = trick[0].card.suit;
  const leadSuitPlays = trick.filter((play) => play.card.suit === leadSuit);
  return leadSuitPlays.reduce((bestPlay, currentPlay) => {
    return scorePlain(currentPlay.card) > scorePlain(bestPlay.card)
      ? currentPlay
      : bestPlay;
  }).player;
}

function calculateHandValue(cards) {
  if (!Array.isArray(cards)) {
    throw new TypeError('cards must be an array');
  }

  return cards.reduce((sum, card) => sum + getCardPoints(card), 0);
}

function countTrickPoints(trick) {
  if (!Array.isArray(trick)) {
    throw new TypeError('trick must be an array');
  }

  return trick.reduce((sum, play) => {
    if (!play || !isValidCard(play.card)) {
      throw new TypeError('each trick entry must include a valid card');
    }
    return sum + getCardPoints(play.card);
  }, 0);
}

module.exports = {
  SUITS,
  RANKS,
  GAME_TYPES,
  createLongDeck,
  dealCards,
  isTrump,
  determineTrickWinner,
  getCardPoints,
  calculateHandValue,
  countTrickPoints
};
