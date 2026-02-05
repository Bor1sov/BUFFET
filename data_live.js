// data_live.js
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const {
  TinkoffInvestApi,
  RealAccount,
  SandboxAccount,
} = require("tinkoff-invest-api");

const TOKEN = process.env.TINKOFF_TOKEN;
if (!TOKEN) {
  throw new Error("TINKOFF_TOKEN is not set");
}

const api = new TinkoffInvestApi({ token: TOKEN });

// sandbox / real определяется токеном
const AccountClass = TOKEN.startsWith("t.")
  ? SandboxAccount
  : RealAccount;

const account = new AccountClass(api);

async function getCandles(figi, lookbackMinutes) {
  const to = new Date();
  const from = new Date(to.getTime() - lookbackMinutes * 60 * 1000);

  const res = await api.marketdata.getCandles({
    figi,
    from,
    to,
    interval: 1, // ✅ CANDLE_INTERVAL_1_MIN
  });

  if (!res?.candles?.length) {
    return [];
  }

  return res.candles.map(c => ({
    time: c.time,
    close:
      Number(c.close.units) +
      Number(c.close.nano) * 1e-9,
  }));
}

export { getCandles, account };
