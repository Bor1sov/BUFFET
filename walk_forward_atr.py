import pandas as pd
import numpy as np
import joblib

# ===== LOAD =====
model = joblib.load("model.pkl")
scaler = joblib.load("scaler.pkl")
df = pd.read_csv("dataset.csv").reset_index(drop=True)

price = df["close"].values

# ===== FEATURES =====
FEATURE_COLS = list(scaler.feature_names_in_)
X = scaler.transform(df[FEATURE_COLS])
proba = model.predict_proba(X)[:, 1]

# ===== INDICATORS =====
df["sma50"] = df["close"].rolling(50).mean()
df["atr"] = df["close"].diff().abs().rolling(14).mean()
df["dev"] = (df["close"] - df["sma50"]) / df["sma50"]

# ===== PARAM GRIDS =====
CONF_GRID = [0.52, 0.55, 0.58]
K_ATR_GRID = [0.8, 1.0, 1.2, 1.5]
HOLD = 15
SL = 0.003

TRAIN_SIZE = 3000
TEST_SIZE = 1000

# ===== BACKTEST FUNCTION =====
def run_segment(start, end, CONF, K_ATR):
    eq = 1.0
    pos = 0
    entry = 0
    bars = 0
    trades = []

    for i in range(start, end):
        dev_thr = K_ATR * df["atr"].iloc[i] / price[i]

        if pos == 0:
            if df["dev"].iloc[i] < -dev_thr and proba[i] > CONF:
                pos = 1
                entry = price[i]
                bars = 0
            elif df["dev"].iloc[i] > dev_thr and proba[i] < 1 - CONF:
                pos = -1
                entry = price[i]
                bars = 0
            continue

        bars += 1
        ret = (price[i] - entry) / entry * pos

        exit_sma = (
            pos == 1 and price[i] >= df["sma50"].iloc[i]
        ) or (
            pos == -1 and price[i] <= df["sma50"].iloc[i]
        )

        if ret <= -SL or exit_sma or bars >= HOLD:
            eq *= (1 + ret)
            trades.append(ret)
            pos = 0

    return eq, trades

# ===== WALK FORWARD =====
wf_equity = 1.0
all_trades = []

i = TRAIN_SIZE

print("\n=========== WALK-FORWARD (ATR MEAN REVERSION) ===========")

while i + TEST_SIZE < len(df):
    best_eq = -np.inf
    best_params = None

    # --- OPTIMIZE ON TRAIN ---
    for CONF in CONF_GRID:
        for K_ATR in K_ATR_GRID:
            eq, _ = run_segment(i - TRAIN_SIZE, i, CONF, K_ATR)
            if eq > best_eq:
                best_eq = eq
                best_params = (CONF, K_ATR)

    CONF, K_ATR = best_params

    # --- TEST ---
    eq_test, trades = run_segment(i, i + TEST_SIZE, CONF, K_ATR)
    wf_equity *= eq_test
    all_trades.extend(trades)

    print(
        f"Test {i:5d}-{i+TEST_SIZE:5d} | "
        f"CONF={CONF:.2f} K_ATR={K_ATR:.2f} | "
        f"Trades={len(trades):3d} | "
        f"PnL={(eq_test-1)*100:6.2f}%"
    )

    i += TEST_SIZE

# ===== RESULTS =====
print("\n================ FINAL WALK-FORWARD RESULT ================")
print(f"Total trades: {len(all_trades)}")
print(f"Win rate:     {np.mean(np.array(all_trades) > 0) * 100:.2f}%")
print(f"Total PnL:    {(wf_equity - 1) * 100:.2f}%")
print("==========================================================")
