import os
import pandas as pd
import matplotlib.pyplot as plt

# ===== PATH FIX =====
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CSV_PATH = os.path.join(BASE_DIR, 'equity_curve.csv')

# ===== LOAD DATA =====
df = pd.read_csv(CSV_PATH)

# ===== METRICS =====
start_equity = df['equity'].iloc[0]
end_equity = df['equity'].iloc[-1]
total_return = (end_equity / start_equity - 1) * 100

rolling_max = df['equity'].cummax()
drawdown = (rolling_max - df['equity']) / rolling_max
max_dd = drawdown.max() * 100

# ===== PLOT =====
plt.figure(figsize=(12, 6))
plt.plot(df['equity'], label='Equity Curve', linewidth=2)
plt.fill_between(
    df.index,
    df['equity'],
    rolling_max,
    alpha=0.2,
    label='Drawdown'
)

plt.title(
    f'Equity Curve | Return: {total_return:.2f}% | Max DD: {max_dd:.2f}%'
)
plt.xlabel('Step')
plt.ylabel('Equity')
plt.grid(True)
plt.legend()
plt.tight_layout()
plt.show()
