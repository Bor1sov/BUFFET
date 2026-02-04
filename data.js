const fs = require('fs');
const path = require('path');

function loadCSV(file) {
  const text = fs.readFileSync(path.resolve(file), 'utf8').trim();
  const lines = text.split('\n');
  lines.shift();

  return lines.map(l => {
    const [time, open, high, low, close, volume] = l.split(',');
    return {
      time: new Date(time),
      open: +open,
      high: +high,
      low: +low,
      close: +close,
      volume: +volume
    };
  });
}

// 🔹 Эмуляция getCandles (например из CSV)
async function getCandles(figi, days) {
  const candles = loadCSV('./data.csv'); // путь к CSV
  return candles.slice(-days * 24 * 60); // грубо: минутные свечи
}

// 🔹 Нормализация для ML
function normalize(arr, min, max) {
  return arr.map(v => (v - min) / (max - min));
}

module.exports = {
  loadCSV,
  getCandles,
  normalize
};
