require('dotenv').config();

const {
  TinkoffInvestApi,
  SandboxAccount,
} = require('tinkoff-invest-api');

const api = new TinkoffInvestApi({
  token: process.env.TINKOFF_TOKEN,
});

// ⬇️ сразу sandbox-аккаунт
const account = new SandboxAccount(api, process.env.ACCOUNT_ID);

async function main() {
  // простой sandbox-запрос — портфель
  const portfolio = await account.getPortfolio();
  console.log('Portfolio positions:', portfolio.positions);
}

main().catch(err => {
  console.error('❌ gRPC error:', err);
});
