#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const { runHealthcheck } = require('./healthcheck');
const { runGames } = require('./play-two-games');

function parseArgs(argv) {
  const args = {
    mode: 'full',
    artifactDir: process.env.SMOKE_ARTIFACT_DIR || 'artifacts/smoke',
    policyPath: process.env.SMOKE_POLICY_PATH || 'scripts/ci/expected-errors.policy.json',
    healthPath: null,
    gamesPaths: []
  };

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === '--mode') {
      args.mode = argv[i + 1] || args.mode;
      i += 1;
    } else if (token === '--artifact-dir') {
      args.artifactDir = argv[i + 1] || args.artifactDir;
      i += 1;
    } else if (token === '--policy-path') {
      args.policyPath = argv[i + 1] || args.policyPath;
      i += 1;
    } else if (token === '--health-path') {
      args.healthPath = argv[i + 1] || args.healthPath;
      i += 1;
    } else if (token === '--games') {
      const list = argv[i + 1] || '';
      args.gamesPaths = list.split(',').map((item) => item.trim()).filter(Boolean);
      i += 1;
    }
  }

  return args;
}

function loadJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function ensureDirFor(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function logPhase(phase, detail) {
  const suffix = detail ? ` ${detail}` : '';
  console.log(`SMOKE_PHASE ${phase}${suffix}`);
}

function logDiag(type, payload) {
  console.log(`SMOKE_DIAG ${JSON.stringify({ type, ...payload })}`);
}

function matchesAllowedMessage(patterns, snippet) {
  const normalized = String(snippet || '').toLowerCase();
  return patterns.some((pattern) => normalized.includes(String(pattern).toLowerCase()));
}

function evaluatePolicy(policy, gamesSummary) {
  const diagnostics = Array.isArray(gamesSummary.diagnostics) ? gamesSummary.diagnostics : [];
  const failingCalls = diagnostics.filter((diag) => Number(diag.status) >= 400 || Number(diag.status) === 0);

  const unexpectedErrors = failingCalls.filter((diag) => {
    const allowedByStatus = policy.allowedStatuses.includes(Number(diag.status));
    const allowedByMessage = matchesAllowedMessage(policy.allowedMessagePatterns, diag.snippet);
    return !(allowedByStatus || allowedByMessage);
  });

  const passCount = Number(gamesSummary.passedGames || 0);
  const policyFailures = [];

  if (passCount < policy.requiredPassCount) {
    policyFailures.push(`requiredPassCount not met: ${passCount}/${policy.requiredPassCount}`);
  }

  if (failingCalls.length > policy.maxAllowedErrors) {
    policyFailures.push(`maxAllowedErrors exceeded: ${failingCalls.length}/${policy.maxAllowedErrors}`);
  }

  if (unexpectedErrors.length > 0) {
    policyFailures.push(`unexpected errors detected: ${unexpectedErrors.length}`);
  }

  return {
    pass: policyFailures.length === 0,
    failingCalls,
    unexpectedErrors,
    policyFailures
  };
}

function writeSummary(summaryPath, payload) {
  ensureDirFor(summaryPath);
  fs.writeFileSync(summaryPath, JSON.stringify(payload, null, 2));

  const markdown = [
    '# Smoke Summary',
    '',
    `- Result: ${payload.result}`,
    `- Passed games: ${payload.games.passedGames}/${payload.games.gameCount}`,
    `- Health: ${payload.health.status}`,
    `- Policy failures: ${payload.policy.policyFailures.length}`,
    ''
  ];

  if (payload.policy.policyFailures.length > 0) {
    markdown.push('## Policy Failures');
    for (const failure of payload.policy.policyFailures) {
      markdown.push(`- ${failure}`);
    }
    markdown.push('');
  }

  markdown.push('## Games');
  for (const game of payload.games.games) {
    markdown.push(`- Game ${game.index}: ${game.status} (${game.durationMs}ms)`);
  }

  fs.writeFileSync(path.join(path.dirname(summaryPath), 'summary.md'), `${markdown.join('\n')}\n`);
}

function mergeGameSummaries(summaries) {
  const games = [];
  const diagnostics = [];
  let passedGames = 0;

  for (const summary of summaries) {
    const summaryGames = Array.isArray(summary.games) ? summary.games : [];
    const summaryDiagnostics = Array.isArray(summary.diagnostics) ? summary.diagnostics : [];
    for (const game of summaryGames) {
      games.push({ ...game, index: games.length + 1 });
      if (game.status === 'PASS') {
        passedGames += 1;
      }
    }
    diagnostics.push(...summaryDiagnostics);
  }

  return {
    phase: 'Run game 1/2',
    gameCount: games.length,
    passedGames,
    games,
    diagnostics
  };
}

function runValidation({ policy, health, games, summaryOutput }) {
  logPhase('Validate expected errors');
  const policyResult = evaluatePolicy(policy, games);

  logPhase('Assert no unexpected errors');
  const result = policyResult.pass ? 'PASS' : 'FAIL';

  const summary = {
    result,
    createdAt: new Date().toISOString(),
    health,
    games,
    policy: policyResult
  };

  writeSummary(summaryOutput, summary);

  if (!policyResult.pass) {
    logDiag('expected-error-mismatch', {
      failedPhase: 'Validate expected errors',
      suggestedOwner: 'backend',
      policyFailures: policyResult.policyFailures,
      suggestedNextCommand: 'npm run smoke:ci'
    });
    throw new Error(`Smoke policy failed: ${policyResult.policyFailures.join('; ')}`);
  }

  logPhase('Publish smoke summary');
  return summary;
}

async function runSmoke(options = {}) {
  const artifactDir = options.artifactDir || 'artifacts/smoke';
  const policyPath = options.policyPath || 'scripts/ci/expected-errors.policy.json';
  const mode = options.mode || 'full';
  const healthOutput = path.join(artifactDir, 'healthcheck.json');
  const gamesOutput = path.join(artifactDir, 'games.json');
  const summaryOutput = path.join(artifactDir, 'summary.json');

  const policy = loadJson(policyPath);

  if (mode === 'validate') {
    const health = loadJson(options.healthPath || healthOutput);
    const sourcePaths = Array.isArray(options.gamesPaths) && options.gamesPaths.length > 0
      ? options.gamesPaths
      : [gamesOutput];
    const gameSummaries = sourcePaths.map((filePath) => loadJson(filePath));
    const games = mergeGameSummaries(gameSummaries);
    return runValidation({ policy, health, games, summaryOutput });
  }

  logPhase('Wait for health');
  const health = await runHealthcheck({
    url: process.env.SMOKE_BACKEND_HEALTH_URL || 'http://127.0.0.1:8080/actuator/health',
    timeoutMs: Number(process.env.SMOKE_HEALTH_TIMEOUT_MS || 60000),
    intervalMs: Number(process.env.SMOKE_HEALTH_INTERVAL_MS || 2000),
    output: healthOutput
  });

  logPhase('Run game 1');
  logPhase('Run game 2');
  const games = await runGames({
    backendUrl: process.env.SMOKE_BACKEND_BASE_URL || 'http://127.0.0.1:8080',
    gameCount: Number(process.env.SMOKE_GAME_COUNT || 2),
    output: gamesOutput
  });

  return runValidation({ policy, health, games, summaryOutput });
}

if (require.main === module) {
  const args = parseArgs(process.argv.slice(2));
  runSmoke(args).catch((error) => {
    logDiag('test-runner-error', {
      failedPhase: 'Smoke runner',
      message: error.message
    });
    process.exit(1);
  });
}

module.exports = {
  runSmoke,
  evaluatePolicy,
  matchesAllowedMessage,
  mergeGameSummaries,
  parseArgs
};
