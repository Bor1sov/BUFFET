require('dotenv').config();

const { getCandles, normalize } = require('./data');
const { trainModel, predict } = require('./ml');
const { placeOrder } = require('./orders');
const { api, getAccountId } = require('./api');

/* ================= НАСТРОЙКИ ================= */

const FIGI = process.env.FIGI;
const WINDOW_SIZE = 60;
const INTERVAL_MS = 10 * 60 * 1000;

const CONF_BUY = Number(process.env.CONFIDENCE_BUY || 0.65);
const CONF_SELL = Number(process.env.CONFIDENCE_SELL || 0.40);
const REAL_TRADING = process.env.REAL_TRADING === 'true';
const MAX_POSITION_RUB = Number(process.env.MAX_POSITION_RUB || 5000);

/* ================= СОСТОЯНИЕ ================= */

let model = null;
let scale = { min: null, max: null };
let inPosition = false;
let entryPrice = null;

/* ================= ИНИЦИАЛИЗАЦИЯ ================= */

async function initialize() {
  const candles = await getCandles(FIGI, 7);
  const prices = candles.map(c => c.close);

  scale.min = Math.min(...prices);
  scale.max = Math.max(...prices);

  const norm = normalize(prices, scale.min, scale.max);
  model = await trainModel(norm, WINDOW_SIZE);

  console.log('✅ Модель UP/DOWN готова');
}

/* ================= ТОРГОВЫЙ ЦИКЛ ================= */

async function runTradingCycle() {
  const candles = await getCandles(FIGI, 1);
  if (candles.length < WINDOW_SIZE + 2) return;

  const prices = candles.map(c => c.close);
  const currentPrice = prices.at(-1);

  const norm = normalize(prices, scale.min, scale.max);
  const recent = norm.slice(-WINDOW_SIZE);

  const probUp = await predict(model, recent);

  console.log(
    `Price=${currentPrice.toFixed(2)} | ` +
    `P(UP)=${(probUp * 100).toFixed(1)}% | ` +
    `InPos=${inPosition} | REAL=${REAL_TRADING}`
  );

  /* ===== EXIT ===== */

  if (inPosition && probUp < CONF_SELL) {
    console.log('🔴 EXIT (вероятность падения)');
    if (REAL_TRADING) {
      await placeOrder(FIGI, 1, currentPrice, 'sell');
    }
    inPosition = false;
    return;
  }

  /* ===== ENTRY ===== */

  if (!inPosition && probUp > CONF_BUY) {
    const accountId = await getAccountId();
    const pf = await api.operations.getPortfolio({ accountId });
    const cash =
      Number(pf.totalAmountCurrencies.units) +
      Number(pf.totalAmountCurrencies.nano) / 1e9;

    if (cash < currentPrice) {
      console.log('❌ Недостаточно средств');
      return;
    }

    const maxLots = Math.floor(MAX_POSITION_RUB / currentPrice);
    if (maxLots < 1) {
      console.log('❌ MAX_POSITION слишком мал');
      return;
    }

    console.log('🟢 BUY (UP probability)');
    if (REAL_TRADING) {
      await placeOrder(FIGI, 1, currentPrice, 'buy');
    }

    inPosition = true;
    entryPrice = currentPrice;
  }
}

/* ================= ЗАПУСК ================= */

(async () => {
  await initialize();
  setInterval(runTradingCycle, INTERVAL_MS);
})();
