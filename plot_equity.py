import pandas as pd
import matplotlib.pyplot as plt

# ===== LOAD DATA =====
df = pd.read_csv('equity_curve.csv')

# ===== BASIC CHECK =====
if 'equity' not in df.columns:
    raise ValueError('CSV must contain "equity" column')

# ===== METRICS =====
start_equity = df['equity'].iloc[0]
end_equity = df['equity'].iloc[-1]
total_return = (end_equity / start_equity - 1) * 100

rolling_max = df['equity'].cummax()
drawdown = (rolling_max - df['equity']) / rolling_max
max_dd = drawdown.max() * 100

# ===== PLOT =====
plt.figure(figsize=(12, 6))
plt.plot(df['equity'], label='Equity Curve')
plt.fill_between(
    df.index,
    df['equity'],
    rolling_max,
    alpha=0.15,
    label='Drawdown'
)

plt.title(
    f'Equity Curve | Return: {total_return:.2f}% | Max DD: {max_dd:.2f}%'
)
plt.xlabel('Step')
plt.ylabel('Equity')
plt.legend()
plt.grid(True)

plt.tight_layout()
plt.show()
