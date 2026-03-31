/**
 * Sauspiel Game Controller
 * Manages game state, player turns, and UI updates
 */
/* global createLongDeck, dealCards, isTrump, GAME_TYPES, determineTrickWinner, countTrickPoints, getVisiblePlayer, shouldShowBiddingControls, sortHandForDisplay, getCardDisplayData */

class SauspielGame {
  constructor() {
    this.players = 4;
    this.gameState = null;
    this.currentPlayer = 0;
    this.scores = [0, 0, 0, 0];
    this.roundScores = [0, 0, 0, 0];
    this.currentTrick = [];
    this.gamePhase = 'idle'; // idle, bidding, playing, trick-complete, round-complete
    this.selectedCard = null;
    this.playableCards = [];
    this.dealer = 0;
    this.leader = null;
    this.tricks = [[], [], [], []]; // Track tricks won by each player
    this.pointThreshold = 61;
  }

  /**
   * Initialize a new game
   */
  newGame() {
    this.gamePhase = 'bidding';
    this.currentPlayer = (this.dealer + 1) % this.players;
    this.currentTrick = [];
    this.selectedCard = null;
    this.playableCards = [];
    this.leader = null;
    this.tricks = [[], [], [], []];
    this.roundScores = [0, 0, 0, 0];

    // Create deck and deal cards
    const deck = createLongDeck();
    this.playerHands = dealCards(deck, this.players, 8);

    this.updateUI();
    this.showMessage('Bidding phase: Player ' + this.currentPlayer + ', do you bid?');
  }

  /**
   * Handle bidding action
   */
  bid() {
    if (this.gamePhase !== 'bidding') {
      this.showMessage('Not in bidding phase!', 'error');
      return;
    }

    this.gamePhase = 'playing';
    this.leader = this.currentPlayer;
    this.showMessage(`Player ${this.leader} declared Sauspiel! Game starts.`);
    this.currentPlayer = (this.dealer + 1) % this.players;
    this.updateUI();
  }

  /**
   * Handle pass action during bidding
   */
  pass() {
    if (this.gamePhase !== 'bidding') {
      this.showMessage('Not in bidding phase!', 'error');
      return;
    }

    this.currentPlayer = (this.currentPlayer + 1) % this.players;

    // If all players pass (went around 4 times), reshuffle
    if (this.currentPlayer === (this.dealer + 1) % this.players) {
      this.dealer = (this.dealer + 1) % this.players;
      this.showMessage(
        'All players passed. New dealer: Player ' +
          this.dealer +
          '. Reshuffling...'
      );
      setTimeout(() => this.newGame(), 2000);
      return;
    }

    this.showMessage('Player ' + this.currentPlayer + ', your turn to bid.');
    this.updateUI();
  }

  /**
   * Play a card from hand
   */
  playCard(cardIndex) {
    if (this.gamePhase !== 'playing') {
      this.showMessage('Not in playing phase!', 'error');
      return;
    }

    const card = this.playerHands[this.currentPlayer][cardIndex];
    if (!card) {
      this.showMessage('Invalid card!', 'error');
      return;
    }

    // Check if card is playable
    if (!this.isCardPlayable(card)) {
      this.showMessage('Invalid card! Follow suit or play trump.', 'error');
      return;
    }

    // Add to trick
    this.currentTrick.push({ player: this.currentPlayer, card });
    this.playerHands[this.currentPlayer].splice(cardIndex, 1);

    if (this.currentTrick.length === 4) {
      // Trick is complete
      this.resolveTrick();
    } else {
      // Next player
      this.currentPlayer = (this.currentPlayer + 1) % this.players;
      this.showMessage('Player ' + this.currentPlayer + "'s turn.");
    }

    this.updateUI();
  }

  /**
   * Check if a card is playable
   */
  isCardPlayable(card) {
    if (this.currentTrick.length === 0) {
      return true; // First player can play any card
    }

    const leadCard = this.currentTrick[0].card;
    const leadSuit = leadCard.suit;
    const hand = this.playerHands[this.currentPlayer];

    // Check if player has lead suit
    const hasSuit = hand.some((c) => c.suit === leadSuit);
    if (hasSuit) {
      return card.suit === leadSuit;
    }

    // Check if player has trump
    const hasTrump = hand.some(
      (c) =>
        c.rank === 'O' ||
        c.rank === 'U' ||
        (c.suit === 'H' && isTrump(c, GAME_TYPES.SAUSPIEL))
    );
    if (hasTrump) {
      return isTrump(card, GAME_TYPES.SAUSPIEL);
    }

    // No suit constraint, can play any card
    return true;
  }

