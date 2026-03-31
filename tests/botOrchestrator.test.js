const {
  revealBotCards,
  getBotPlaysInOrder
} = require('../src/botOrchestrator');

function createTrick() {
  return [
    { seat: 0, card: { suit: 'E', rank: 'A' } },
    { seat: 1, card: { suit: 'G', rank: '10' } },
    { seat: 2, card: { suit: 'H', rank: 'K' } },
    { seat: 3, card: { suit: 'S', rank: 'U' } }
  ];
}

describe('getBotPlaysInOrder', () => {
  test('returns bot plays in order after human seat 0', () => {
    const ordered = getBotPlaysInOrder(createTrick(), 0);
    expect(ordered.map((p) => p.seat)).toEqual([1, 2, 3]);
  });

  test('wraps order correctly when human seat is 2', () => {
    const ordered = getBotPlaysInOrder(createTrick(), 2);
    expect(ordered.map((p) => p.seat)).toEqual([3, 0, 1]);
  });

  test('returns empty array for empty trick', () => {
    expect(getBotPlaysInOrder([], 0)).toEqual([]);
  });

  test('supports player property fallback', () => {
    const trick = [
      { player: 0, card: { suit: 'E', rank: 'A' } },
      { player: 1, card: { suit: 'G', rank: '10' } },
      { player: 2, card: { suit: 'H', rank: 'K' } },
      { player: 3, card: { suit: 'S', rank: 'U' } }
    ];

    const ordered = getBotPlaysInOrder(trick, 1);
    expect(ordered.map((p) => p.player)).toEqual([2, 3, 0]);
  });

  test('orders bot plays correctly when lead seat is not 0', () => {
    const trick = [
      { seat: 2, card: { suit: 'H', rank: 'A' } },
      { seat: 3, card: { suit: 'H', rank: '10' } },
      { seat: 0, card: { suit: 'H', rank: 'K' } },
      { seat: 1, card: { suit: 'H', rank: '9' } }
    ];

    const ordered = getBotPlaysInOrder(trick, 0);
    expect(ordered.map((p) => p.seat)).toEqual([1, 2, 3]);
  });
});

describe('revealBotCards', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  test('calls onBotCard once per bot seat', async () => {
    const onBotCard = jest.fn();

    await revealBotCards(createTrick(), 0, onBotCard, {
      initialDelayMs: 0,
      betweenDelayMs: 0
    });

    expect(onBotCard).toHaveBeenCalledTimes(3);
    expect(onBotCard.mock.calls.map((call) => call[0].seat)).toEqual([1, 2, 3]);
    expect(onBotCard.mock.calls.map((call) => call[1])).toEqual([0, 1, 2]);
  });

  test('respects initialDelayMs before first reveal', async () => {
    jest.useFakeTimers();
    const onBotCard = jest.fn();

    const revealPromise = revealBotCards(createTrick(), 0, onBotCard, {
      initialDelayMs: 600,
      betweenDelayMs: 400
    });

    await jest.advanceTimersByTimeAsync(599);
    expect(onBotCard).not.toHaveBeenCalled();

    await jest.advanceTimersByTimeAsync(1);
    expect(onBotCard).toHaveBeenCalledTimes(1);

    await jest.runAllTimersAsync();
    await revealPromise;
  });

  test('respects betweenDelayMs between bot reveals', async () => {
    jest.useFakeTimers();
    const onBotCard = jest.fn();

    const revealPromise = revealBotCards(createTrick(), 0, onBotCard, {
      initialDelayMs: 100,
      betweenDelayMs: 250
    });

    await jest.advanceTimersByTimeAsync(100);
    expect(onBotCard).toHaveBeenCalledTimes(1);

    await jest.advanceTimersByTimeAsync(249);
    expect(onBotCard).toHaveBeenCalledTimes(1);

    await jest.advanceTimersByTimeAsync(1);
    expect(onBotCard).toHaveBeenCalledTimes(2);

    await jest.advanceTimersByTimeAsync(250);
    expect(onBotCard).toHaveBeenCalledTimes(3);

    await revealPromise;
  });

  test('throws if onBotCard is not a function', async () => {
    await expect(revealBotCards(createTrick(), 0, null)).rejects.toThrow(
      'onBotCard must be a function'
    );
  });

  test('returns without delay when no bot plays are present', async () => {
    jest.useFakeTimers();
    const onBotCard = jest.fn();

    const promise = revealBotCards([], 0, onBotCard);
    await promise;

    expect(onBotCard).not.toHaveBeenCalled();
  });

  test('reveals in correct order when human seat is not 0', async () => {
    const onBotCard = jest.fn();

    await revealBotCards(createTrick(), 2, onBotCard, {
      initialDelayMs: 0,
      betweenDelayMs: 0
    });

    expect(onBotCard.mock.calls.map((call) => call[0].seat)).toEqual([3, 0, 1]);
    expect(onBotCard.mock.calls.map((call) => call[1])).toEqual([0, 1, 2]);
  });
});
