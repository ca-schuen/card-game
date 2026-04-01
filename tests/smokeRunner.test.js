'use strict';

const {
  evaluatePolicy,
  mergeGameSummaries,
  matchesAllowedMessage,
  parseArgs: parseSmokeRunnerArgs
} = require('../scripts/ci/smoke-runner');
const { parseArgs: parseHealthcheckArgs } = require('../scripts/ci/healthcheck');
const {
  parseArgs: parsePlayGamesArgs,
  extractGameId,
  isCompletedPayload
} = require('../scripts/ci/play-two-games');

describe('smoke-runner policy evaluation', () => {
  test('passes when only allowed diagnostics are present and required games pass', () => {
    const policy = {
      allowedStatuses: [404, 405],
      allowedMessagePatterns: ['validation'],
      maxAllowedErrors: 5,
      requiredPassCount: 2
    };

    const gamesSummary = {
      passedGames: 2,
      diagnostics: [
        { status: 404, snippet: 'not found on fallback endpoint' },
        { status: 422, snippet: 'validation failed but expected' }
      ]
    };

    const result = evaluatePolicy(policy, gamesSummary);
    expect(result.pass).toBe(true);
    expect(result.unexpectedErrors).toHaveLength(0);
  });

  test('fails when unexpected diagnostics are present', () => {
    const policy = {
      allowedStatuses: [404],
      allowedMessagePatterns: ['method not allowed'],
      maxAllowedErrors: 5,
      requiredPassCount: 2
    };

    const gamesSummary = {
      passedGames: 2,
      diagnostics: [
        { status: 500, snippet: 'server exploded' }
      ]
    };

    const result = evaluatePolicy(policy, gamesSummary);
    expect(result.pass).toBe(false);
    expect(result.policyFailures).toContain('unexpected errors detected: 1');
  });

  test('treats status 0 diagnostics as allowed when message matches policy pattern', () => {
    const policy = {
      allowedStatuses: [404],
      allowedMessagePatterns: ['fetch failed'],
      maxAllowedErrors: 3,
      requiredPassCount: 1
    };

    const gamesSummary = {
      passedGames: 1,
      diagnostics: [
        { status: 0, snippet: 'TypeError: fetch failed' }
      ]
    };

    const result = evaluatePolicy(policy, gamesSummary);
    expect(result.pass).toBe(true);
    expect(result.unexpectedErrors).toHaveLength(0);
  });

  test('fails when requiredPassCount is not met', () => {
    const policy = {
      allowedStatuses: [404, 405],
      allowedMessagePatterns: ['validation'],
      maxAllowedErrors: 5,
      requiredPassCount: 2
    };

    const gamesSummary = {
      passedGames: 1,
      diagnostics: []
    };

    const result = evaluatePolicy(policy, gamesSummary);
    expect(result.pass).toBe(false);
    expect(result.policyFailures).toContain('requiredPassCount not met: 1/2');
  });

  test('fails when maxAllowedErrors is exceeded', () => {
    const policy = {
      allowedStatuses: [404],
      allowedMessagePatterns: ['method not allowed'],
      maxAllowedErrors: 1,
      requiredPassCount: 1
    };

    const gamesSummary = {
      passedGames: 1,
      diagnostics: [
        { status: 404, snippet: 'not found endpoint one' },
        { status: 500, snippet: 'boom endpoint two' }
      ]
    };

    const result = evaluatePolicy(policy, gamesSummary);
    expect(result.pass).toBe(false);
    expect(result.policyFailures).toContain('maxAllowedErrors exceeded: 2/1');
    expect(result.policyFailures).toContain('unexpected errors detected: 1');
  });

  test('does not fail maxAllowedErrors when count equals threshold', () => {
    const policy = {
      allowedStatuses: [404],
      allowedMessagePatterns: [],
      maxAllowedErrors: 2,
      requiredPassCount: 1
    };

    const gamesSummary = {
      passedGames: 1,
      diagnostics: [
        { status: 404, snippet: 'not found one' },
        { status: 404, snippet: 'not found two' }
      ]
    };

    const result = evaluatePolicy(policy, gamesSummary);
    expect(result.policyFailures).not.toContain('maxAllowedErrors exceeded: 2/2');
    expect(result.pass).toBe(true);
  });

  test('merges per-game outputs into a single deterministic summary', () => {
    const merged = mergeGameSummaries([
      {
        games: [{ index: 99, status: 'PASS', durationMs: 10 }],
        diagnostics: [{ status: 404, snippet: 'missing endpoint' }]
      },
      {
        games: [{ index: 55, status: 'FAIL', durationMs: 12 }],
        diagnostics: [{ status: 500, snippet: 'boom' }]
      }
    ]);

    expect(merged.gameCount).toBe(2);
    expect(merged.passedGames).toBe(1);
    expect(merged.games[0].index).toBe(1);
    expect(merged.games[1].index).toBe(2);
    expect(merged.games[0].status).toBe('PASS');
    expect(merged.games[1].status).toBe('FAIL');
    expect(merged.diagnostics).toHaveLength(2);
  });

  test('mergeGameSummaries handles empty inputs', () => {
    const merged = mergeGameSummaries([]);
    expect(merged.gameCount).toBe(0);
    expect(merged.passedGames).toBe(0);
    expect(merged.games).toEqual([]);
    expect(merged.diagnostics).toEqual([]);
  });

  test('message matcher is case-insensitive', () => {
    expect(matchesAllowedMessage(['Not Found'], 'resource not found')).toBe(true);
  });

  test('message matcher returns false when there is no match', () => {
    expect(matchesAllowedMessage(['timeout'], 'resource not found')).toBe(false);
  });
});

