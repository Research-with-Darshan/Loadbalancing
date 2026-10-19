import { performance } from "node:perf_hooks";
import fs from "node:fs";
import path from "node:path";

const BASE_URL = process.env.BASE_URL || "http://127.0.0.1:8080";
const intervals = [500, 450, 400, 350, 300, 250, 200, 150, 100, 75, 50, 30, 20, 15, 10, 5, 1];

function percentile(sorted, p) {
    if (!sorted.length) return 0;
    return sorted[Math.min(sorted.length - 1, Math.ceil(p * sorted.length) - 1)];
}

async function sendOne(id) {
    const start = performance.now();
    try {
        const response = await fetch(`${BASE_URL}/request-${id}`, { signal: AbortSignal.timeout(10000) });
        const body = await response.text();
        return { id, ok: response.ok, status: response.status, latencyMs: performance.now() - start, error: "", body: body.slice(0, 200) };
    } catch (error) {
        return { id, ok: false, status: 0, latencyMs: performance.now() - start, error: error.message, body: "" };
    }
}

async function run(intervalMs, requests) {
    const results = [];
    const started = performance.now();
    for (let i = 0; i < requests; i++) {
        results.push(await sendOne(i));
        if (i < requests - 1 && intervalMs > 0) await new Promise(resolve => setTimeout(resolve, intervalMs));
    }
    const elapsedMs = performance.now() - started;
    const latencies = results.map(r => r.latencyMs).sort((a, b) => a - b);
    const summary = {
        intervalMs, requested: requests,
        succeeded: results.filter(r => r.ok).length,
        rejectedOrFailed: results.filter(r => !r.ok).length,
        elapsedMs: Number(elapsedMs.toFixed(2)),
        throughputRequestsPerSecond: Number((requests / (elapsedMs / 1000)).toFixed(2)),
        latencyMeanMs: Number((latencies.reduce((a, b) => a + b, 0) / Math.max(1, latencies.length)).toFixed(2)),
        latencyP50Ms: Number(percentile(latencies, 0.50).toFixed(2)),
        latencyP95Ms: Number(percentile(latencies, 0.95).toFixed(2)),
        latencyP99Ms: Number(percentile(latencies, 0.99).toFixed(2))
    };
    return { summary, results };
}

const count = Math.max(1, Number(process.env.REQUESTS || 100));
const chosenIntervals = process.env.INTERVALS
    ? process.env.INTERVALS.split(",").map(Number)
    : intervals;
const outDir = path.resolve("results");
fs.mkdirSync(outDir, { recursive: true });
const runId = new Date().toISOString().replace(/[:.]/g, "-");
const all = [];
for (const interval of chosenIntervals) {
    console.log(`Testing ${count} requests at ${interval} ms spacing...`);
    const result = await run(interval, count);
    all.push(result.summary);
    fs.writeFileSync(path.join(outDir, `requests-${runId}-${interval}ms.json`), JSON.stringify(result, null, 2));
    console.log(result.summary);
}
const csv = [
    Object.keys(all[0] || {}).join(","),
    ...all.map(row => Object.values(row).join(","))
].join("\n");
fs.writeFileSync(path.join(outDir, `summary-${runId}.csv`), csv + "\n");
console.log(`Saved raw JSON and summary CSV in ${outDir}`);
