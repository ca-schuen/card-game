const SUIT_LABELS = {
  E: 'Eichel',
  G: 'Gras',
  H: 'Herz',
  S: 'Schellen'
};

const SPOKEN_RANK_LABELS = {
  A: 'Ass',
  '10': 'Zehn',
  K: 'Koenig',
  O: 'Ober',
  U: 'Unter',
  '9': 'Neun',
  '8': 'Acht',
  '7': 'Sieben'
};

const SUIT_CLASSES = {
  E: 'suit-eichel',
  G: 'suit-gras',
  H: 'suit-herz',
  S: 'suit-schellen'
};

function sanitizeToken(token, fallback) {
  if (typeof token !== 'string' || token.trim().length === 0) {
    return fallback;
  }
  return token;
}

function toCardPresentation(card) {
  const rankCode = sanitizeToken(card && card.rank, '?');
  const suitCode = sanitizeToken(card && card.suit, '?');

  const rankText = rankCode;
  const suitText = SUIT_LABELS[suitCode] || suitCode;
  const spokenRank = SPOKEN_RANK_LABELS[rankCode] || rankCode;

  return {
    id: `${suitCode}${rankCode}`,
    rankCode,
    suitCode,
    rankText,
    suitText,
    shortLabel: `${rankText} ${suitText}`,
    ariaLabel: `${spokenRank} ${suitText}`,
    semanticClass: SUIT_CLASSES[suitCode] || 'suit-unknown',
    isKnownCard: Boolean(SUIT_LABELS[suitCode]) && Boolean(SPOKEN_RANK_LABELS[rankCode])
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    toCardPresentation,
    SUIT_LABELS
  };
}
