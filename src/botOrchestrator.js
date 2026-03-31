function delay(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function getSeat(play) {
  if (typeof play.seat === 'number') {
    return play.seat;
  }

  return play.player;
}

function getBotPlaysInOrder(trick, humanSeat) {
  if (!Array.isArray(trick) || trick.length === 0) {
    return [];
  }

  const bySeat = new Map();
  trick.forEach((play) => {
    bySeat.set(getSeat(play), play);
  });

  const botPlays = [];
  for (let offset = 1; offset < 4; offset += 1) {
    const seat = (humanSeat + offset) % 4;
    if (bySeat.has(seat)) {
      botPlays.push(bySeat.get(seat));
    }
  }

  return botPlays;
}

async function revealBotCards(trick, humanSeat, onBotCard, options = {}) {
  if (typeof onBotCard !== 'function') {
    throw new TypeError('onBotCard must be a function');
  }

  const initialDelayMs = options.initialDelayMs ?? 600;
  const betweenDelayMs = options.betweenDelayMs ?? 400;
  const botPlays = getBotPlaysInOrder(trick, humanSeat);

  if (botPlays.length === 0) {
    return;
  }

  await delay(initialDelayMs);

  for (let index = 0; index < botPlays.length; index += 1) {
    onBotCard(botPlays[index], index);
    if (index < botPlays.length - 1) {
      await delay(betweenDelayMs);
    }
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    revealBotCards,
    getBotPlaysInOrder
  };
}

if (typeof window !== 'undefined') {
  window.revealBotCards = revealBotCards;
  window.getBotPlaysInOrder = getBotPlaysInOrder;
}
