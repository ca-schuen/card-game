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
    this.cardPresentation = options.toCardPresentation || lookupGlobal('toCardPresentation');
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

    // Check if the card is legal to play
    if (!this.isCardLegal(cardIndex)) {
      this.showMessage('You cannot play this card. Follow the suit if possible.', 'error');
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
      const isHumanTurn = this.gamePhase === 'human-turn';
      const isPlayable = isHumanTurn && this.isCardLegal(index);
      const cardEl = this.createCardElement(card, {
        interactive: true,
        playable: isPlayable
      });

      if (isPlayable) {
        cardEl.onclick = () => {
          this.playCard(index);
        };
      }

      cardEl.disabled = !isPlayable;
      if (typeof cardEl.setAttribute === 'function') {
        cardEl.setAttribute('aria-disabled', String(!isPlayable));
      } else {
        cardEl['aria-disabled'] = String(!isPlayable);
      }
      if (!cardEl.dataset) {
        cardEl.dataset = {};
      }
      cardEl.dataset.stateLabel = isPlayable ? 'Playable' : 'Not playable';

      if (isHumanTurn && !isPlayable) {
        cardEl.classList.add('is-illegal');
        cardEl.title = 'Not playable right now';
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
        position.appendChild(
          this.createCardElement(playedCard.card, { interactive: false })
        );
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

  isCardLegal(cardIndex) {
    // If legalCardIndices is not available, treat all cards as legal (on not human's turn)
    if (!this.gameState || !this.gameState.humanTurn) {
      return true;
    }

    const legalIndices = this.gameState.legalCardIndices;
    if (!Array.isArray(legalIndices) || legalIndices.length === 0) {
      // No restrictions, all cards are legal
      return true;
    }

    return legalIndices.includes(cardIndex);
  }

  createCardElement(card, options = {}) {
    const presentation = this.getCardPresentation(card);
    const isInteractive = Boolean(options.interactive);
    const el = this.document.createElement(isInteractive ? 'button' : 'div');

    if (isInteractive) {
      el.type = 'button';
    }

    el.className = `card ${presentation.semanticClass}`;

    if (options.playable) {
      el.classList.add('playable');
    }

    if (!presentation.isKnownCard) {
      el.classList.add('card-fallback');
    }

    const primaryLine = this.document.createElement('span');
    primaryLine.className = 'card-primary';
    primaryLine.textContent = presentation.shortLabel;

    const secondaryLine = this.document.createElement('span');
    secondaryLine.className = 'card-secondary';
    secondaryLine.textContent = presentation.ariaLabel;

    el.appendChild(primaryLine);
    el.appendChild(secondaryLine);

    if (typeof el.setAttribute === 'function') {
      el.setAttribute('aria-label', presentation.ariaLabel);
      el.setAttribute('title', presentation.shortLabel);
    } else {
      el['aria-label'] = presentation.ariaLabel;
      el.title = presentation.shortLabel;
    }

    return el;
  }

  getCardPresentation(card) {
    if (typeof this.cardPresentation === 'function') {
      return this.cardPresentation(card);
    }

    const suitNames = {
      E: 'Eichel',
      G: 'Gras',
      H: 'Herz',
      S: 'Schellen'
    };

    const rankCode = typeof card?.rank === 'string' && card.rank ? card.rank : '?';
    const suitCode = typeof card?.suit === 'string' && card.suit ? card.suit : '?';
    const suitText = suitNames[suitCode] || suitCode;

    return {
      shortLabel: `${rankCode} ${suitText}`,
      ariaLabel: `${rankCode} ${suitText}`,
      semanticClass: 'suit-unknown',
      isKnownCard: Boolean(suitNames[suitCode])
    };
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