  /**
   * Resolve a completed trick
   */
  resolveTrick() {
    const winner = determineTrickWinner(this.currentTrick, GAME_TYPES.SAUSPIEL);
    const points = countTrickPoints(this.currentTrick);

    this.roundScores[winner] += points;
    this.tricks[winner].push(...this.currentTrick);

    this.showMessage(`Player ${winner} wins the trick (+${points} points)!`);

    // Check if round is over (8 tricks total)
    if (
      this.tricks[0].length +
        this.tricks[1].length +
        this.tricks[2].length +
        this.tricks[3].length ===
      8
    ) {
      this.resolveRound();
    } else {
      this.currentPlayer = winner;
      this.currentTrick = [];
      this.selectedCard = null;
      this.playableCards = [];
      setTimeout(() => {
        this.updateUI();
        this.showMessage('Player ' + this.currentPlayer + "'s turn.");
      }, 1500);
    }
  }

  /**
   * Resolve end of round
   */
  resolveRound() {
    // Calculate round winner (who has 61+ points)
    const leaderPoints = this.roundScores[this.leader];

    const opponentPoints =
      this.roundScores[0] +
      this.roundScores[1] +
      this.roundScores[2] +
      this.roundScores[3] -
      this.roundScores[this.leader];

    // Award points to team
    if (leaderPoints >= this.pointThreshold) {
      this.scores[this.leader] += 1;
      this.showMessage(
        `Player ${this.leader}'s team wins this round! (${leaderPoints} points)`
      );
    } else {
      this.scores[(this.leader + 1) % this.players] += 1;
      this.showMessage(
        `Opposing team wins this round! (${opponentPoints} points)`
      );
    }

    // Check for overall winner
    if (Math.max(...this.scores) >= 3) {
      this.resolveGame();
    } else {
      this.gamePhase = 'round-complete';
      this.dealer = (this.dealer + 1) % this.players;
      setTimeout(() => {
        this.newGame();
      }, 2000);
    }
  }

  /**
   * Resolve end of game
   */
  resolveGame() {
    const winner = this.scores.indexOf(Math.max(...this.scores));
    this.showMessage(
      `🎉 Game Over! Player ${winner} wins!`,
      'success'
    );
    this.gamePhase = 'idle';
    this.updateUI();
  }

  /**
   * Get human player index (for now, always player 0)
   */
  getVisiblePlayer() {
    return getVisiblePlayer(this.gamePhase, this.currentPlayer, 0);
  }

  /**
   * Update all UI elements
   */
  updateUI() {
    this.updateDealer();
    this.updatePhase();
    this.updatePlayerHand();
    this.updateScores();
    this.updateTrick();
    this.updateBiddingButtons();
  }

  updateDealer() {
    document.getElementById('dealerDisplay').textContent = 'Player ' + this.dealer;
  }

  updatePhase() {
    const phaseDisplay = this.gamePhase === 'bidding' ? 'Bidding' : 'Playing';
    document.getElementById('phaseDisplay').textContent = phaseDisplay;
  }

  updatePlayerHand() {
    const handContainer = document.getElementById('playerHand');
    const visiblePlayer = this.getVisiblePlayer();
    const hand = this.playerHands[visiblePlayer] || [];
    const sortedHand = sortHandForDisplay(hand, GAME_TYPES.SAUSPIEL);
    const isInteractiveTurn =
      this.gamePhase === 'playing' && visiblePlayer === this.currentPlayer;

    handContainer.innerHTML = '';

    sortedHand.forEach(({ card, originalIndex }) => {
      const isPlayable = isInteractiveTurn && this.isCardPlayable(card);
      const cardEl = this.createCardElement(card, {
        compact: false,
        interactive: isInteractiveTurn,
        playable: isPlayable
      });

      if (isInteractiveTurn) {
        cardEl.onclick = () => {
          this.playCard(originalIndex);
        };

        cardEl.addEventListener('keydown', (event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            this.playCard(originalIndex);
          }
        });
      }

      handContainer.appendChild(cardEl);
    });

