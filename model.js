function predictUpProb(candles, i) {
  if (i < 3) return 0.5;

  const r1 = candles[i].close - candles[i - 1].close;
  const r2 = candles[i - 1].close - candles[i - 2].close;
  const r3 = candles[i - 2].close - candles[i - 3].close;

  const score = r1 + r2 + r3;
  return score > 0 ? 0.6 : 0.4;
}

module.exports = { predictUpProb };