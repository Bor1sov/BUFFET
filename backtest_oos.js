require('dotenv').config();
const fs = require('fs');

const { getCandles } = require('./data');
const { trainModel, predict } = require('./ml');

/* ============ FIXED PARAMS (FROM OPTIMIZATION) ============ */

const BUY_PROB = 0.56;
const EXIT_PROB = 0.48;

const ATR_MULT = 2.2;
const ATR_PERIOD = 14;

/* ============ DATA ============ */

const FIGI = process.env.FIGI;
const DAYS = 120;
const WINDOW = 60;

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

async function run() {
  console.log('\n📊 OUT-OF-SAMPLE BACKTEST\n');

  const candles = await getCandles(FIGI, DAYS);
  const prices = candles.map(c => c.close);

  const split = Math.floor(prices.length * 0.7);

  const trainPrices = prices.slice(0, split);
  const testPrices = prices.slice(split);
  const testCandles = candles.slice(split);

  console.log(`Train candles: ${trainPrices.length}`);
  console.log(`Test candles:  ${testPrices.length}`);

  console.log('\n🧠 Training model on IN-SAMPLE...');
  const model = await trainModel(trainPrices, WINDOW);
  console.log('Model trained');

  let equity = START_BALANCE;
  let equityBH = START_BALANCE;

  let peak = equity;
  let maxDD = 0;

  let inPos = false;
  let entry = 0;
  let stop = 0;

  let trades = 0;
  let wins = 0;

  const bhEntry = testPrices[WINDOW + 20];

  for (let i = WINDOW + 20; i < testPrices.length; i++) {
    const price = testPrices[i];

    equityBH = START_BALANCE * (price / bhEntry);

    const globalIdx = split + i;

    const sma20 = sma(prices, 20, globalIdx);
    const sma50 = sma(prices, 50, globalIdx);
    if (!sma20 || !sma50) continue;

    const trendUp = price > sma50 && sma20 > sma50;
    const prob = await predict(model, prices.slice(globalIdx - WINDOW, globalIdx));

    /* STOP */
    if (inPos && price <= stop) {
      const pnl = stop / entry - 1;
      equity *= 1 + pnl;
      trades++;
      if (pnl > 0) wins++;
      inPos = false;
      continue;
    }

    /* EXIT */
    if (inPos && (!trendUp || prob < EXIT_PROB)) {
      const pnl = price / entry - 1;
      equity *= 1 + pnl;
      trades++;
      if (pnl > 0) wins++;
      inPos = false;
    }

    /* ENTRY */
    if (!inPos && trendUp && prob > BUY_PROB) {
      const a = atr(candles, ATR_PERIOD, globalIdx);
      if (!a) continue;
      entry = price;
      stop = entry - a * ATR_MULT;
      inPos = true;
    }

    if (equity > peak) peak = equity;
    const dd = (peak - equity) / peak;
    if (dd > maxDD) maxDD = dd;
  }

  console.log('\n============= OOS RESULTS =============');
  console.log(`Trades:        ${trades}`);
  console.log(`Win rate:      ${(wins / Math.max(trades,1) * 100).toFixed(2)}%`);
  console.log(`Strategy PnL:  ${((equity / START_BALANCE - 1) * 100).toFixed(2)}%`);
  console.log(`Buy & Hold:    ${((equityBH / START_BALANCE - 1) * 100).toFixed(2)}%`);
  console.log(`Max drawdown:  ${(maxDD * 100).toFixed(2)}%`);
  console.log('=====================================\n');
}

run().catch(console.error);
