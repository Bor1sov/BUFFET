# predict_proba.py
import sys
import numpy as np
import joblib

model = joblib.load("model.pkl")
scaler = joblib.load("scaler.pkl")

# аргументы из Node: "v1,v2,v3,v4,v5"
features = np.array([list(map(float, sys.argv[1].split(",")))])

features = scaler.transform(features)
prob_up = model.predict_proba(features)[0][1]

print(prob_up)
