const {
  ApiError,
  createGame,
  getGameState,
  playCard,
  newRound
} = require('../src/apiClient');

describe('apiClient', () => {
  afterEach(() => {
    delete global.window;
    jest.resetAllMocks();
  });

  test('createGame sends POST to /api/games with correct body', async () => {
    const mockState = { sessionId: 's1' };
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue(mockState)
    });

    const result = await createGame('sauspiel', null);

    expect(result).toEqual(mockState);
    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:8080/api/games',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ gameType: 'sauspiel', soloSuit: null })
      })
    );
  });

  test('createGame uses custom window.API_BASE_URL when provided', async () => {
    global.window = { API_BASE_URL: 'http://localhost:9000/' };
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ sessionId: 's2' })
    });

    await createGame('wenz');

    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:9000/api/games',
      expect.any(Object)
    );
  });

  test('getGameState sends GET to /api/games/{id}', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ sessionId: 'abc' })
    });

    await getGameState('abc');

    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:8080/api/games/abc',
      expect.objectContaining({
        headers: { 'Content-Type': 'application/json' }
      })
    );
  });

  test('playCard sends POST to /api/games/{id}/play with { cardIndex }', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ sessionId: 'abc' })
    });

    await playCard('abc', 3);

    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:8080/api/games/abc/play',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ cardIndex: 3 })
      })
    );
  });

  test('newRound sends POST to /api/games/{id}/new-round', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ sessionId: 'abc' })
    });

    await newRound('abc');

    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:8080/api/games/abc/new-round',
      expect.objectContaining({
        method: 'POST'
      })
    );
  });

  test('all requests include Content-Type application/json header', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({})
    });

    await getGameState('a1');

    const [, options] = global.fetch.mock.calls[0];
    expect(options.headers).toEqual({ 'Content-Type': 'application/json' });
  });

  test('throws ApiError with status and message for non-ok response', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 400,
      statusText: 'Bad Request',
      json: jest.fn().mockResolvedValue({ error: 'Invalid move' })
    });

    await expect(playCard('s1', 99)).rejects.toMatchObject({
      name: 'ApiError',
      status: 400,
      message: 'Invalid move'
    });
  });

  test('ApiError is instance of Error and ApiError', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 404,
      statusText: 'Not Found',
      json: jest.fn().mockResolvedValue({ error: 'Session not found' })
    });

    try {
      await getGameState('missing');
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(ApiError);
      expect(error.status).toBe(404);
      expect(error.message).toBe('Session not found');
      return;
    }

    throw new Error('Expected getGameState to throw');
  });

  test('throws ApiError with statusText when error body is non-JSON', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 502,
      statusText: 'Bad Gateway',
      json: jest.fn().mockRejectedValue(new SyntaxError('Unexpected token <')),
      text: jest.fn().mockResolvedValue('<html>Bad Gateway</html>')
    });

    await expect(getGameState('abc')).rejects.toMatchObject({
      name: 'ApiError',
      status: 502,
      message: '<html>Bad Gateway</html>'
    });
  });

  test('throws ApiError for fetch network failure', async () => {
    global.fetch = jest.fn().mockRejectedValue(new TypeError('Failed to fetch'));

    await expect(createGame('sauspiel', null)).rejects.toMatchObject({
      name: 'ApiError',
      status: 0,
      message: 'Failed to fetch'
    });
  });
});
