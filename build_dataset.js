// build_dataset.js
import fs from 'fs';

const INPUT = './price_series.csv';
const OUTPUT = './dataset.csv';
const HORIZON = 5;

// ===== HELPERS =====
const mean = a => a.reduce((x, y) => x + y, 0) / a.length;
const std = a => {
  const m = mean(a);
  return Math.sqrt(mean(a.map(x => (x - m) ** 2)));
};

function SMA(v, p, i) {
  if (i < p) return null;
  return mean(v.slice(i - p, i));
}

function ATR(h, l, c, p, i) {
  if (i < p) return null;
  const trs = [];
  for (let j = i - p + 1; j <= i; j++) {
    trs.push(
      Math.max(
        h[j] - l[j],
        Math.abs(h[j] - c[j - 1]),
        Math.abs(l[j] - c[j - 1])
      )
    );
  }
  return mean(trs);
}

// ===== LOAD CSV =====
if (!fs.existsSync(INPUT)) {
  throw new Error(`❌ File not found: ${INPUT}`);
}

const raw = fs.readFileSync(INPUT, 'utf8').trim().split('\n');
console.log('Header:', raw[0]);
console.log('Sample row:', raw[1]);

const delimiter = raw[0].includes(';') ? ';' : ',';
console.log('Detected delimiter:', delimiter);

raw.shift(); // header

const data = raw
  .map(r => {
    const parts = r.split(delimiter);
    if (parts.length < 5) return null;

    const [time, open, high, low, close] = parts;

    return {
      time: Date.parse(time),
      open: +open,
      high: +high,
      low: +low,
      close: +close
    };
  })
  .filter(
    d =>
      d &&
      Number.isFinite(d.time) &&
      Number.isFinite(d.open) &&
      Number.isFinite(d.high) &&
      Number.isFinite(d.low) &&
      Number.isFinite(d.close)
  );

console.log(`Loaded candles: ${data.length}`);

if (data.length < 200) {
  throw new Error('❌ Too few candles for dataset');
}

// ===== FEATURES =====
const c = data.map(d => d.close);
const h = data.map(d => d.high);
const l = data.map(d => d.low);

const rows = [];

for (let i = 60; i < data.length - HORIZON; i++) {
  const ret1 = c[i] / c[i - 1] - 1;
  const ret5 = c[i] / c[i - 5] - 1;
  const ret10 = c[i] / c[i - 10] - 1;

  const sma20 = SMA(c, 20, i);
  const sma50 = SMA(c, 50, i);
  if (!sma20 || !sma50) continue;

  const vol10 = std(c.slice(i - 10, i));
  const vol20 = std(c.slice(i - 20, i));

  const atr14 = ATR(h, l, c, 14, i);
  if (!atr14) continue;

  const target = c[i + HORIZON] > c[i] ? 1 : 0;

  rows.push([
    ret1,
    ret5,
    ret10,
    (c[i] - sma20) / sma20,
    (c[i] - sma50) / sma50,
    vol10,
    vol20,
    atr14 / c[i],
    target
  ]);
}

// ===== SAVE =====
if (!rows.length) {
  throw new Error('❌ Dataset is empty');
}

const out =
  'ret1,ret5,ret10,distSMA20,distSMA50,vol10,vol20,atrNorm,target\n' +
  rows.map(r => r.join(',')).join('\n');

fs.writeFileSync(OUTPUT, out);

const up = rows.reduce((a, r) => a + r.at(-1), 0) / rows.length;

console.log(`✅ Dataset saved: ${OUTPUT}`);
console.log(`Rows: ${rows.length}`);
console.log(`UP ratio: ${(up * 100).toFixed(2)}%`);
