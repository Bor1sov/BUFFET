require('dotenv').config();
const fs = require('fs');

const { getCandles } = require('./data');
const { trainModel, predict } = require('./ml');

/* ============ PARAM GRIDS ============ */

const BUY_PROBS = [0.50, 0.52, 0.54, 0.56, 0.58, 0.60, 0.62];
const ATR_MULTS = [1.5, 2.0, 2.5, 3.0];

const FIGI = process.env.FIGI;
const DAYS = 60;
const WINDOW = 60;

const EXIT_PROB = 0.48;
const ATR_PERIOD = 14;
const START_BALANCE = 100000;

/* ============ UTILS ============ */

function sma(arr, period, i) {
  if (i < period) return null;
  let s = 0;
  for (let j = i - period; j < i; j++) s += arr[j];
  return s / period;
}

function atr(candles, period, i) {
  if (i < period) return null;
  let s = 0;
  for (let j = i - period + 1; j <= i; j++) {
    const h = candles[j].high;
    const l = candles[j].low;
    const pc = candles[j - 1].close;
    s += Math.max(h - l, Math.abs(h - pc), Math.abs(l - pc));
  }
  return s / period;
}

/* ============ BACKTEST CORE ============ */

async function runTest(prices, candles, model, BUY_PROB, ATR_MULT) {
  let equity = START_BALANCE;
  let peak = equity;
  let maxDD = 0;

  let inPos = false;
  let entry = 0;
  let stop = 0;

  let trades = 0;

  for (let i = WINDOW + 50; i < prices.length; i++) {
    const price = prices[i];

    const sma20 = sma(prices, 20, i);
    const sma50 = sma(prices, 50, i);
    if (!sma20 || !sma50) continue;

    const trendUp = price > sma50 && sma20 > sma50;
    const prob = await predict(model, prices.slice(i - WINDOW, i));

    if (inPos && price <= stop) {
      equity *= stop / entry;
      trades++;
      inPos = false;
      continue;
    }

    if (inPos && (!trendUp || prob < EXIT_PROB)) {
      equity *= price / entry;
      trades++;
      inPos = false;
    }

    if (!inPos && trendUp && prob > BUY_PROB) {
      const a = atr(candles, ATR_PERIOD, i);
      if (!a) continue;
      entry = price;
      stop = entry - a * ATR_MULT;
      inPos = true;
    }

    if (equity > peak) peak = equity;
    const dd = (peak - equity) / peak;
    if (dd > maxDD) maxDD = dd;
  }

  const ret = equity / START_BALANCE - 1;
  const score = maxDD > 0 ? ret / maxDD : 0;

  return { BUY_PROB, ATR_MULT, ret, maxDD, trades, score };
}

/* ============ MAIN ============ */

async function run() {
  console.log('🔍 OPTIMIZATION START\n');

  const candles = await getCandles(FIGI, DAYS);
  const prices = candles.map(c => c.close);

  const model = await trainModel(prices, WINDOW);

  const results = [];

  for (const bp of BUY_PROBS) {
    for (const atrm of ATR_MULTS) {
      const r = await runTest(prices, candles, model, bp, atrm);
      console.log(
        `BUY=${bp} ATR=${atrm} | Ret=${(r.ret*100).toFixed(2)}% DD=${(r.maxDD*100).toFixed(2)}% Score=${r.score.toFixed(2)}`
      );
      results.push(r);
    }
  }

  results.sort((a, b) => b.score - a.score);

  fs.writeFileSync(
    'optimization_results.csv',
    'BUY_PROB,ATR_MULT,Return,MaxDD,Trades,Score\n' +
      results.map(r =>
        `${r.BUY_PROB},${r.ATR_MULT},${(r.ret*100).toFixed(2)},${(r.maxDD*100).toFixed(2)},${r.trades},${r.score.toFixed(2)}`
      ).join('\n')
  );

  console.log('\n🏆 TOP 5 RESULTS');
  console.table(results.slice(0, 5));
}

run().catch(console.error);
