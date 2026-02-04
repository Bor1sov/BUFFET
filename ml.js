const tf = require('@tensorflow/tfjs');

const LOOKBACK = 30;

function prepareData(candles) {
  if (!candles || candles.length < LOOKBACK + 2) {
    throw new Error(`Not enough candles: ${candles?.length}`);
  }

  const returns = [];

  for (let i = 1; i < candles.length; i++) {
    const prev = candles[i - 1]?.close;
    const curr = candles[i]?.close;

    if (
      typeof prev !== 'number' ||
      typeof curr !== 'number' ||
      !isFinite(prev) ||
      !isFinite(curr)
    ) {
      continue; // ❗ пропускаем битые свечи
    }

    returns.push((curr - prev) / prev);
  }

  if (returns.length < LOOKBACK + 2) {
    throw new Error(`Not enough valid returns: ${returns.length}`);
  }

  const X = [];
  const y = [];

  for (let i = LOOKBACK; i < returns.length - 1; i++) {
    const window = returns.slice(i - LOOKBACK, i);
    const nextRet = returns[i + 1];

    if (window.some(v => !isFinite(v))) continue;

    X.push(window);
    y.push(nextRet > 0 ? 1 : 0);
  }

  if (X.length === 0) {
    throw new Error('No training samples after filtering');
  }

  const upRatio = y.reduce((a, b) => a + b, 0) / y.length;

  return {
    xTensor: tf.tensor3d(X, [X.length, LOOKBACK, 1]),
    yTensor: tf.tensor2d(y, [y.length, 1]),
    upRatio
  };
}

async function trainModel(candles) {
  const { xTensor, yTensor, upRatio } = prepareData(candles);

  console.log('UP ratio:', upRatio.toFixed(3));

  const model = tf.sequential();
  model.add(tf.layers.lstm({
    units: 32,
    inputShape: [LOOKBACK, 1]
  }));
  model.add(tf.layers.dense({ units: 1, activation: 'sigmoid' }));

  model.compile({
    optimizer: tf.train.adam(0.001),
    loss: 'binaryCrossentropy'
  });

  console.log('Начало обучения (UP/DOWN)...');
  await model.fit(xTensor, yTensor, {
    epochs: 20,
    batchSize: 32,
    validationSplit: 0.2,
    verbose: 1
  });

  return model;
}

function predictProb(model, candles) {
  const returns = [];

  for (let i = candles.length - LOOKBACK - 1; i < candles.length - 1; i++) {
    const prev = candles[i]?.close;
    const curr = candles[i + 1]?.close;

    if (!isFinite(prev) || !isFinite(curr)) return null;

    returns.push((curr - prev) / prev);
  }

  if (returns.length !== LOOKBACK) return null;

  const x = tf.tensor3d([returns], [1, LOOKBACK, 1]);
  return model.predict(x).dataSync()[0];
}

module.exports = { trainModel, predictProb };
