export const US_OPTIONS_DELAY_SECONDS = 900;
export const US_OPTIONS_BAR_INTERVAL_MS = 15 * 60 * 1000;

function newYorkClock(value) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    weekday: "short",
    hour12: false,
  }).formatToParts(value).filter((part) => part.type !== "literal").map((part) => [part.type, part.value]));
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    hour: Number(parts.hour) % 24,
    minute: Number(parts.minute),
    weekday: parts.weekday,
  };
}

export function delayedCutoffMs(now) {
  return now.getTime() - US_OPTIONS_DELAY_SECONDS * 1000;
}

export function isCompletedDelayedBar(barStart, now, barIntervalMs = US_OPTIONS_BAR_INTERVAL_MS) {
  return barStart.getTime() + barIntervalMs <= delayedCutoffMs(now);
}

function tradingWeekKey(date) {
  const value = new Date(`${date}T00:00:00.000Z`);
  const weekday = value.getUTCDay();
  const daysFromMonday = (weekday + 6) % 7;
  value.setUTCDate(value.getUTCDate() - daysFromMonday);
  return value.toISOString().slice(0, 10);
}

export function alertIntervalDue(interval, providerAsOf, isFinal, { nextTradingDate = "" } = {}) {
  const clock = newYorkClock(new Date(providerAsOf));
  const sessionMinute = clock.hour * 60 + clock.minute;
  const elapsed = sessionMinute - 570;
  if (interval === "15m") return elapsed >= 15 && elapsed % 15 === 0;
  const duration = { "1h": 60, "2h": 120, "3h": 180, "4h": 240 }[interval];
  if (duration) return elapsed >= duration && (elapsed % duration === 0 || isFinal);
  if (interval === "1d") return isFinal;
  if (interval === "1wk") return isFinal && Boolean(nextTradingDate) && tradingWeekKey(nextTradingDate) !== tradingWeekKey(clock.date);
  if (interval === "1mo") return isFinal && Boolean(nextTradingDate) && nextTradingDate.slice(0, 7) !== clock.date.slice(0, 7);
  return false;
}