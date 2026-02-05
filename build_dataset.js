// build_dataset.js
// CSV FORMAT: time,close

import fs from "fs";

const INPUT = "price_series.csv";
const OUTPUT = "dataset.csv";

// ===== PARAMS =====
const EMA_FAST = 5;
const EMA_SLOW = 20;
const VOL_WINDOW = 10;

// ===== EMA =====
function ema(values, period) {
  const k = 2 / (period + 1);
  let out = [];
  let prev = values[0];

  for (let i = 0; i < values.length; i++) {
    const cur = values[i] * k + prev * (1 - k);
    out.push(cur);
    prev = cur;
  }
  return out;
}

// ===== LOAD CSV =====
const text = fs.readFileSync(INPUT, "utf8").trim();
const lines = text.split(/\r?\n/);

const header = lines.shift().split(",");

if (
  header.length !== 2 ||
  header[0] !== "time" ||
  header[1] !== "close"
) {
  console.error("❌ Expected CSV format: time,close");
  console.error("Got:", header);
  process.exit(1);
}

// ===== PARSE =====
const candles = lines
  .map(line => {
    const [time, closeRaw] = line.split(",");
    const close = Number(closeRaw);

    if (!Number.isFinite(close) || close <= 0) return null;

    return { time, close };
  })
  .filter(Boolean);

console.log("Loaded candles:", candles.length);

if (candles.length < 100) {
  console.error("❌ Too few candles");
  process.exit(1);
}

// ===== FEATURES =====
const closes = candles.map(c => c.close);
const emaFast = ema(closes, EMA_FAST);
const emaSlow = ema(closes, EMA_SLOW);

let dataset = [];

for (let i = Math.max(VOL_WINDOW, EMA_SLOW) + 1; i < candles.length - 1; i++) {
  const prev = closes[i - 1];
  const cur  = closes[i];

  const returns = (cur - prev) / prev;

  const volSlice = closes.slice(i - VOL_WINDOW, i);
  const mean = volSlice.reduce((a, b) => a + b, 0) / volSlice.length;
  const variance =
    volSlice.reduce((s, v) => s + (v - mean) ** 2, 0) / volSlice.length;
  const volatility = Math.sqrt(variance);

  if (
    !Number.isFinite(returns) ||
    !Number.isFinite(volatility)
  ) continue;

  const up = closes[i + 1] > cur ? 1 : 0;

  dataset.push({
    time: candles[i].time,
    close: cur,
    returns,
    ema_fast: emaFast[i],
    ema_slow: emaSlow[i],
    ema_diff: emaFast[i] - emaSlow[i],
    volatility,
    up,
  });
}

// ===== SAVE =====
const outHeader =
  "time,close,returns,ema_fast,ema_slow,ema_diff,volatility,up";

const rows = dataset.map(d =>
  [
    d.time,
    d.close,
    d.returns,
    d.ema_fast,
    d.ema_slow,
    d.ema_diff,
    d.volatility,
    d.up,
  ].join(",")
);

fs.writeFileSync(OUTPUT, [outHeader, ...rows].join("\n"));

const upRatio =
  dataset.filter(d => d.up === 1).length / dataset.length;

console.log("✅ Dataset saved:", OUTPUT);
console.log("Rows:", dataset.length);
console.log("UP ratio:", (upRatio * 100).toFixed(2) + "%");
