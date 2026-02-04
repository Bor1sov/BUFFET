const fs = require('fs');
const { loadCSV } = require('./data');
const { SMA, ATR } = require('./indicators');
const { predictUpProb } = require('./model');

const candles = loadCSV('./data.csv');
const closes = candles.map(c => c.close);

let equity = 100000;
let peak = equity;
let maxDD = 0;

let position = null;
let trades = [];

let equityCurve = [];
let bhCurve = [];

const bhStart = candles[0].close;

for (let i = 50; i < candles.length; i++) {
  const price = candles[i].close;

  const sma20 = SMA(closes, 20, i);
  const sma50 = SMA(closes, 50, i);
  const atr = ATR(candles, 14, i);
  const pUp = predictUpProb(candles, i);

  // === ENTRY ===
  if (!position && pUp > 0.55 && sma20 && sma50 && sma20 > sma50) {
    position = {
      entry: price,
      stop: price - atr * 1.5
    };
    trades.push({ type: 'BUY', price, i });
  }

  // === EXIT ===
  if (position) {
    if (price < position.stop || pUp < 0.45) {
      const pnl = (price - position.entry) / position.entry;
      equity *= 1 + pnl;
      trades.push({ type: 'SELL', price, i, pnl });
      position = null;
    }
  }

  peak = Math.max(peak, equity);
  maxDD = Math.min(maxDD, (equity - peak) / peak);

  equityCurve.push({ i, equity });
  bhCurve.push({ i, equity: 100000 * (price / bhStart) });
}

// === RESULTS ===
const sells = trades.filter(t => t.type === 'SELL');
const wins = sells.filter(t => t.pnl > 0);

console.log('\n============= RESULTS =============');
console.log(`Trades:        ${sells.length}`);
console.log(`Win rate:      ${(wins.length / (sells.length || 1) * 100).toFixed(2)}%`);
console.log(`Strategy PnL:  ${((equity / 100000 - 1) * 100).toFixed(2)}%`);
console.log(`Buy & Hold:    ${((bhCurve.at(-1).equity / 100000 - 1) * 100).toFixed(2)}%`);
console.log(`Max drawdown:  ${(maxDD * 100).toFixed(2)}%`);
console.log('==================================');

// === SAVE CSV ===
fs.writeFileSync('equity_curve.csv',
  'i,equity\n' + equityCurve.map(r => `${r.i},${r.equity}`).join('\n')
);

fs.writeFileSync('equity_bh.csv',
  'i,equity\n' + bhCurve.map(r => `${r.i},${r.equity}`).join('\n')
);

fs.writeFileSync('trades.csv',
  'i,type,price,pnl\n' +
  trades.map(t => `${t.i},${t.type},${t.price},${t.pnl ?? ''}`).join('\n')
);

console.log('\n📁 CSV files saved');
