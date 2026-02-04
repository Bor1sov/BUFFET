import pandas as pd
import numpy as np
import joblib

# ===== PARAMS =====
CONF = 0.55
DEV = 0.002
HOLD = 15
SL = 0.003
# ==================

model = joblib.load("model.pkl")
scaler = joblib.load("scaler.pkl")

df = pd.read_csv("dataset.csv")
df.reset_index(drop=True, inplace=True)

price = df["close"].values

# ===== FEATURES (строго как при обучении) =====
FEATURE_COLS = list(scaler.feature_names_in_)
X = scaler.transform(df[FEATURE_COLS])
proba = model.predict_proba(X)[:, 1]

# ===== INDICATORS =====
df["sma50"] = df["close"].rolling(50).mean()
df["dev"] = (df["close"] - df["sma50"]) / df["sma50"]

# ===== BACKTEST =====
equity = [1.0]
pos = 0
entry_price = 0
bars = 0
trades = []

for i in range(50, len(df)):
    eq = equity[-1]

    if pos == 0:
        # LONG mean reversion
        if df["dev"].iloc[i] < -DEV and proba[i] > CONF:
            pos = 1
            entry_price = price[i]
            entry_sma = df["sma50"].iloc[i]
            bars = 0

        # SHORT mean reversion
        elif df["dev"].iloc[i] > DEV and proba[i] < (1 - CONF):
            pos = -1
            entry_price = price[i]
            entry_sma = df["sma50"].iloc[i]
            bars = 0

        equity.append(eq)
        continue

    bars += 1
    ret = (price[i] - entry_price) / entry_price * pos

    # ===== EXIT CONDITIONS =====
    exit_sma = (
        pos == 1 and price[i] >= df["sma50"].iloc[i]
    ) or (
        pos == -1 and price[i] <= df["sma50"].iloc[i]
    )

    exit_trade = (
        ret <= -SL or
        exit_sma or
        bars >= HOLD
    )

    if exit_trade:
        eq *= (1 + ret)
        trades.append(ret)
        pos = 0

    equity.append(eq)

# ===== RESULTS =====
equity = np.array(equity)
bh = price / price[0]

print("\n============= MEAN REVERSION + ML (TP = SMA) =============")
print(f"Trades:        {len(trades)}")
print(f"Win rate:      {np.mean(np.array(trades) > 0) * 100:.2f}%")
print(f"Strategy PnL:  {(equity[-1] - 1) * 100:.2f}%")
print("=========================================================")

# ===== SAVE EQUITY =====
pd.DataFrame({
    "equity": equity[:len(price)],
    "buy_hold": bh[:len(equity)]
}).to_csv("equity_curve.csv", index=False)
