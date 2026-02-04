require('dotenv').config();
const fs = require('fs');
const { TinkoffInvestApi } = require('tinkoff-invest-api');

const api = new TinkoffInvestApi({
  token: process.env.TINKOFF_TOKEN,
});

const FIGI = process.env.FIGI;
const INTERVAL = 2; // 5 minutes
const DAYS = 30;    // сколько дней грузим

function toISO(d) {
  return d.toISOString();
}

async function main() {
  console.log('📡 Loading candles (5m)...');

  const now = new Date();
  let all = [];

  for (let i = DAYS; i > 0; i--) {
    const from = new Date(now);
    from.setDate(now.getDate() - i);
    const to = new Date(from);
    to.setDate(from.getDate() + 1);

    console.log(`⏳ ${from.toISOString().slice(0,10)} → ${to.toISOString().slice(0,10)}`);

    const res = await api.marketdata.getCandles({
      figi: FIGI,
      from: toISO(from),
      to: toISO(to),
      interval: INTERVAL,
    });

    if (res.candles) all.push(...res.candles);
  }

  const rows = ['time,open,high,low,close'];

  for (const c of all) {
    rows.push([
      new Date(c.time).toISOString(),
      c.open.units + c.open.nano / 1e9,
      c.high.units + c.high.nano / 1e9,
      c.low.units + c.low.nano / 1e9,
      c.close.units + c.close.nano / 1e9,
    ].join(','));
  }

  fs.writeFileSync('price_series.csv', rows.join('\n'));
  console.log(`✅ price_series.csv saved`);
  console.log(`Rows: ${all.length}`);
}

main().catch(console.error);
