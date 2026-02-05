# walk_forward.py

import pandas as pd
import numpy as np
import joblib

# ================== LOAD ==================
df = pd.read_csv("dataset.csv")

model = joblib.load("model.pkl")
scaler = joblib.load("scaler.pkl")

FEATURES = [
    "returns",
    "ema_fast",
    "ema_slow",
    "ema_diff",
    "volatility"
]

X = scaler.transform(df[FEATURES])
proba = model.predict_proba(X)[:, 1]
trend = df["ema_fast"] > df["ema_slow"]

# ================== SPLIT ==================
split = int(len(df) * 0.6)
df_train = df.iloc[:split].reset_index(drop=True)
df_test = df.iloc[split:].reset_index(drop=True)

proba_train = proba[:split]
proba_test = proba[split:]

trend_train = trend.iloc[:split].reset_index(drop=True)
trend_test = trend.iloc[split:].reset_index(drop=True)

# ================== BACKTEST CORE ==================
def backtest(df, proba, trend, conf, hold, stop, take):
    equity = 1.0
    peak = 1.0
    max_dd = 0
    trades = 0

    in_pos = False
    entry = 0
    hold_cnt = 0

    for i in range(len(df) - hold):
        price = df.iloc[i]["close"]

        if not in_pos:
            if proba[i] > conf and trend.iloc[i]:
                in_pos = True
                entry = price
                hold_cnt = 0
        else:
            hold_cnt += 1
            move = (price - entry) / entry

            exit_trade = False

            if move <= -stop:
                exit_trade = True
            elif move >= take:
                exit_trade = True
            elif hold_cnt >= hold:
                exit_trade = True

            if exit_trade:
                ret = move - 0.0004
                equity *= (1 + ret)
                peak = max(peak, equity)
                max_dd = max(max_dd, (peak - equity) / peak)
                trades += 1
                in_pos = False

    return trades, (equity - 1) * 100, max_dd * 100

# ================== GRID ==================
CONF_GRID = [0.55, 0.60, 0.65, 0.70]
HOLD_GRID = [1, 2, 3, 5]
STOP_GRID = [0.001, 0.002, 0.003]
TAKE_GRID = [0.002, 0.004, 0.006]

best = None

print("\n🔍 OPTIMIZATION (TRAIN PART)")
print("CONF HOLD STOP TAKE TRADES  PNL%   DD%")
print("--------------------------------------")

for conf in CONF_GRID:
    for hold in HOLD_GRID:
        for stop in STOP_GRID:
            for take in TAKE_GRID:
                trades, pnl, dd = backtest(
                    df_train, proba_train, trend_train,
                    conf, hold, stop, take
                )

                if trades < 20:
                    continue

                if best is None or pnl > best["pnl"]:
                    best = {
                        "conf": conf,
                        "hold": hold,
                        "stop": stop,
                        "take": take,
                        "trades": trades,
                        "pnl": pnl,
                        "dd": dd
                    }

                if pnl > 1:
                    print(f"{conf:>4.2f} {hold:>4} {stop:>4.3f} {take:>4.3f} "
                          f"{trades:>6} {pnl:>7.2f} {dd:>6.2f}")

# ================== TEST ==================
print("\n🏁 BEST TRAIN CONFIG")
for k, v in best.items():
    print(f"{k}: {v}")

test_trades, test_pnl, test_dd = backtest(
    df_test, proba_test, trend_test,
    best["conf"], best["hold"], best["stop"], best["take"]
)

print("\n📊 OUT-OF-SAMPLE RESULT")
print("Trades:", test_trades)
print("PnL:   ", f"{test_pnl:.2f}%")
print("DD:    ", f"{test_dd:.2f}%")
