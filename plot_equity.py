import pandas as pd
import matplotlib.pyplot as plt

price = pd.read_csv('price_series.csv', header=None, names=['price'])
equity = pd.read_csv('equity_curve.csv', header=None, names=['equity'])
bh = pd.read_csv('equity_bh.csv', header=None, names=['bh'])
trades = pd.read_csv('trades.csv', header=None, names=['i','price','type','ret'])

price['sma20'] = price['price'].rolling(20).mean()
price['sma50'] = price['price'].rolling(50).mean()

plt.figure(figsize=(14, 8))

plt.subplot(2, 1, 1)
plt.plot(price['price'], label='Price')
plt.plot(price['sma20'], label='SMA20')
plt.plot(price['sma50'], label='SMA50')

for _, t in trades.iterrows():
    if t['type'] == 'BUY':
        plt.scatter(t['i'], t['price'], color='green')
    else:
        plt.scatter(t['i'], t['price'], color='red')

plt.legend()
plt.title('Price + SMA + Trades')

plt.subplot(2, 1, 2)
plt.plot(equity['equity'], label='Strategy')
plt.plot(bh['bh'], label='Buy & Hold')
plt.legend()
plt.title('Equity Curve')

plt.tight_layout()
plt.show()
