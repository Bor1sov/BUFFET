import pandas as pd
import matplotlib.pyplot as plt

# ===== LOAD DATA =====
price = pd.read_csv('price_series.csv')
trades = pd.read_csv('trades.csv')
equity = pd.read_csv('equity_curve.csv')
equity_bh = pd.read_csv('equity_bh.csv')

# ===== INDICATORS =====
price['SMA20'] = price['price'].rolling(20).mean()
price['SMA50'] = price['price'].rolling(50).mean()

buy = trades[trades.type == 'BUY']
sell = trades[trades.type == 'SELL']
stop = trades[trades.type == 'STOP']

# ===== PLOT =====
fig, ax = plt.subplots(2, 1, figsize=(15, 9), sharex=True)

# --- PRICE ---
ax[0].plot(price.step, price.price, label='Price', color='black', linewidth=2)
ax[0].plot(price.step, price.SMA20, '--', label='SMA 20')
ax[0].plot(price.step, price.SMA50, '--', label='SMA 50')

ax[0].scatter(buy.step, buy.price, marker='^', s=100, label='BUY')
ax[0].scatter(sell.step, sell.price, marker='v', s=100, label='SELL')
ax[0].scatter(stop.step, stop.price, marker='x', s=100, label='STOP')

ax[0].set_title('Price + SMA(20/50) + Trades')
ax[0].legend()
ax[0].grid(True)

# --- EQUITY ---
ax[1].plot(equity.step, equity.equity, label='Strategy', linewidth=2)
ax[1].plot(equity_bh.step, equity_bh.equity, label='Buy & Hold', linewidth=2)

ax[1].set_ylabel('Equity')
ax[1].set_title('Equity Curve Comparison')
ax[1].legend()
ax[1].grid(True)

plt.tight_layout()
plt.show()
