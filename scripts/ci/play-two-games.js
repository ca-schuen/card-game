#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const CREATE_ENDPOINTS = ['/api/games', '/games'];
const PLAY_ENDPOINTS = ['simulate', 'autoplay', 'play-all', 'play'];

function parseArgs(argv) {
  const args = {
    backendUrl: process.env.SMOKE_BACKEND_BASE_URL || 'http://127.0.0.1:8080',
    gameCount: Number(process.env.SMOKE_GAME_COUNT || 2),
    output: process.env.SMOKE_GAMES_OUTPUT || 'artifacts/smoke/games.json'
  };

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === '--backend-url') {
      args.backendUrl = argv[i + 1];
      i += 1;
    } else if (token === '--game-count') {
      args.gameCount = Number(argv[i + 1]);
      i += 1;
    } else if (token === '--output') {
      args.output = argv[i + 1];
      i += 1;
    }
  }

  return args;
}

function ensureDirFor(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function normalizeBaseUrl(url) {
  return url.endsWith('/') ? url.slice(0, -1) : url;
}

async function fetchJson(url, init) {
  try {
    const response = await fetch(url, init);
    const text = await response.text();
    let json = null;
    if (text) {
      try {
        json = JSON.parse(text);
      } catch (_error) {
        json = null;
      }
    }

    return {
      ok: response.ok,
      status: response.status,
      url,
      json,
      text: text.slice(0, 300)
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      url,
      json: null,
      text: String(error && error.message ? error.message : error)
    };
  }
}

function extractGameId(payload) {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  if (payload.id) {
    return payload.id;
  }

  if (payload.gameId) {
    return payload.gameId;
  }

  if (payload.game && typeof payload.game === 'object') {
    return payload.game.id || payload.game.gameId || null;
  }

  return null;
}

function isCompletedPayload(payload) {
  if (!payload || typeof payload !== 'object') {
    return false;
  }

  const status = String(payload.status || payload.state || '').toLowerCase();
  return status === 'finished' || status === 'completed' || Boolean(payload.winner || payload.winners);
}

async function createGame(baseUrl, diagnostics) {
  for (const endpoint of CREATE_ENDPOINTS) {
    const url = `${baseUrl}${endpoint}`;
    const result = await fetchJson(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{}'
    });

    diagnostics.push({ phase: 'create', endpoint, status: result.status, snippet: result.text });

    if (result.ok) {
      return result;
    }
  }

  return null;
}

async function completeGame(baseUrl, gameId, diagnostics) {
  for (const endpoint of PLAY_ENDPOINTS) {
    const url = `${baseUrl}/api/games/${encodeURIComponent(gameId)}/${endpoint}`;
    const result = await fetchJson(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{}'
    });

    diagnostics.push({ phase: 'play', endpoint: `/api/games/{id}/${endpoint}`, status: result.status, snippet: result.text });

    if (result.ok || isCompletedPayload(result.json)) {
      return result;
    }
  }

  const fallback = await fetchJson(`${baseUrl}/api/games/${encodeURIComponent(gameId)}`, {
    method: 'GET'
  });
  diagnostics.push({ phase: 'play', endpoint: '/api/games/{id}', status: fallback.status, snippet: fallback.text });

  if (fallback.ok && isCompletedPayload(fallback.json)) {
    return fallback;
  }

  return null;
}

async function runGames(options) {
  const baseUrl = normalizeBaseUrl(options.backendUrl);
  const games = [];
  const diagnostics = [];

  console.log(`SMOKE_PHASE Run game 1`);
  for (let gameIndex = 1; gameIndex <= options.gameCount; gameIndex += 1) {
    if (gameIndex === 2) {
      console.log('SMOKE_PHASE Run game 2');
    }

    const startedAt = Date.now();
    const gameDiagnostics = [];

    const created = await createGame(baseUrl, gameDiagnostics);
    if (!created) {
      games.push({
        index: gameIndex,
        status: 'FAIL',
        failureType: 'unexpected-error',
        message: 'Unable to create game using known endpoints',
        durationMs: Date.now() - startedAt,
        diagnostics: gameDiagnostics
      });
      diagnostics.push(...gameDiagnostics.map((item) => ({ gameIndex, ...item })));
      continue;
    }

    const gameId = extractGameId(created.json);
    if (!gameId && isCompletedPayload(created.json)) {
      games.push({
        index: gameIndex,
        status: 'PASS',
        mode: 'immediate-complete',
        durationMs: Date.now() - startedAt,
        diagnostics: gameDiagnostics
      });
      diagnostics.push(...gameDiagnostics.map((item) => ({ gameIndex, ...item })));
      continue;
    }

    if (!gameId) {
      games.push({
        index: gameIndex,
        status: 'FAIL',
        failureType: 'unexpected-error',
        message: 'Create response did not include a game identifier',
        durationMs: Date.now() - startedAt,
        diagnostics: gameDiagnostics
      });
      diagnostics.push(...gameDiagnostics.map((item) => ({ gameIndex, ...item })));
      continue;
    }

    const completed = await completeGame(baseUrl, gameId, gameDiagnostics);
    if (!completed) {
      games.push({
        index: gameIndex,
        status: 'FAIL',
        failureType: 'unexpected-error',
        gameId,
        message: 'Unable to complete game using known endpoints',
        durationMs: Date.now() - startedAt,
        diagnostics: gameDiagnostics
      });
      diagnostics.push(...gameDiagnostics.map((item) => ({ gameIndex, gameId, ...item })));
      continue;
    }

    games.push({
      index: gameIndex,
      status: 'PASS',
      gameId,
      durationMs: Date.now() - startedAt,
      diagnostics: gameDiagnostics
    });
    diagnostics.push(...gameDiagnostics.map((item) => ({ gameIndex, gameId, ...item })));
  }

  const summary = {
    phase: 'Run game 1/2',
    backendUrl: baseUrl,
    gameCount: options.gameCount,
    passedGames: games.filter((game) => game.status === 'PASS').length,
    games,
    diagnostics
  };

  ensureDirFor(options.output);
  fs.writeFileSync(options.output, JSON.stringify(summary, null, 2));

  return summary;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const summary = await runGames(args);

  if (summary.passedGames < args.gameCount) {
    throw new Error(`Only ${summary.passedGames}/${args.gameCount} games completed successfully`);
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(`SMOKE_DIAG ${JSON.stringify({
      type: 'unexpected-error',
      failedPhase: 'Run game 1/2',
      message: error.message,
      suggestedOwner: 'backend',
      suggestedNextCommand: 'npm run smoke:ci'
    })}`);
    process.exit(1);
  });
}

module.exports = {
  runGames,
  parseArgs,
  extractGameId,
  isCompletedPayload
};
