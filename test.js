// run-requests.js  (Node v18+ CommonJS)
const { performance } = require('node:perf_hooks');

const BASE = 'https://instance-per-second-test.mike-test-ent-account.workers.dev/container';
const PREFIX = 'first-test';
const START = 1;
const TOTAL = 16000;
const BATCH_SIZE = 100;
const LAUNCH_SPACING_MS = 5;

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

function urlFor(i) {
  const id = `${PREFIX}-${i}`;
  return { id, url: `${BASE}/${encodeURIComponent(id)}` };
}

function timeNow() {
  return new Date().toLocaleTimeString('en-US', { hour12: false });
}

function stats(nums) {
  if (!nums.length) return { meanMs: null, medianMs: null };
  const sum = nums.reduce((a, b) => a + b, 0);
  const meanMs = sum / nums.length;
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const medianMs = sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
  return { meanMs, medianMs };
}

async function runBatch(batchStart, batchSize) {
  const tasks = [];
  const statusCounts = new Map();
  const successDurationsMs = [];
  let successes = 0;
  let failures = 0;

  for (let i = batchStart; i < batchStart + batchSize; i++) {
    const { url } = urlFor(i);
    const launchTs = performance.now();

    const p = fetch(url)
      .then(async (res) => {
        const doneTs = performance.now();
        const durMs = doneTs - launchTs;
        if (res.ok) {
          successes++;
          successDurationsMs.push(durMs);
        } else {
          failures++;
          statusCounts.set(res.status, (statusCounts.get(res.status) || 0) + 1);
        }
      })
      .catch(() => {
        failures++;
        statusCounts.set('FETCH_ERROR', (statusCounts.get('FETCH_ERROR') || 0) + 1);
      });

    tasks.push(p);
    await sleep(LAUNCH_SPACING_MS);
  }

  await Promise.allSettled(tasks);
  const { meanMs, medianMs } = stats(successDurationsMs);
  return { successes, failures, statusCounts, meanMs, medianMs };
}

async function main() {
  let totalSuccesses = 0;
  let totalFailures = 0;
  const totalStatusCounts = new Map();

  const end = START + TOTAL;
  for (let batchStart = START; batchStart < end; batchStart += BATCH_SIZE) {
    const size = Math.min(BATCH_SIZE, end - batchStart);
    const batchIndex = Math.floor((batchStart - START) / BATCH_SIZE) + 1;

    console.log(`\n=============`);
    console.log(`BATCH ${batchIndex} START (${batchStart}-${batchStart + size - 1}) @ ${timeNow()}`);

    const t0 = performance.now();
    const { successes, failures, statusCounts, meanMs, medianMs } = await runBatch(batchStart, size);
    const t1 = performance.now();

    console.log(`BATCH ${batchIndex} END   (${batchStart}-${batchStart + size - 1}) @ ${timeNow()}`);
    console.log(`Elapsed: ${(t1 - t0).toFixed(2)} ms`);
    console.log(`Successes: ${successes}`);
    console.log(`Failures:  ${failures}`);
    console.log(`Failures by code: ${
      [...statusCounts.entries()].map(([code, count]) => `${code}: ${count}`).join(', ') || 'none'
    }`);
    console.log(
      `Latency (success only): mean=${meanMs === null ? 'n/a' : meanMs.toFixed(2)} ms, ` +
      `median=${medianMs === null ? 'n/a' : medianMs.toFixed(2)} ms`
    );

    totalSuccesses += successes;
    totalFailures += failures;
    for (const [k, v] of statusCounts.entries()) {
      totalStatusCounts.set(k, (totalStatusCounts.get(k) || 0) + v);
    }
    console.log(`=============`);
  }

  console.log(`\n=== OVERALL SUMMARY ===`);
  console.log(`Total requests: ${TOTAL}`);
  console.log(`Total successes: ${totalSuccesses}`);
  console.log(`Total failures:  ${totalFailures}`);
  console.log(`Total failures by code: ${
    [...totalStatusCounts.entries()].map(([code, count]) => `${code}: ${count}`).join(', ') || 'none'
  }`);
}

main();
