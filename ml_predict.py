import sys
import json
import joblib
import numpy as np
import pandas as pd

model = joblib.load("model.joblib")

data = json.loads(sys.argv[1])
df = pd.DataFrame(data)

# те же фичи, что при обучении
df["returns"] = df["close"].pct_change()
df["ema_fast"] = df["close"].ewm(span=5).mean()
df["ema_slow"] = df["close"].ewm(span=20).mean()
df["ema_diff"] = df["ema_fast"] - df["ema_slow"]
df["volatility"] = df["returns"].rolling(10).std()

df = df.dropna()

if len(df) == 0:
    print(0.5)
    sys.exit(0)

X = df[["returns", "ema_diff", "volatility"]].iloc[-1:]
p = model.predict_proba(X)[0][1]

print(float(p))
