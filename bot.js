import "dotenv/config";
import { getCandles } from "./data_live.js";
import { buy, sell, createPaperBroker } from "./broker_paper.js";
import { predictUpProbability } from "./ml_predict.js";

const FIGI = "BBG004730N88";
const QTY = 1;

const BUY_OFFSET = 1.001;
const SELL_OFFSET = 0.999;

const DEV_ENTRY = -0.0007;
const DEV_EXIT = 0.0005;

let position = 0;

await createPaperBroker();

console.log(
  `🤖 Bot started [${process.env.TINKOFF_SANDBOX === "true" ? "SANDBOX" : "REAL"}]`
);

setInterval(async () => {
  try {
    const candles = await getCandles(FIGI, 50);
    if (candles.length < 30) return;

    const last = candles[candles.length - 1];
    const price = last.close;

    const mean =
      candles.reduce((s, c) => s + c.close, 0) / candles.length;
    const dev = (price - mean) / mean;

    const pUp = predictUpProbability(candles);

    console.log(
      `📊 ${process.env.TINKOFF_SANDBOX === "true" ? "SANDBOX" : "REAL"} price=${price.toFixed(
        2
      )} dev=${dev.toFixed(4)} pUp=${pUp.toFixed(3)}`
    );

    if (position === 0 && dev < DEV_ENTRY && pUp > 0.55) {
      console.log("🟢 LONG ENTRY");
      await buy(FIGI, QTY, price * BUY_OFFSET);
      position = 1;
    }

    if (position === 1 && dev > DEV_EXIT) {
      console.log("🔴 EXIT LONG");
      await sell(FIGI, QTY, price * SELL_OFFSET);
      position = 0;
    }
  } catch (err) {
    console.error("❌ Bot error:", err.message);
  }
}, 5000);
