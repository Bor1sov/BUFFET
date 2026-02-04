// bot.js (фрагмент с риском)

const STOP_LOSS = 0.003;     // 0.3%
const TAKE_PROFIT = 0.006;  // 0.6%
const COOLDOWN_MS = 30 * 60 * 1000; // 30 мин
const DAILY_LOSS_LIMIT = -0.02;    // -2% в день

let lastTradeTime = 0;
let dailyPnl = 0;
let entryPrice = null;

function canTrade() {
  if (Date.now() - lastTradeTime < COOLDOWN_MS) return false;
  if (dailyPnl <= DAILY_LOSS_LIMIT) return false;
  return true;
}

// при входе
entryPrice = currentPrice;
lastTradeTime = Date.now();

// при каждом тике
if (inPosition) {
  const move = (currentPrice - entryPrice) / entryPrice;

  if (move <= -STOP_LOSS) {
    console.log("🛑 STOP LOSS");
    // sell
    dailyPnl += move;
    inPosition = false;
  }

  if (move >= TAKE_PROFIT) {
    console.log("🎯 TAKE PROFIT");
    // sell
    dailyPnl += move;
    inPosition = false;
  }
}
