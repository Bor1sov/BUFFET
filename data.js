const fs = require('fs');
const path = require('path');

function loadCSV(file) {
  const text = fs.readFileSync(path.resolve(file), 'utf8').trim();
  const lines = text.split('\n');
  const header = lines.shift();

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

module.exports = { loadCSV };
