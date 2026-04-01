/** @jest-environment jsdom */

const fs = require('fs');
const path = require('path');

const { toCardPresentation } = require('../src/cardPresentation');

function buildGameDom() {
  document.body.innerHTML = `
    <button id="newGameBtn">New Game</button>
    <button id="bidBtn">Bid</button>
    <button id="passBtn">Pass</button>

    <div id="dealerDisplay"></div>
    <div id="phaseDisplay"></div>
    <div id="playerHand"></div>
    <div id="playerNumber"></div>
    <div id="trickCards"></div>
    <section id="biddingSection" class="hidden"></section>
    <div id="messageBox"></div>

    <div id="score-0"><span class="player-score">0</span></div>
    <div id="score-1"><span class="player-score">0</span></div>
    <div id="score-2"><span class="player-score">0</span></div>
    <div id="score-3"><span class="player-score">0</span></div>
  `;
}

function installGameGlobals() {
  global.createLongDeck = jest.fn(() => []);
  global.dealCards = jest.fn(() => [[], [], [], []]);
  global.isTrump = jest.fn((card) => card.suit === 'H' || card.rank === 'O' || card.rank === 'U');
  global.GAME_TYPES = { SAUSPIEL: 'SAUSPIEL' };
  global.determineTrickWinner = jest.fn(() => 0);
  global.countTrickPoints = jest.fn(() => 0);
  global.getVisiblePlayer = jest.fn((phase, currentPlayer, fallbackPlayer) =>
    phase === 'idle' ? fallbackPlayer : currentPlayer
  );
  global.shouldShowBiddingControls = jest.fn(() => false);
  global.toCardPresentation = toCardPresentation;
}

let SauspielGame;

beforeAll(() => {
  buildGameDom();
  installGameGlobals();

  const gameSource = fs.readFileSync(
    path.join(__dirname, '..', 'src', 'game.js'),
    'utf8'
  );

  window.eval(`${gameSource}\nwindow.__SauspielGame = SauspielGame;`);
  SauspielGame = window.__SauspielGame;
});

beforeEach(() => {
  buildGameDom();
});

describe('UI text-first card rendering', () => {
  test('renders rank+suit text in the hand area', () => {
    const game = new SauspielGame();
    game.gamePhase = 'playing';
    game.currentPlayer = 0;
    game.playerHands = [
      [
        { suit: 'E', rank: 'A' },
        { suit: 'G', rank: '10' }
      ],
      [],
      [],
      []
    ];
    game.currentTrick = [];

    game.updatePlayerHand();

    const cards = Array.from(document.querySelectorAll('#playerHand .card'));
    expect(cards).toHaveLength(2);

    expect(cards[0].querySelector('.card-primary').textContent).toBe('A Eichel');
    expect(cards[0].querySelector('.card-secondary').textContent).toBe('Ass Eichel');

    expect(cards[1].querySelector('.card-primary').textContent).toBe('10 Gras');
    expect(cards[1].querySelector('.card-secondary').textContent).toBe('Zehn Gras');
  });

  test('renders rank+suit text in trick positions', () => {
    const game = new SauspielGame();
    game.currentTrick = [{ player: 1, card: { suit: 'H', rank: 'K' } }];

    game.updateTrick();

    const played = document.querySelector('#trick-1 .card');
    expect(played).not.toBeNull();
    expect(played.querySelector('.card-primary').textContent).toBe('K Herz');
    expect(played.querySelector('.card-secondary').textContent).toBe('Koenig Herz');

    expect(document.querySelector('#trick-0 .placeholder').textContent).toBe('Player 0');
  });

  test('keeps disabled/playable semantics for non-playable cards', () => {
    const game = new SauspielGame();
    game.gamePhase = 'playing';
    game.currentPlayer = 0;
    game.playerHands = [
      [
        { suit: 'E', rank: 'A' },
        { suit: 'G', rank: 'A' }
      ],
      [],
      [],
      []
    ];
    game.currentTrick = [{ player: 2, card: { suit: 'E', rank: 'K' } }];

    game.updatePlayerHand();

    const cards = Array.from(document.querySelectorAll('#playerHand button.card'));
    expect(cards).toHaveLength(2);

    expect(cards[0].disabled).toBe(false);
    expect(cards[0].getAttribute('aria-disabled')).toBe('false');
    expect(cards[0].dataset.stateLabel).toBe('Playable');
    expect(cards[0].classList.contains('playable')).toBe(true);

    expect(cards[1].disabled).toBe(true);
    expect(cards[1].getAttribute('aria-disabled')).toBe('true');
    expect(cards[1].dataset.stateLabel).toBe('Not playable');
    expect(cards[1].title).toBe('Not playable right now');
    expect(cards[1].classList.contains('playable')).toBe(false);
  });
});
