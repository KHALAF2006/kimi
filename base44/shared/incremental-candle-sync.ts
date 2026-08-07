const FIFTEEN_MINUTES_MS = 15 * 60 * 1000;
const DEFAULT_MAX_INCREMENTAL_AGE_MS = 8 * 24 * 60 * 60 * 1000;

function candleTime(value) {
  const timestamp = Date.parse(String(value || ""));
  return Number.isFinite(timestamp) ? timestamp : null;
}

function validStoredBars(chunk) {
  if (!chunk || chunk.quality_status === "quarantined" || !Array.isArray(chunk.bars)) return [];
  return chunk.bars.filter((bar) => candleTime(bar?.time) !== null);
}

export function latestStoredCandleByInstrument(chunks) {
  const result = new Map();
  for (const chunk of Array.isArray(chunks) ? chunks : []) {
    for (const bar of validStoredBars(chunk)) {
      const timestamp = candleTime(bar.time);
      const current = result.get(chunk.instrument_id);
      if (!current || timestamp > current.timestamp) result.set(chunk.instrument_id, { timestamp, time: bar.time });
    }
  }
  return result;
}

export function earliestRecentGapByInstrument(chunks, now = new Date(), options = {}) {
  const intervalMs = Math.max(1, Number(options.barIntervalMs) || FIFTEEN_MINUTES_MS);
  const lookbackMs = Math.max(intervalMs, Number(options.lookbackMs) || 2 * 24 * 60 * 60 * 1000);
  const nowMs = now instanceof Date ? now.getTime() : candleTime(now);
  if (!Number.isFinite(nowMs)) return new Map();
  const cutoff = nowMs - lookbackMs;
  const result = new Map();
  for (const chunk of Array.isArray(chunks) ? chunks : []) {
    const bars = validStoredBars(chunk).sort((left, right) => candleTime(left.time) - candleTime(right.time));
    for (let index = 1; index < bars.length; index += 1) {
      const previous = candleTime(bars[index - 1].time);
      const current = candleTime(bars[index].time);
      const missingTime = previous + intervalMs;
      if (current - previous <= intervalMs + 1000 || missingTime < cutoff) continue;
      const found = result.get(chunk.instrument_id);
      if (!found || missingTime < found.timestamp) result.set(chunk.instrument_id, { timestamp: missingTime, time: new Date(missingTime).toISOString() });
    }
  }
  return result;
}

export function incrementalProviderWindow(lastStoredTime, now = new Date(), options = {}) {
  const overlapBars = Math.max(1, Number(options.overlapBars) || 2);
  const barIntervalMs = Math.max(1, Number(options.barIntervalMs) || FIFTEEN_MINUTES_MS);
  const bootstrapRange = String(options.bootstrapRange || "5d");
  const maxIncrementalAgeMs = Math.max(barIntervalMs, Number(options.maxIncrementalAgeMs) || DEFAULT_MAX_INCREMENTAL_AGE_MS);
  const cursor = candleTime(lastStoredTime);
  const candidateNowMs = now instanceof Date ? now.getTime() : candleTime(now);
  const nowMs = Number.isFinite(candidateNowMs) ? candidateNowMs : null;
  if (cursor === null || nowMs === null || cursor > nowMs + barIntervalMs) {
    return { mode: "bootstrap", range: bootstrapRange, cursor_time: null };
  }
  const ageMs = Math.max(0, nowMs - cursor);
  if (ageMs > maxIncrementalAgeMs) {
    return { mode: "gap_recovery", range: bootstrapRange, cursor_time: new Date(cursor).toISOString(), age_ms: ageMs };
  }
  const period1Ms = Math.max(0, cursor - (overlapBars - 1) * barIntervalMs);
  return {
    mode: "incremental",
    period1: Math.floor(period1Ms / 1000),
    period2: Math.ceil((nowMs + barIntervalMs) / 1000),
    cursor_time: new Date(cursor).toISOString(),
    overlap_bars: overlapBars,
  };
}

export function mergeCandleBars(existingBars, incomingBars) {
  const byTime = new Map();
  for (const bar of [...(Array.isArray(existingBars) ? existingBars : []), ...(Array.isArray(incomingBars) ? incomingBars : [])]) {
    const timestamp = candleTime(bar?.time);
    if (timestamp === null) continue;
    byTime.set(timestamp, { ...bar, time: new Date(timestamp).toISOString() });
  }
  return [...byTime.entries()].sort(([left], [right]) => left - right).map(([, bar]) => bar);
}

export function indexCandleChunks(chunks) {
  return new Map((Array.isArray(chunks) ? chunks : []).map((chunk) => [String(chunk.chunk_key || ""), chunk]));
}

export function summarizeProviderWindows(windows) {
  const summary = { incremental: 0, bootstrap: 0, gap_recovery: 0, archive: 0 };
  for (const window of windows instanceof Map ? windows.values() : []) {
    const mode = String(window?.mode || "bootstrap");
    if (Object.hasOwn(summary, mode)) summary[mode] += 1;
  }
  return summary;
}
