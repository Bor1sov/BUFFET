// build_dataset.js
import fs from "fs";

const INPUT = "price_series.csv";
const OUTPUT = "dataset.csv";

// параметры
const EMA_FAST = 5;
const EMA_SLOW = 20;
const VOL_WINDOW = 10;

function ema(values, period) {
  const k = 2 / (period + 1);
  let emaArr = [];
  let prev = values[0];
  for (let i = 0; i < values.length; i++) {
    const cur = values[i] * k + prev * (1 - k);
    emaArr.push(cur);
    prev = cur;
  }
  return emaArr;
}

// ---------- load candles ----------
const raw = fs.readFileSync(INPUT, "utf8").trim().split("\n");
const header = raw.shift();
const rows = raw.map(r => r.split(","));

const candles = rows.map(r => ({
  time: r[0],
  open: +r[1],
  high: +r[2],
  low: +r[3],
  close: +r[4],
}));

console.log("Loaded candles:", candles.length);

// ---------- features ----------
const closes = candles.map(c => c.close);
const emaFast = ema(closes, EMA_FAST);
const emaSlow = ema(closes, EMA_SLOW);

let dataset = [];

for (let i = VOL_WINDOW + EMA_SLOW; i < candles.length - 1; i++) {
  const returns = (closes[i] - closes[i - 1]) / closes[i - 1];

  const volSlice = closes.slice(i - VOL_WINDOW, i);
  const mean = volSlice.reduce((a, b) => a + b, 0) / volSlice.length;
  const variance =
    volSlice.reduce((s, v) => s + (v - mean) ** 2, 0) / volSlice.length;
  const volatility = Math.sqrt(variance);

  const up = closes[i + 1] > closes[i] ? 1 : 0;

  dataset.push({
    time: candles[i].time,
    close: closes[i],
    returns,
    ema_fast: emaFast[i],
    ema_slow: emaSlow[i],
    ema_diff: emaFast[i] - emaSlow[i],
    volatility,
    up,
  });
}

// ---------- save ----------
const outHeader =
  "time,close,returns,ema_fast,ema_slow,ema_diff,volatility,up";
const outRows = dataset.map(d =>
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

fs.writeFileSync(OUTPUT, [outHeader, ...outRows].join("\n"));

const upRatio =
  dataset.filter(d => d.up === 1).length / dataset.length;

console.log("✅ Dataset saved:", OUTPUT);
console.log("Rows:", dataset.length);
console.log("UP ratio:", (upRatio * 100).toFixed(2) + "%");
