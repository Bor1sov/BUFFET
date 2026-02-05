import pkg from "tinkoff-invest-api";
import crypto from "crypto";

const {
  TinkoffInvestApi,
  SandboxAccount,
  RealAccount,
} = pkg;

const TOKEN = process.env.TINKOFF_TOKEN;
const USE_SANDBOX = process.env.TINKOFF_SANDBOX === "true";
const ACCOUNT_ID = process.env.ACCOUNT_ID;

if (!TOKEN) {
  throw new Error("TINKOFF_TOKEN is not set");
}

if (!ACCOUNT_ID) {
  throw new Error("ACCOUNT_ID must be set (sandbox or real)");
}

const api = new TinkoffInvestApi({ token: TOKEN });

let broker = null;

/**
 * Инициализация брокера
 */
export async function createPaperBroker() {
  if (broker) return broker;

  if (USE_SANDBOX) {
    console.log("🧪 Using SANDBOX (ACCOUNT_ID from .env)");
    broker = new SandboxAccount(api);
  } else {
    console.log("💼 Using REAL account");
    broker = new RealAccount(api);
  }

  return broker;
}

/**
 * BUY
 */
export async function buy(figi, qty, price) {
  if (!broker) await createPaperBroker();

  return broker.postOrder({
    figi,
    quantity: qty,
    price,
    direction: "ORDER_DIRECTION_BUY",
    orderType: "ORDER_TYPE_LIMIT",
    accountId: ACCOUNT_ID,
    orderId: crypto.randomUUID(),
  });
}

/**
 * SELL
 */
export async function sell(figi, qty, price) {
  if (!broker) await createPaperBroker();

  return broker.postOrder({
    figi,
    quantity: qty,
    price,
    direction: "ORDER_DIRECTION_SELL",
    orderType: "ORDER_TYPE_LIMIT",
    accountId: ACCOUNT_ID,
    orderId: crypto.randomUUID(),
  });
}
