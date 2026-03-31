function calculateHandValue(cards) {
  if (!Array.isArray(cards)) {
    throw new TypeError('cards must be an array');
  }

  return cards.reduce((sum, card) => {
    if (!card || typeof card.value !== 'number') {
      throw new TypeError('each card must have a numeric value');
    }
    return sum + card.value;
  }, 0);
}

module.exports = {
  calculateHandValue
};
