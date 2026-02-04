# ml_backtest.py

import pandas as pd
import numpy as np
import joblib

# ================== НАСТРОЙКИ ==================
CONFIDENCE = 0.65
HOLD = 5

STOP = 0.003      # -0.3%
TAKE = 0.006      # +0.6%
FEE = 0.0004

FEATURES = [
    "returns",
    "ema_fast",
    "ema_slow",
    "ema_diff",
    "volatility"
]

# ================== LOAD ==================
df = pd.read_csv("dataset.csv")

model = joblib.load("model.pkl")
scaler = joblib.load("scaler.pkl")

X = scaler.transform(df[FEATURES])
proba = model.predict_proba(X)[:, 1]

trend = df["ema_fast"] > df["ema_slow"]

print("Prob mean:", proba.mean())
print("Prob std: ", proba.std())
print("Prob min/max:", proba.min(), proba.max())

# ================== BACKTEST ==================
equity = 1.0
equity_curve = []
trades_log = []

in_position = False
entry_price = None
entry_time = None
entry_idx = None

for i in range(len(df) - HOLD):

    time = df.iloc[i]["time"] if "time" in df.columns else i
    price = df.iloc[i]["close"]

    # ====== ENTRY ======
    if not in_position:
        if proba[i] > CONFIDENCE and trend.iloc[i]:
            in_position = True
            entry_price = price
            entry_time = time
            entry_idx = i
            hold_count = 0

    # ====== POSITION ======
    if in_position:
        hold_count += 1
        move = (price - entry_price) / entry_price

        exit_reason = None

        if move <= -STOP:
            exit_reason = "stop"
        elif move >= TAKE:
            exit_reason = "take"
        elif hold_count >= HOLD:
            exit_reason = "time"

        if exit_reason:
            ret = move - FEE
            equity *= (1 + ret)

            trades_log.append({
                "entryTime": entry_time,
                "exitTime": time,
                "entry": entry_price,
                "exit": price,
                "return": ret,
                "reason": exit_reason
            })

            in_position = False
            entry_price = None
            entry_time = None
            entry_idx = None

    equity_curve.append({
        "time": time,
        "equity": equity
    })

# ================== SAVE ==================
pd.DataFrame(equity_curve).to_csv("equity_curve.csv", index=False)
pd.DataFrame(trades_log).to_csv("trades.csv", index=False)

# BUY & HOLD
bh_equity = []
start_price = df.iloc[0]["close"]

for i in range(len(df)):
    time = df.iloc[i]["time"] if "time" in df.columns else i
    bh_equity.append({
        "time": time,
        "equity": df.iloc[i]["close"] / start_price
    })

pd.DataFrame(bh_equity).to_csv("equity_bh.csv", index=False)

# PRICE SERIES
df[["time", "close"]].to_csv("price_series.csv", index=False)

# ================== RESULTS ==================
trades = len(trades_log)
wins = sum(1 for t in trades_log if t["return"] > 0)

print("\n============= ML RESULTS =============")
print("Trades:       ", trades)
print("Win rate:     ", f"{wins / trades * 100:.2f}%" if trades else "0%")
print("Strategy PnL: ", f"{(equity - 1) * 100:.2f}%")
print("=====================================")
