function ema(values, period) {
  const k = 2 / (period + 1);
  let prev = values[0];
  return values.map(v => (prev = v * k + prev * (1 - k)));
}

function calcFeatures(candles) {
  const closes = candles.map(c => c.close);
  const i = closes.length - 1;

  if (i < 21) return null;

  const emaFast = ema(closes, 5);
  const emaSlow = ema(closes, 20);

  const returns = (closes[i] - closes[i - 1]) / closes[i - 1];

  const volWindow = 10;
  const slice = closes.slice(i - volWindow, i);
  const mean = slice.reduce((a, b) => a + b, 0) / slice.length;
  const volatility = Math.sqrt(
    slice.reduce((s, v) => s + (v - mean) ** 2, 0) / slice.length
  );

  return [
    returns,
    emaFast[i],
    emaSlow[i],
    emaFast[i] - emaSlow[i],
    volatility
  ];
}

module.exports = { calcFeatures };
