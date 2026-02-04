const { api } = require('./api');

/*
  Ограничения Tinkoff:
  1 мин  -> ~1 день
  5 мин  -> ~7 дней
  15 мин -> ~30 дней
*/

function maxDaysForInterval(interval) {
  if (interval <= 1) return 1;
  if (interval <= 5) return 7;
  if (interval <= 15) return 30;
  return 90;
}

async function getCandles(figi, daysBack = 1) {
  const interval = Number(process.env.CANDLE_INTERVAL || 1);
  const maxDays = maxDaysForInterval(interval);
  const safeDays = Math.min(daysBack, maxDays);

  const now = new Date();
  const from = new Date(now);
  from.setDate(from.getDate() - safeDays);

  try {
    const res = await api.marketdata.getCandles({
      figi,
      from,
      to: now,
      interval
    });

    const candles = res.candles || [];
    console.log(`Получено свечей: ${candles.length}`);

    return candles.map(c => ({
      close: Number(c.close.units) + Number(c.close.nano) / 1e9
    }));
  } catch (err) {
    console.error('Error getting candles:', err.message);
    if (err.code) console.error('Код ошибки:', err.code);
    if (err.details) console.error('Детали:', err.details);
    return [];
  }
}

function normalize(data, min, max) {
  if (min === max) return data.map(() => 0.5);
  return data.map(v => (v - min) / (max - min));
}

module.exports = { getCandles, normalize };
