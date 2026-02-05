import { spawnSync } from "child_process";

/**
 * Возвращает вероятность роста (pUp)
 * candles: [{ open, high, low, close, volume }]
 */
export function predictUpProbability(candles) {
  try {
    const input = JSON.stringify(
      candles.slice(-50).map(c => ({
        close: c.close
      }))
    );

    const res = spawnSync(
      "python",
      ["ml_predict.py", input],
      { encoding: "utf-8" }
    );

    if (res.error) {
      console.error("❌ ML spawn error:", res.error);
      return 0.5;
    }

    const out = res.stdout.trim();
    const p = Number(out);

    if (Number.isNaN(p)) return 0.5;
    return p;
  } catch (e) {
    console.error("❌ ML predict error:", e.message);
    return 0.5;
  }
}
