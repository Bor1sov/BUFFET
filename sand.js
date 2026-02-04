require('dotenv').config();
const { TinkoffInvestApi } = require('tinkoff-invest-api');

const api = new TinkoffInvestApi({
  token: process.env.TINKOFF_TOKEN,
});

async function main() {
  const res = await api.sandbox.openSandboxAccount({
    name: 'Buffet Sandbox',
  });

  console.log('✅ Sandbox account created');
  console.log('ACCOUNT_ID =', res.accountId);
}

main().catch(err => {
  console.error('❌', err);
});
