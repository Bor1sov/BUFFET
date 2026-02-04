import 'dotenv/config';
import fs from 'fs';
import pkg from 'tinkoff-invest-api';

const { TinkoffInvestApi } = pkg;

const api = new TinkoffInvestApi({
  token: process.env.TINKOFF_TOKEN,
  sandbox: process.env.SANDBOX === 'true'
});

const FIGI = process.env.FIGI;

// sandbox: максимум ~1 день для 1m
const FROM = new Date(Date.now() - 24 * 60 * 60 * 1000);
const TO = new Date();

function toNumber(v) {
  return v.units + v.nano * 1e-9;
}

async function main() {
  console.log('📡 Loading candles...');

  const res = await api.marketdata.getCandles({
    figi: FIGI,
    interval: 1, // ✅ 1 = 1 minute
    from: FROM,
    to: TO
  });

  const candles = res.candles;

  if (!candles || candles.length === 0) {
    throw new Error('❌ No candles received');
  }

  const rows = candles.map(c => [
    c.time.toISOString(),
    toNumber(c.open),
    toNumber(c.high),
    toNumber(c.low),
    toNumber(c.close)
  ]);

  const csv =
    'time,open,high,low,close\n' +
    rows.map(r => r.join(',')).join('\n');

  fs.writeFileSync('./price_series.csv', csv);

  console.log('✅ price_series.csv saved');
  console.log('Rows:', rows.length);
}

main().catch(err => {
  console.error('❌', err);
});
