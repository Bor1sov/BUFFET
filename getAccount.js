require('dotenv').config();
const { TinkoffInvestApi } = require('tinkoff-invest-api');

const api = new TinkoffInvestApi({
  token: process.env.TINKOFF_TOKEN,
  appName: 'TestGetAccounts',
  sandbox: process.env.SANDBOX === 'true'  // true — песочница, false — реальный счёт
});

async function getAccounts() {
  try {
    const response = await api.users.getAccounts({});

    console.log('Ваши счета:');
    if (response.accounts.length === 0) {
      console.log('Счетов не найдено. Возможно:');
      console.log('• Нет открытых брокерских счетов в Тинькофф');
      console.log('• Неправильный токен или права доступа');
      console.log('• В песочнице нужно сначала создать счёт');
      return;
    }

    response.accounts.forEach((acc, index) => {
      console.log(`\nСчёт #${index + 1}:`);
      console.log(`  accountId:     ${acc.id}`);
      console.log(`  Название:      ${acc.name || '(без имени)'}`);
      console.log(`  Тип:           ${acc.type}`);
      console.log(`  Статус:        ${acc.status}`);
      console.log(`  Открыт:        ${acc.openedDate ? new Date(acc.openedDate).toLocaleDateString() : '—'}`);
    });

    // Обычно берут первый открытый счёт
    const openAccount = response.accounts.find(a => a.status === 'ACCOUNT_STATUS_OPEN');
    if (openAccount) {
      console.log(`\nРекомендуемый accountId для .env: ${openAccount.id}`);
    }
  } catch (err) {
    console.error('Ошибка:', err.message || err);
    if (err.code) console.error('Код ошибки:', err.code);
  }
}

getAccounts();