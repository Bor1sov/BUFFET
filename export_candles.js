require('dotenv').config();
const fs = require('fs');
const { TinkoffInvestApi } = require('tinkoff-invest-api');

const api = new TinkoffInvestApi({
  token: process.env.TINKOFF_TOKEN,
  isSandbox: process.env.SANDBOX === 'true',
});

const FIGI = process.env.FIGI;

(async () => {
  try {
    const to = new Date();
    const from = new Date(to.getTime() - 24 * 60 * 60 * 1000); // 1 день

    const { candles } = await api.marketdata.getCandles({
      figi: FIGI,
      from,
      to,
      interval: 1, // ✅ 1 минута
    });

    if (!Array.isArray(candles) || candles.length === 0) {
      throw new Error('No candles received');
    }

    const csv = [
      'time,open,high,low,close,volume',
      ...candles.map(c => {
        const price = q => q.units + q.nano / 1e9;
        return [
          c.time,
          price(c.open),
          price(c.high),
          price(c.low),
          price(c.close),
          c.volume,
        ].join(',');
      }),
    ].join('\n');

    fs.writeFileSync('data.csv', csv);
    console.log(`✅ Saved ${candles.length} candles to data.csv`);
  } catch (e) {
    console.error('❌ Export failed:', e);
  }
})();
