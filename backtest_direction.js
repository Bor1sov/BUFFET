require('dotenv').config();
const fs = require('fs');

const { getCandles, normalize } = require('./data');
const { trainModel, predict } = require('./ml');

/* ================= НАСТРОЙКИ ================= */

const FIGI = process.env.FIGI;
const WINDOW_SIZE = 60;
const DAYS = 30;

const BUY_PROB = 0.55;
const SELL_PROB = 0.48;

const START_BALANCE = 100000;

/* ================= BACKTEST ================= */

async function backtest() {
  console.log('📊 BACKTEST DIRECTIONAL MODEL\n');

  const candles = await getCandles(FIGI, DAYS);
  const prices = candles.map(c => c.close);

  if (prices.length < WINDOW_SIZE + 10) {
    console.log('❌ Недостаточно данных');
    return;
  }

  /* ===== NORMALIZE ===== */

  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const normPrices = normalize(prices, min, max);

  /* ===== TRAIN ===== */

  console.log('🧠 Начало обучения (UP/DOWN)...');
  const model = await trainModel(normPrices, WINDOW_SIZE);
  console.log('Обучение завершено');

  /* ===== STATE ===== */

  let equity = START_BALANCE;
  let peakEquity = START_BALANCE;
  let maxDrawdown = 0;

  let inPosition = false;
  let entryPrice = 0;

  let trades = 0;
  let wins = 0;
  let losses = 0;

  const equityCurve = [];
  const tradeLog = [];

  /* ===== SIMULATION ===== */

  for (let i = WINDOW_SIZE; i < prices.length - 1; i++) {
    const price = prices[i];
    const recent = normPrices.slice(i - WINDOW_SIZE, i);

    // ✅ ВСЕГДА СНАЧАЛА
    const probUp = await predict(model, recent);

    // Диагностика распределения
    if (i % 100 === 0) {
      console.log(`P(UP)=${(probUp * 100).toFixed(1)}%`);
    }

    /* ===== EXIT ===== */
    if (inPosition && probUp < SELL_PROB) {
      const pnl = price / entryPrice - 1;
      equity *= 1 + pnl;

      trades++;
      pnl > 0 ? wins++ : losses++;

      tradeLog.push({
        type: 'SELL',
        price: price.toFixed(2),
        pnl: (pnl * 100).toFixed(2)
      });

      inPosition = false;
    }

    /* ===== ENTRY ===== */
    if (!inPosition && probUp > BUY_PROB) {
      entryPrice = price;
      inPosition = true;

      tradeLog.push({
        type: 'BUY',
        price: price.toFixed(2),
        probUp: (probUp * 100).toFixed(1)
      });
    }

    /* ===== EQUITY ===== */
    equityCurve.push(equity);

    if (equity > peakEquity) peakEquity = equity;
    const dd = (peakEquity - equity) / peakEquity;
    if (dd > maxDrawdown) maxDrawdown = dd;
  }

  /* ===== RESULTS ===== */

  const winRate = trades > 0 ? (wins / trades) * 100 : 0;
  const totalReturn = (equity / START_BALANCE - 1) * 100;

  console.log('================ RESULTS ================');
  console.log(`Trades:           ${trades}`);
  console.log(`Win rate:         ${winRate.toFixed(2)} %`);
  console.log(`Final equity:     ${equity.toFixed(2)}`);
  console.log(`Total return:     ${totalReturn.toFixed(2)} %`);
  console.log(`Max drawdown:     ${(maxDrawdown * 100).toFixed(2)} %`);
  console.log('========================================');

  /* ===== SAVE FILES ===== */

  fs.writeFileSync(
    'equity_curve.csv',
    'step,equity\n' +
      equityCurve.map((v, i) => `${i},${v.toFixed(2)}`).join('\n')
  );

  fs.writeFileSync(
    'trades.csv',
    'type,price,pnl,probUp\n' +
      tradeLog
        .map(t => `${t.type},${t.price},${t.pnl || ''},${t.probUp || ''}`)
        .join('\n')
  );

  console.log('\n📁 Сохранены файлы: equity_curve.csv, trades.csv');
}

backtest().catch(console.error);
