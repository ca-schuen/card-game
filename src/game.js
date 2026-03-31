function lookupGlobal(name) {
  if (typeof globalThis !== 'undefined' && globalThis[name]) {
    return globalThis[name];
  }

  return undefined;
}

class SauspielGame {
  constructor(options = {}) {
    this.document = options.document || (typeof document !== 'undefined' ? document : null);
    this.createGameRequest = options.createGame || lookupGlobal('createGame');
    this.playCardRequest = options.playCard || lookupGlobal('playCardRequest');
    this.newRoundRequest = options.newRound || lookupGlobal('newRoundRequest');
    this.revealBotCards = options.revealBotCards || lookupGlobal('revealBotCards');
    this.gameState = null;
    this.displayedTrick = [];
    this.gamePhase = 'idle';
  }

  async newGame() {
    if (this.gameState && this.gameState.roundComplete && this.newRoundRequest) {
      return this.startNextRound();
    }

    return this.startNewGame('sauspiel', null);
  }

  async startNewGame(gameType = 'sauspiel', soloSuit = null) {
    this.gamePhase = 'game-creating';
    this.displayedTrick = [];
    this.updateUI();
    this.showMessage('Creating backend game...', 'info');

    try {
      const state = await this.requireFunction(this.createGameRequest, 'createGame')(gameType, soloSuit);
      this.applyServerState(state);
      this.showTurnMessage();
    } catch (error) {
      this.handleError(error, 'Could not create a new game.');
    }
  }

  async startNextRound() {
    if (!this.gameState) {
      return this.startNewGame('sauspiel', null);
    }

    this.gamePhase = 'game-creating';
    this.displayedTrick = [];
    this.updateUI();
    this.showMessage('Starting the next round...', 'info');

    try {
      const state = await this.requireFunction(this.newRoundRequest, 'newRound')(this.gameState.sessionId);
      this.applyServerState(state);
      this.showTurnMessage();
    } catch (error) {
      this.handleError(error, 'Could not start the next round.');
    }
  }

  async playCard(cardIndex) {
    if (!this.gameState || !this.gameState.humanTurn || this.gamePhase !== 'human-turn') {
      this.showMessage('Wait for your turn before playing a card.', 'error');
      return;
    }

    const card = this.gameState.humanHand[cardIndex];
    if (!card) {
      this.showMessage('Invalid card.', 'error');
      return;
    }

    const humanSeat = this.gameState.humanSeat;
    const previousState = this.gameState;
    this.gamePhase = 'submitting';
    this.displayedTrick = [...(previousState.currentTrick || []), { seat: humanSeat, card }];
    this.updateUI();
    this.showMessage(`You played ${this.describeCard(card)}. Waiting for bots...`, 'info');

    try {
      const nextState = await this.requireFunction(this.playCardRequest, 'playCard')(
        previousState.sessionId,
        cardIndex
      );
      const resolvedTrick = this.getLatestResolvedTrick(previousState, nextState);

      if (resolvedTrick) {
        this.gamePhase = 'bots-resolving';
        this.displayedTrick = resolvedTrick.filter((play) => this.getSeat(play) === humanSeat);
        this.updateUI();

        await this.requireFunction(this.revealBotCards, 'revealBotCards')(
          resolvedTrick,
          humanSeat,
          (play) => {
            this.upsertDisplayedPlay(play);
            this.updateTrick();
            this.showMessage(
              `${this.getSeatLabel(this.getSeat(play))} played ${this.describeCard(play.card)}.`,
              'info'
            );
          }
        );
      }

      this.applyServerState(nextState, resolvedTrick);
      this.showTurnMessage();
    } catch (error) {
      this.gameState = previousState;
      this.displayedTrick = previousState.currentTrick ? [...previousState.currentTrick] : [];
      this.handleError(error, 'Could not play the selected card.');
    }
  }

  requireFunction(fn, name) {
    if (typeof fn !== 'function') {
      throw new Error(`${name} is not available in the browser context`);
    }

    return fn;
  }

  applyServerState(state, resolvedTrick = null) {
    this.gameState = state;

    if (Array.isArray(state.currentTrick) && state.currentTrick.length > 0) {
      this.displayedTrick = [...state.currentTrick];
    } else if (resolvedTrick && resolvedTrick.length > 0) {
      this.displayedTrick = [...resolvedTrick];
    } else {
      this.displayedTrick = [];
    }

    if (state.roundComplete) {
      this.gamePhase = 'round-complete';
    } else if (state.humanTurn) {
      this.gamePhase = 'human-turn';
    } else {
      this.gamePhase = 'bots-resolving';
    }

    this.updateUI();
  }

