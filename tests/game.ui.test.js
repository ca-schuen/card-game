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
  global.createGame = jest.fn();
  global.playCardRequest = jest.fn();
  global.newRoundRequest = jest.fn();
  global.revealBotCards = jest.fn();
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
    game.gamePhase = 'human-turn';
    game.gameState = {
      humanTurn: true,
      legalCardIndices: [0, 1],
      humanHand: [
        { suit: 'E', rank: 'A' },
        { suit: 'G', rank: '10' }
      ]
    };

    game.updatePlayerHand();

    const cards = Array.from(document.querySelectorAll('#playerHand button.card'));
    expect(cards).toHaveLength(2);

    expect(cards[0].querySelector('.card-primary').textContent).toBe('A Eichel');
    expect(cards[0].querySelector('.card-secondary').textContent).toBe('Ass Eichel');

    expect(cards[1].querySelector('.card-primary').textContent).toBe('10 Gras');
    expect(cards[1].querySelector('.card-secondary').textContent).toBe('Zehn Gras');
  });

  test('renders rank+suit text in trick positions', () => {
    const game = new SauspielGame();
    game.displayedTrick = [{ seat: 1, card: { suit: 'H', rank: 'K' } }];

    game.updateTrick();

    const played = document.querySelector('#trick-1 .card');
    expect(played).not.toBeNull();
    expect(played.querySelector('.card-primary').textContent).toBe('K Herz');
    expect(played.querySelector('.card-secondary').textContent).toBe('Koenig Herz');

    expect(document.querySelector('#trick-0 .placeholder').textContent).toBe('You');
  });

  test('keeps disabled/playable semantics for non-playable cards', () => {
    const game = new SauspielGame();
    game.gamePhase = 'human-turn';
    game.gameState = {
      humanTurn: true,
      legalCardIndices: [0],
      humanHand: [
        { suit: 'E', rank: 'A' },
        { suit: 'G', rank: 'A' }
      ]
    };

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