    document.getElementById('playerNumber').textContent = visiblePlayer;
  }

  updateScores() {
    for (let i = 0; i < this.players; i++) {
      const scoreEl = document.getElementById('score-' + i);
      const scoreValue = scoreEl.querySelector('.player-score');
      scoreValue.textContent = this.scores[i];

      if (i === this.currentPlayer && this.gamePhase === 'bidding') {
        scoreEl.classList.add('active-player');
      } else {
        scoreEl.classList.remove('active-player');
      }
    }
  }

  updateTrick() {
    const trickContainer = document.getElementById('trickCards');
    trickContainer.innerHTML = '';

    for (let i = 0; i < 4; i++) {
      const position = document.createElement('div');
      position.className = 'trick-position';
      position.id = 'trick-' + i;

      const playedCard = this.currentTrick.find((play) => play.player === i);
      if (playedCard) {
        position.appendChild(
          this.createCardElement(playedCard.card, { compact: true })
        );
      } else {
        const placeholder = document.createElement('div');
        placeholder.className = 'placeholder';
        placeholder.textContent = 'Player ' + i;
        position.appendChild(placeholder);
      }

      trickContainer.appendChild(position);
    }
  }

  updateBiddingButtons() {
    const biddingSection = document.getElementById('biddingSection');

    if (shouldShowBiddingControls(this.gamePhase, this.currentPlayer)) {
      biddingSection.classList.remove('hidden');
    } else {
      biddingSection.classList.add('hidden');
    }
  }

  /**
   * Create a card element
   */
  createCardElement(card, options = {}) {
    const { compact = false, interactive = false, playable = false } = options;
    const display = getCardDisplayData(card, GAME_TYPES.SAUSPIEL);
    const el = document.createElement('div');
    el.className = 'card';

    el.classList.add('suit-' + display.suitClass);
    if (display.isTrump) {
      el.classList.add('trump');
    }
    if (compact) {
      el.classList.add('compact');
    }
    if (playable) {
      el.classList.add('playable');
    }
    if (interactive) {
      el.classList.add('interactive');
      el.setAttribute('role', 'button');
      el.tabIndex = 0;
    }

    el.setAttribute(
      'aria-label',
      playable ? `${display.ariaLabel}, playable` : display.ariaLabel
    );
    el.title = display.ariaLabel;

    const topCorner = document.createElement('div');
    topCorner.className = 'card-corner card-corner-top';
    topCorner.innerHTML = `
      <span class="card-corner-rank">${card.rank}</span>
      <span class="card-corner-suit">${display.suitShortName}</span>
    `;

    const center = document.createElement('div');
    center.className = 'card-center';
    center.innerHTML = `
      <span class="card-rank-label">${display.rankLabel}</span>
      <span class="card-suit-mark">${display.suitName}</span>
    `;

    const bottomCorner = document.createElement('div');
    bottomCorner.className = 'card-corner card-corner-bottom';
    bottomCorner.innerHTML = `
      <span class="card-corner-rank">${card.rank}</span>
      <span class="card-corner-suit">${display.suitShortName}</span>
    `;

    el.appendChild(topCorner);
    el.appendChild(center);
    el.appendChild(bottomCorner);

    return el;
  }

  /**
   * Show game message
   */
  showMessage(text, type = 'info') {
    const messageBox = document.getElementById('messageBox');
    messageBox.textContent = text;
    messageBox.className = 'message-box ' + type;
  }
}

// Initialize game controller
const game = new SauspielGame();

// Event listeners
document.getElementById('newGameBtn').addEventListener('click', () => {
  game.newGame();
});

document.getElementById('bidBtn').addEventListener('click', () => {
  game.bid();
});

document.getElementById('passBtn').addEventListener('click', () => {
  game.pass();
});

// Show welcome message on load
document.addEventListener('DOMContentLoaded', () => {
  game.showMessage('Welcome to Sauspiel! Click "New Game" to start.');
});