  getLatestResolvedTrick(previousState, nextState) {
    const previousCount = previousState?.completedTricks?.length || 0;
    const completedTricks = Array.isArray(nextState.completedTricks) ? nextState.completedTricks : [];

    if (completedTricks.length > previousCount) {
      return completedTricks[completedTricks.length - 1];
    }

    return null;
  }

  getSeat(play) {
    if (typeof play?.seat === 'number') {
      return play.seat;
    }

    return play?.player;
  }

  upsertDisplayedPlay(play) {
    const seat = this.getSeat(play);
    const existingIndex = this.displayedTrick.findIndex(
      (currentPlay) => this.getSeat(currentPlay) === seat
    );

    if (existingIndex >= 0) {
      this.displayedTrick[existingIndex] = play;
      return;
    }

    this.displayedTrick.push(play);
  }

  getSeatLabel(seat) {
    if (seat === 0) {
      return 'You';
    }

    return `Bot ${seat}`;
  }

  describeCard(card) {
    const suitNames = {
      E: 'Eichel',
      G: 'Gras',
      H: 'Herz',
      S: 'Schellen'
    };

    return `${card.rank} of ${suitNames[card.suit] || card.suit}`;
  }

  getPhaseLabel() {
    const labels = {
      idle: 'Idle',
      'game-creating': 'Creating Game',
      'human-turn': 'Your Turn',
      submitting: 'Submitting Move',
      'bots-resolving': 'Bots Playing',
      'round-complete': 'Round Complete',
      error: 'Error'
    };

    return labels[this.gamePhase] || 'Playing';
  }

  showTurnMessage() {
    if (!this.gameState) {
      this.showMessage('Welcome to Sauspiel! Click "New Game" to start.', 'info');
      return;
    }

    if (this.gameState.roundComplete) {
      const winnerLabel = this.gameState.winner === 'team' ? 'Your team' : 'The bots';
      this.showMessage(
        `${winnerLabel} won the round. Click "New Game" to continue.`,
        'success'
      );
      return;
    }

    if (this.gameState.humanTurn) {
      this.showMessage('Your turn. Pick one card and the bots will respond automatically.', 'info');
      return;
    }

    this.showMessage('Waiting for bot actions...', 'info');
  }

  handleError(error, fallbackMessage) {
    this.gamePhase = 'error';
    this.updateUI();

    if (error && error.status === 0) {
      this.showMessage(
        'Could not reach the backend. Start the Spring Boot server and open this page via http://localhost:5500 or http://localhost:3000.',
        'error'
      );
      return;
    }

    this.showMessage(error?.message || fallbackMessage, 'error');
  }

  updateUI() {
    if (!this.document) {
      return;
    }

    this.updateDealer();
    this.updatePhase();
    this.updatePlayerHand();
    this.updateScores();
    this.updateTrick();
    this.updateControls();
  }

  updateDealer() {
    const dealerDisplay = this.document.getElementById('dealerDisplay');
    if (!dealerDisplay) {
      return;
    }

    if (!this.gameState) {
      dealerDisplay.textContent = '—';
      return;
    }

    dealerDisplay.textContent = this.getSeatLabel(this.gameState.leadSeat);
  }

  updatePhase() {
    const phaseDisplay = this.document.getElementById('phaseDisplay');
    if (phaseDisplay) {
      phaseDisplay.textContent = this.getPhaseLabel();
    }
  }

  updatePlayerHand() {
    const handContainer = this.document.getElementById('playerHand');
    const playerNumber = this.document.getElementById('playerNumber');
    if (!handContainer) {
      return;
    }

    const hand = this.gameState?.humanHand || [];
    handContainer.innerHTML = '';
    handContainer.classList.toggle('is-disabled', this.gamePhase !== 'human-turn');

    hand.forEach((card, index) => {
      const cardEl = this.createCardElement(card);
      if (this.gamePhase === 'human-turn') {
        cardEl.classList.add('playable');
        cardEl.onclick = () => {
          this.playCard(index);
        };
      }

      handContainer.appendChild(cardEl);
    });

    if (playerNumber) {
      playerNumber.textContent = 'You';
    }
  }

