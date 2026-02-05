import pandas as pd
import matplotlib.pyplot as plt

# ===== LOAD EQUITY =====
eq = pd.read_csv("equity_curve.csv")

# ===== PLOT =====
plt.figure(figsize=(10, 4))
plt.plot(eq["equity"], label="Strategy")
plt.plot(eq["buy_hold"], label="Buy & Hold", linestyle="--")

plt.title("Equity Curve (Mean Reversion + ML)")
plt.legend()
plt.grid()
plt.tight_layout()
plt.show()
