// data.js
// ES MODULE VERSION

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// ===== __dirname fix for ES modules =====
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ===== LOAD CSV =====
function loadCSV(file) {
  const text = fs.readFileSync(path.resolve(__dirname, file), "utf8").trim();
  const lines = text.split(/\r?\n/);
  lines.shift(); // header

  return lines.map(l => {
    const [time, close] = l.split(",");
    return {
      time,
      close: Number(close),
    };
  });
}

// ===== EMULATE getCandles =====
// figi не используется, оставлен для совместимости
async function getCandles(figi, minutes) {
  const candles = loadCSV("./price_series.csv");
  return candles.slice(-minutes);
}

export {
  loadCSV,
  getCandles
};
