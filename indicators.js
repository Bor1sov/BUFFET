function SMA(values, period, i) {
  if (i < period) return null;
  let sum = 0;
  for (let j = i - period; j < i; j++) sum += values[j];
  return sum / period;
}

function ATR(candles, period, i) {
  if (i < period) return null;
  let sum = 0;
  for (let j = i - period + 1; j <= i; j++) {
    const prev = candles[j - 1];
    const cur = candles[j];
    const tr = Math.max(
      cur.high - cur.low,
      Math.abs(cur.high - prev.close),
      Math.abs(cur.low - prev.close)
    );
    sum += tr;
  }
  return sum / period;
}

module.exports = { SMA, ATR };