describe('smoke-runner argument parsing', () => {
  test('parses validate mode with comma-separated game paths', () => {
    const parsed = parseSmokeRunnerArgs([
      '--mode', 'validate',
      '--artifact-dir', 'tmp/smoke',
      '--policy-path', 'tmp/policy.json',
      '--health-path', 'tmp/health.json',
      '--games', 'tmp/g1.json,tmp/g2.json'
    ]);

    expect(parsed.mode).toBe('validate');
    expect(parsed.artifactDir).toBe('tmp/smoke');
    expect(parsed.policyPath).toBe('tmp/policy.json');
    expect(parsed.healthPath).toBe('tmp/health.json');
    expect(parsed.gamesPaths).toEqual(['tmp/g1.json', 'tmp/g2.json']);
  });

  test('filters empty game path tokens when parsing --games', () => {
    const parsed = parseSmokeRunnerArgs([
      '--games', 'tmp/g1.json, ,tmp/g2.json,'
    ]);

    expect(parsed.gamesPaths).toEqual(['tmp/g1.json', 'tmp/g2.json']);
  });
});

describe('healthcheck argument parsing', () => {
  test('parses explicit healthcheck CLI arguments', () => {
    const parsed = parseHealthcheckArgs([
      '--url', 'http://localhost:9999/health',
      '--timeout-ms', '1234',
      '--interval-ms', '55',
      '--output', 'tmp/healthcheck.json'
    ]);

    expect(parsed.url).toBe('http://localhost:9999/health');
    expect(parsed.timeoutMs).toBe(1234);
    expect(parsed.intervalMs).toBe(55);
    expect(parsed.output).toBe('tmp/healthcheck.json');
  });
});

describe('play-two-games helpers and argument parsing', () => {
  test('parses explicit game-runner CLI arguments', () => {
    const parsed = parsePlayGamesArgs([
      '--backend-url', 'http://localhost:9000/',
      '--game-count', '3',
      '--output', 'tmp/games.json'
    ]);

    expect(parsed.backendUrl).toBe('http://localhost:9000/');
    expect(parsed.gameCount).toBe(3);
    expect(parsed.output).toBe('tmp/games.json');
  });

  test('extractGameId supports id, gameId, and nested game payloads', () => {
    expect(extractGameId({ id: 'id-1' })).toBe('id-1');
    expect(extractGameId({ gameId: 'id-2' })).toBe('id-2');
    expect(extractGameId({ game: { id: 'id-3' } })).toBe('id-3');
    expect(extractGameId({ game: { gameId: 'id-4' } })).toBe('id-4');
    expect(extractGameId(null)).toBeNull();
  });

  test('isCompletedPayload recognizes completion by state and winner fields', () => {
    expect(isCompletedPayload({ status: 'finished' })).toBe(true);
    expect(isCompletedPayload({ state: 'completed' })).toBe(true);
    expect(isCompletedPayload({ winner: { id: 'p1' } })).toBe(true);
    expect(isCompletedPayload({ winners: ['p1', 'p2'] })).toBe(true);
    expect(isCompletedPayload({ status: 'running' })).toBe(false);
    expect(isCompletedPayload(null)).toBe(false);
  });
});
