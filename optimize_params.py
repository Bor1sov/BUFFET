# optimize_params.py

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

# ================== BACKTEST CORE ==================
def backtest(conf, hold, stop, take):
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
HOLD_GRID = [3, 5, 7, 10]
STOP_GRID = [0.002, 0.003, 0.004]
TAKE_GRID = [0.004, 0.006, 0.008, 0.01]

results = []

print("\nCONF HOLD STOP TAKE TRADES  PNL%   DD%")
print("--------------------------------------")

for conf in CONF_GRID:
    for hold in HOLD_GRID:
        for stop in STOP_GRID:
            for take in TAKE_GRID:
                trades, pnl, dd = backtest(conf, hold, stop, take)

                if trades < 30:
                    continue

                results.append((conf, hold, stop, take, trades, pnl, dd))

                if pnl > 1:
                    print(f"{conf:>4.2f} {hold:>4} {stop:>4.3f} {take:>4.3f} "
                          f"{trades:>6} {pnl:>7.2f} {dd:>6.2f}")

# ================== TOP RESULTS ==================
df_res = pd.DataFrame(
    results,
    columns=["conf", "hold", "stop", "take", "trades", "pnl", "dd"]
)

df_res = df_res.sort_values(
    by=["pnl", "dd", "trades"],
    ascending=[False, True, False]
)

print("\n========= TOP 10 CONFIGS =========")
print(df_res.head(10).to_string(index=False))

df_res.to_csv("optimization_results.csv", index=False)
