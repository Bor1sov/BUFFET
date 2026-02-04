const tf = require('@tensorflow/tfjs');

/*
  y = 1  → цена выросла
  y = 0  → цена упала или не изменилась
*/

async function trainModel(data, windowSize = 60) {
  if (data.length < windowSize + 2) {
    throw new Error('Недостаточно данных для обучения');
  }

  const samples = data.length - windowSize - 1;
  const xs = new Float32Array(samples * windowSize);
  const ys = new Float32Array(samples);

  let offset = 0;

  for (let i = 0; i < samples; i++) {
    for (let j = 0; j < windowSize; j++) {
      xs[offset++] = data[i + j];
    }

    const current = data[i + windowSize];
    const next = data[i + windowSize + 1];

    ys[i] = next > current ? 1 : 0;
  }

  const xsTensor = tf.tensor3d(xs, [samples, windowSize, 1]);
  const ysTensor = tf.tensor2d(ys, [samples, 1]);

  const model = tf.sequential();
  model.add(tf.layers.lstm({
    units: 64,
    inputShape: [windowSize, 1]
  }));
  model.add(tf.layers.dense({
    units: 1,
    activation: 'sigmoid' // 🔑 вероятность UP
  }));

  model.compile({
    optimizer: 'adam',
    loss: 'binaryCrossentropy',
    metrics: ['accuracy']
  });

  console.log('Начало обучения (UP/DOWN)...');

  await model.fit(xsTensor, ysTensor, {
    epochs: 20,
    batchSize: 32,
    validationSplit: 0.2,
    verbose: 1
  });

  xsTensor.dispose();
  ysTensor.dispose();

  console.log('Обучение завершено');
  return model;
}

async function predict(model, recent) {
  const input = tf.tensor3d(new Float32Array(recent), [1, recent.length, 1]);
  const prob = (await model.predict(input).data())[0];
  input.dispose();
  return prob; // вероятность роста
}

module.exports = { trainModel, predict };
