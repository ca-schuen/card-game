function getVisiblePlayer(gamePhase, currentPlayer, fallbackPlayer = 0) {
  if (
    (gamePhase === 'bidding' || gamePhase === 'playing') &&
    Number.isInteger(currentPlayer) &&
    currentPlayer >= 0
  ) {
    return currentPlayer;
  }

  return fallbackPlayer;
}

function shouldShowBiddingControls(gamePhase, currentPlayer) {
  return (
    gamePhase === 'bidding' &&
    Number.isInteger(currentPlayer) &&
    currentPlayer >= 0
  );
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    getVisiblePlayer,
    shouldShowBiddingControls
  };
}
