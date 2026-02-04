// backtest_direction.js
import fs from "fs";
import { spawnSync } from "child_process";

const CONF_BUY = 0.55;
const CONF_SELL = 0.45;

const raw = fs.readFileSync("dataset.csv", "utf8").trim().split("\n");
raw.shift();

const data = raw.map(r => {
  const [
    time,
    close,
    returns,
    ema_fast,
    ema_slow,
    ema_diff,
    volatility,
    up
  ] = r.split(",");

  return {
    time,
    close: +close,
    features: [
      +returns,
      +ema_fast,
      +ema_slow,
      +ema_diff,
      +volatility
    ]
  };
});

let equity = 1.0;
let position = 0;
let entry = 0;
let trades = [];

for (let i = 0; i < data.length; i++) {
  const f = data[i].features.join(",");

  const res = spawnSync(
    "python",
    ["predict_proba.py", f],
    { encoding: "utf8" }
  );

  const pUp = parseFloat(res.stdout);

  if (position === 0 && pUp > CONF_BUY) {
    position = 1;
    entry = data[i].close;
  }

  if (position === 1 && pUp < CONF_SELL) {
    const pnl = (data[i].close - entry) / entry;
    equity *= 1 + pnl;
    trades.push(pnl);
    position = 0;
  }
}

const wins = trades.filter(t => t > 0).length;

console.log("\n============= RESULTS =============");
console.log("Trades:       ", trades.length);
console.log(
  "Win rate:     ",
  trades.length ? ((wins / trades.length) * 100).toFixed(2) + "%" : "0%"
);
console.log(
  "Strategy PnL: ",
  ((equity - 1) * 100).toFixed(2) + "%"
);
console.log("==================================");
