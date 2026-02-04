require('dotenv').config();
const fs = require('fs');

const { getCandles } = require('./data');
const { trainModel, predict } = require('./ml');

/* ================= SETTINGS ================= */

const FIGI = process.env.FIGI;
const DAYS = 60;
const WINDOW = 60;

/* ↓↓↓ СМЯГЧЁННЫЕ ПОРОГИ ↓↓↓ */
const BUY_PROB = 0.55;
const EXIT_PROB = 0.48;

/* Stop-loss */
const STOP_MODE = 'ATR'; // 'ATR' | 'PERCENT'
const STOP_PERCENT = 0.03;
const ATR_PERIOD = 14;
const ATR_MULTIPLIER = 2;

/* Capital */
const START_BALANCE = 100000;

/* ================= UTILS ================= */

function sma(arr, period, i) {
  if (i < period) return null;
  let sum = 0;
  for (let j = i - period; j < i; j++) sum += arr[j];
  return sum / period;
}

function atr(candles, period, i) {
  if (i < period) return null;
  let sum = 0;
  for (let j = i - period + 1; j <= i; j++) {
    const h = candles[j].high;
    const l = candles[j].low;
    const pc = candles[j - 1].close;
    sum += Math.max(h - l, Math.abs(h - pc), Math.abs(l - pc));
  }
  return sum / period;
}

/* ================= BACKTEST ================= */

async function run() {
  console.log('\n📊 BACKTEST: TREND + ML + STOP + B&H\n');

  const candles = await getCandles(FIGI, DAYS);
  const prices = candles.map(c => c.close);

  console.log(`Candles loaded: ${prices.length}`);

  console.log('🧠 Training model...');
  const model = await trainModel(prices, WINDOW);
  console.log('Model ready');

  let equity = START_BALANCE;
  let equityBH = START_BALANCE;

  let peak = equity;
  let maxDD = 0;

  let inPos = false;
  let entry = 0;
  let stopPrice = 0;

  let trades = 0;
  let wins = 0;

  const equityCurve = [];
  const equityBHCurve = [];
  const priceSeries = [];
  const tradeLog = [];

  const startIndex = WINDOW + 50;
  const bhEntry = prices[startIndex];

  for (let i = startIndex; i < prices.length; i++) {
    const price = prices[i];
    const step = priceSeries.length;

    priceSeries.push({ step, price });

    /* Buy & Hold */
    equityBH = START_BALANCE * (price / bhEntry);
    equityBHCurve.push(equityBH);

    const sma20 = sma(prices, 20, i);
    const sma50 = sma(prices, 50, i);
    if (!sma20 || !sma50) continue;

    const trendUp = price > sma50 && sma20 > sma50;
    const recent = prices.slice(i - WINDOW, i);
    const probUp = await predict(model, recent);

    /* ---- LOG SIGNALS ---- */
    if (trendUp) {
      console.log(
        `step=${step} price=${price.toFixed(2)} P(UP)=${(probUp * 100).toFixed(1)}%`
      );
    }

    /* STOP */
    if (inPos && price <= stopPrice) {
      const pnl = stopPrice / entry - 1;
      equity *= 1 + pnl;

      trades++;
      if (pnl > 0) wins++;

      tradeLog.push({ type: 'STOP', step, price: stopPrice.toFixed(2) });
      inPos = false;
      equityCurve.push(equity);
      continue;
    }

    /* EXIT */
    if (inPos && (!trendUp || probUp < EXIT_PROB)) {
      const pnl = price / entry - 1;
      equity *= 1 + pnl;

      trades++;
      if (pnl > 0) wins++;

      tradeLog.push({ type: 'SELL', step, price: price.toFixed(2) });
      inPos = false;
    }

    /* ENTRY */
    if (!inPos && trendUp && probUp > BUY_PROB) {
      entry = price;

      if (STOP_MODE === 'ATR') {
        const a = atr(candles, ATR_PERIOD, i);
        if (!a) continue;
        stopPrice = entry - a * ATR_MULTIPLIER;
      } else {
        stopPrice = entry * (1 - STOP_PERCENT);
      }

      inPos = true;
      tradeLog.push({ type: 'BUY', step, price: price.toFixed(2) });
    }

    equityCurve.push(equity);

    if (equity > peak) peak = equity;
    const dd = (peak - equity) / peak;
    if (dd > maxDD) maxDD = dd;
  }

  console.log('\n============= RESULTS =============');
  console.log(`Trades:        ${trades}`);
  console.log(`Win rate:      ${(wins / Math.max(trades, 1) * 100).toFixed(2)}%`);
  console.log(`Strategy PnL:  ${((equity / START_BALANCE - 1) * 100).toFixed(2)}%`);
  console.log(`Buy & Hold:    ${((equityBH / START_BALANCE - 1) * 100).toFixed(2)}%`);
  console.log(`Max drawdown:  ${(maxDD * 100).toFixed(2)}%`);
  console.log('==================================\n');

  fs.writeFileSync(
    'equity_curve.csv',
    'step,equity\n' + equityCurve.map((v, i) => `${i},${v.toFixed(2)}`).join('\n')
  );

  fs.writeFileSync(
    'equity_bh.csv',
    'step,equity\n' + equityBHCurve.map((v, i) => `${i},${v.toFixed(2)}`).join('\n')
  );

  fs.writeFileSync(
    'price_series.csv',
    'step,price\n' + priceSeries.map(p => `${p.step},${p.price.toFixed(2)}`).join('\n')
  );

  fs.writeFileSync(
    'trades.csv',
    'type,step,price\n' + tradeLog.map(t => `${t.type},${t.step},${t.price}`).join('\n')
  );

  console.log('📁 CSV files saved');
}

run().catch(console.error);
