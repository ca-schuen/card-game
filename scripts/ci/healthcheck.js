#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');

function parseArgs(argv) {
  const args = {
    url: process.env.SMOKE_BACKEND_HEALTH_URL || 'http://127.0.0.1:8080/actuator/health',
    timeoutMs: Number(process.env.SMOKE_HEALTH_TIMEOUT_MS || 60000),
    intervalMs: Number(process.env.SMOKE_HEALTH_INTERVAL_MS || 2000),
    output: process.env.SMOKE_HEALTH_OUTPUT || 'artifacts/smoke/healthcheck.json'
  };

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === '--url') {
      args.url = argv[i + 1];
      i += 1;
    } else if (token === '--timeout-ms') {
      args.timeoutMs = Number(argv[i + 1]);
      i += 1;
    } else if (token === '--interval-ms') {
      args.intervalMs = Number(argv[i + 1]);
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

function logPhase(phase, detail) {
  const suffix = detail ? ` ${detail}` : '';
  console.log(`SMOKE_PHASE ${phase}${suffix}`);
}

function logDiag(type, payload) {
  console.log(`SMOKE_DIAG ${JSON.stringify({ type, ...payload })}`);
}

async function probe(url) {
  const startedAt = Date.now();
  try {
    const response = await fetch(url, { method: 'GET' });
    const text = await response.text();
    return {
      ok: response.ok,
      status: response.status,
      bodySnippet: text.slice(0, 300),
      durationMs: Date.now() - startedAt
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      bodySnippet: String(error && error.message ? error.message : error),
      durationMs: Date.now() - startedAt
    };
  }
}

async function runHealthcheck(options) {
  logPhase('Wait for health', `url=${options.url}`);

  const startedAt = Date.now();
  const probes = [];
  let attempt = 0;

  while (Date.now() - startedAt < options.timeoutMs) {
    attempt += 1;
    const result = await probe(options.url);
    probes.push({ attempt, ...result, elapsedMs: Date.now() - startedAt });

    if (result.ok) {
      const summary = {
        phase: 'Wait for health',
        status: 'PASS',
        url: options.url,
        attempts: attempt,
        elapsedMs: Date.now() - startedAt,
        finalStatus: result.status,
        probes
      };

      ensureDirFor(options.output);
      fs.writeFileSync(options.output, JSON.stringify(summary, null, 2));

      logPhase('Wait for health complete', `attempts=${attempt}`);
      return summary;
    }

    await new Promise((resolve) => setTimeout(resolve, options.intervalMs));
  }

  const failure = {
    phase: 'Wait for health',
    status: 'FAIL',
    url: options.url,
    attempts: attempt,
    elapsedMs: Date.now() - startedAt,
    failureType: 'startup-timeout',
    probes
  };

  ensureDirFor(options.output);
  fs.writeFileSync(options.output, JSON.stringify(failure, null, 2));

  logDiag('startup-timeout', {
    failedPhase: 'Wait for health',
    thresholdMs: options.timeoutMs,
    attempts: attempt,
    lastProbe: probes[probes.length - 1] || null,
    suggestedOwner: 'backend',
    suggestedNextCommand: 'npm run smoke:ci'
  });

  throw new Error(`Healthcheck timed out after ${options.timeoutMs}ms`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  await runHealthcheck(args);
}

if (require.main === module) {
  main().catch((error) => {
    console.error(`SMOKE_DIAG ${JSON.stringify({
      type: 'test-runner-error',
      failedPhase: 'Wait for health',
      message: error.message
    })}`);
    process.exit(1);
  });
}

module.exports = {
  runHealthcheck,
  parseArgs,
  logPhase,
  logDiag
};
