const { api, getAccountId } = require('./api');

async function placeOrder(figi, quantity, price, direction) {
  const accountId = await getAccountId();

  try {
    const order = await api.orders.postOrder({
      figi,
      quantity,
      price: { units: Math.floor(price), nano: Math.floor((price % 1) * 1e9) },
      direction: direction === 'buy' ? 'ORDER_DIRECTION_BUY' : 'ORDER_DIRECTION_SELL',
      accountId,
      orderType: 'ORDER_TYPE_MARKET',
      orderId: Date.now().toString()  // Уникальный ID
    });
    console.log(`Order placed: ${direction.toUpperCase()} ${quantity} of ${figi} at ${price}`);
    return order;
  } catch (error) {
    console.error('Error placing order:', error);
  }
}

module.exports = { placeOrder };