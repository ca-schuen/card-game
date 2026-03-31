const DEFAULT_API_BASE_URL = 'http://localhost:8080';

class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.message = message;
  }
}

function getApiBaseUrl() {
  if (
    typeof window !== 'undefined' &&
    typeof window.API_BASE_URL === 'string' &&
    window.API_BASE_URL.trim() !== ''
  ) {
    return window.API_BASE_URL.trim().replace(/\/+$/, '');
  }

  return DEFAULT_API_BASE_URL;
}

async function request(path, options = {}) {
  let response;
  try {
    response = await fetch(`${getApiBaseUrl()}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      }
    });
  } catch (error) {
    throw new ApiError(0, error?.message || 'Network request failed');
  }

  if (!response.ok) {
    let message = response.statusText;

    try {
      const errorBody = await response.json();
      if (errorBody && typeof errorBody.error === 'string' && errorBody.error.trim() !== '') {
        message = errorBody.error;
      }
    } catch {
      if (typeof response.text === 'function') {
        try {
          const textBody = await response.text();
          if (typeof textBody === 'string' && textBody.trim() !== '') {
            message = textBody.trim();
          }
        } catch {
          // Keep statusText fallback.
        }
      }
    }

    throw new ApiError(response.status, message || 'Request failed');
  }

  return response.json();
}

async function createGame(gameType, soloSuit = null) {
  return request('/api/games', {
    method: 'POST',
    body: JSON.stringify({ gameType, soloSuit })
  });
}

async function getGameState(sessionId) {
  return request(`/api/games/${encodeURIComponent(sessionId)}`);
}

async function playCard(sessionId, cardIndex) {
  return request(`/api/games/${encodeURIComponent(sessionId)}/play`, {
    method: 'POST',
    body: JSON.stringify({ cardIndex })
  });
}

async function newRound(sessionId) {
  return request(`/api/games/${encodeURIComponent(sessionId)}/new-round`, {
    method: 'POST'
  });
}

module.exports = {
  ApiError,
  createGame,
  getGameState,
  playCard,
  newRound
};