  updateScores() {
    const rows = [
      { label: 'You', value: this.gameState ? this.gameState.scores.team : '—' },
      { label: 'Bots', value: this.gameState ? this.gameState.scores.opponents : '—' },
      {
        label: 'Tricks',
        value: this.gameState ? `${this.gameState.trickCount}/8` : '—'
      },
      {
        label: 'Lead',
        value: this.gameState ? this.getSeatLabel(this.gameState.leadSeat) : '—'
      }
    ];

    rows.forEach((row, index) => {
      const scoreEl = this.document.getElementById(`score-${index}`);
      if (!scoreEl) {
        return;
      }

      const nameEl = scoreEl.querySelector('.player-name');
      const valueEl = scoreEl.querySelector('.player-score');
      if (nameEl) {
        nameEl.textContent = row.label;
      }
      if (valueEl) {
        valueEl.textContent = row.value;
      }
      scoreEl.classList.toggle(
        'active-player',
        Boolean(this.gameState) && row.label === this.getSeatLabel(this.gameState.leadSeat)
      );
    });
  }

  updateTrick() {
    const trickContainer = this.document.getElementById('trickCards');
    if (!trickContainer) {
      return;
    }

    trickContainer.innerHTML = '';

    for (let seat = 0; seat < 4; seat += 1) {
      const position = this.document.createElement('div');
      position.className = 'trick-position';
      position.id = `trick-${seat}`;

      const playedCard = this.displayedTrick.find((play) => this.getSeat(play) === seat);
      if (playedCard) {
        position.appendChild(this.createCardElement(playedCard.card));
      } else {
        const placeholder = this.document.createElement('div');
        placeholder.className = 'placeholder';
        placeholder.textContent = this.getSeatLabel(seat);
        position.appendChild(placeholder);
      }

      trickContainer.appendChild(position);
    }
  }

  updateControls() {
    const biddingSection = this.document.getElementById('biddingSection');
    const newGameBtn = this.document.getElementById('newGameBtn');

    if (biddingSection) {
      biddingSection.classList.add('hidden');
    }

    if (newGameBtn) {
      newGameBtn.textContent =
        this.gameState && this.gameState.roundComplete ? 'Next Round' : 'New Game';
    }
  }

  createCardElement(card) {
    const el = this.document.createElement('div');
    el.className = 'card';
    const suitMap = { E: 'diamond', G: 'club', H: 'heart', S: 'spade' };
    el.classList.add(`suit-${suitMap[card.suit]}`);
    el.textContent = card.rank;
    el.title = this.describeCard(card);
    return el;
  }

  showMessage(text, type = 'info') {
    if (!this.document) {
      return;
    }

    const messageBox = this.document.getElementById('messageBox');
    if (!messageBox) {
      return;
    }

    messageBox.textContent = text;
    messageBox.className = `message-box ${type}`;
  }

  bindUI() {
    if (!this.document) {
      return;
    }

    const newGameBtn = this.document.getElementById('newGameBtn');
    const bidBtn = this.document.getElementById('bidBtn');
    const passBtn = this.document.getElementById('passBtn');

    if (newGameBtn) {
      newGameBtn.addEventListener('click', () => {
        this.newGame();
      });
    }

    if (bidBtn) {
      bidBtn.addEventListener('click', () => {
        this.showMessage('Bidding is handled by the backend flow for this build.', 'info');
      });
    }

    if (passBtn) {
      passBtn.addEventListener('click', () => {
        this.showMessage('Use "New Game" to start a backend session.', 'info');
      });
    }
  }
}

function initializeSauspielGame(doc = typeof document !== 'undefined' ? document : null) {
  const game = new SauspielGame({ document: doc });
  game.bindUI();
  game.showTurnMessage();
  return game;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    SauspielGame,
    initializeSauspielGame
  };
}

if (typeof window !== 'undefined') {
  window.SauspielGame = SauspielGame;
  window.initializeSauspielGame = initializeSauspielGame;
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      if (!window.__SAUSPIEL_GAME__) {
        window.__SAUSPIEL_GAME__ = initializeSauspielGame(document);
      }
    });
  } else if (typeof window !== 'undefined' && !window.__SAUSPIEL_GAME__) {
    window.__SAUSPIEL_GAME__ = initializeSauspielGame(document);
  }
}
