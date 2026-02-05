require('dotenv').config();
const { TinkoffInvestApi } = require('tinkoff-invest-api');

const api = new TinkoffInvestApi({
  token: process.env.TINKOFF_TOKEN,
  appName: 'BuffetTradingBot',
  sandbox: process.env.SANDBOX === 'true'
});

// Функция для получения accountId, если не задан
async function getAccountId() {
  if (process.env.ACCOUNT_ID) {
    return process.env.ACCOUNT_ID;
  }
  try {
    const { accounts } = await api.users.getAccounts({});
    if (accounts.length === 0) {
      throw new Error('No accounts found. Create one in Tinkoff app.');
    }
    const accountId = accounts[0].id;
    console.log(`Using accountId: ${accountId}`);
    return accountId;
  } catch (error) {
    console.error('Error getting accounts:', error);
    process.exit(1);
  }
}

module.exports = { api, getAccountId };