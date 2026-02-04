# grid_search.py

import pandas as pd
import numpy as np
import joblib

FEATURES = [
    "returns",
    "ema_fast",
    "ema_slow",
    "ema_diff",
    "volatility"
]

STOP = 0.003
TAKE = 0.006
FEE = 0.0004

df = pd.read_csv("dataset.csv")
model = joblib.load("model.pkl")
scaler = joblib.load("scaler.pkl")

X = scaler.transform(df[FEATURES])
proba = model.predict_proba(X)[:, 1]
trend = df["ema_fast"] > df["ema_slow"]


def run(conf, hold):
    equity = 1.0
    trades = 0
    i = 0

    while i < len(df) - hold:
        if proba[i] > conf and trend.iloc[i]:
            entry = df.iloc[i]["close"]
            ret = 0.0

            for j in range(1, hold + 1):
                price = df.iloc[i + j]["close"]
                move = (price - entry) / entry

                if move <= -STOP:
                    ret = -STOP
                    break
                if move >= TAKE:
                    ret = TAKE
                    break

                ret = move

            ret -= FEE
            equity *= 1 + ret
            trades += 1
            i += hold
        else:
            i += 1

    return trades, (equity - 1) * 100


print("\nCONF  HOLD  TRADES  PNL%")
print("------------------------")

for conf in [0.60, 0.62, 0.65, 0.68, 0.70]:
    for hold in [3, 5, 7, 10]:
        trades, pnl = run(conf, hold)
        if trades >= 20:
            print(f"{conf:.2f}   {hold:>2}    {trades:>4}   {pnl:>6.2f}")
