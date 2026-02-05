import pandas as pd
import numpy as np
import joblib

# ===== PARAMS =====
CONF  = 0.55
ATR_N = 14
K_ATR = 1.2
HOLD  = 15
SL    = 0.003
# ==================

model = joblib.load("model.pkl")
scaler = joblib.load("scaler.pkl")

df = pd.read_csv("dataset.csv")
df.reset_index(drop=True, inplace=True)

price = df["close"].values

# ===== FEATURES =====
FEATURE_COLS = list(scaler.feature_names_in_)
X = scaler.transform(df[FEATURE_COLS])
proba = model.predict_proba(X)[:, 1]

# ===== INDICATORS =====
df["sma50"] = df["close"].rolling(50).mean()

# --- ATR proxy via close-to-close volatility ---
df["atr"] = df["close"].diff().abs().rolling(ATR_N).mean()


df["dev"] = (df["close"] - df["sma50"]) / df["sma50"]

# ===== BACKTEST =====
equity = [1.0]
pos = 0
entry_price = 0
bars = 0
trades = []

for i in range(max(50, ATR_N), len(df)):
    eq = equity[-1]

    dev_thr = K_ATR * df["atr"].iloc[i] / df["close"].iloc[i]

    if pos == 0:
        # LONG mean reversion
        if df["dev"].iloc[i] < -dev_thr and proba[i] > CONF:
            pos = 1
            entry_price = price[i]
            bars = 0

        # SHORT mean reversion
        elif df["dev"].iloc[i] > dev_thr and proba[i] < (1 - CONF):
            pos = -1
            entry_price = price[i]
            bars = 0

        equity.append(eq)
        continue

    bars += 1
    ret = (price[i] - entry_price) / entry_price * pos

    # TP = return to SMA
    exit_sma = (
        pos == 1 and price[i] >= df["sma50"].iloc[i]
    ) or (
        pos == -1 and price[i] <= df["sma50"].iloc[i]
    )

    if ret <= -SL or exit_sma or bars >= HOLD:
        eq *= (1 + ret)
        trades.append(ret)
        pos = 0

    equity.append(eq)

# ===== RESULTS =====
equity = np.array(equity)
bh = price / price[0]

print("\n============= MEAN REVERSION + ML (ATR DEV) =============")
print(f"Trades:        {len(trades)}")
print(f"Win rate:      {np.mean(np.array(trades) > 0) * 100:.2f}%")
print(f"Strategy PnL:  {(equity[-1] - 1) * 100:.2f}%")
print("========================================================")

# ===== SAVE EQUITY =====
pd.DataFrame({
    "equity": equity[:len(price)],
    "buy_hold": bh[:len(equity)]
}).to_csv("equity_curve.csv", index=False)
