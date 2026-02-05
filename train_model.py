# train_model.py

import pandas as pd
import joblib

from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import classification_report, accuracy_score

# =======================
# LOAD DATA
# =======================
df = pd.read_csv("dataset.csv")

# 🔥 CLEAN NaN / INF
df = df.replace([float("inf"), float("-inf")], float("nan"))
df = df.dropna().reset_index(drop=True)

print("Columns:", df.columns.tolist())
print("Rows:", len(df))

# =======================
# FEATURES / TARGET
# =======================
FEATURES = [
    "returns",
    "ema_fast",
    "ema_slow",
    "ema_diff",
    "volatility"
]

X = df[FEATURES]
y = df["up"]

# =======================
# TRAIN / TEST SPLIT (TIME SERIES)
# =======================
X_train, X_test, y_train, y_test = train_test_split(
    X,
    y,
    test_size=0.2,
    shuffle=False
)

# =======================
# SCALING
# =======================
scaler = StandardScaler()
X_train = scaler.fit_transform(X_train)
X_test = scaler.transform(X_test)

# =======================
# MODEL
# =======================
model = LogisticRegression(
    max_iter=2000,
    class_weight="balanced"
)

model.fit(X_train, y_train)

# =======================
# EVALUATION
# =======================
y_pred = model.predict(X_test)

print("\nAccuracy:", accuracy_score(y_test, y_pred))
print("\nClassification report:\n", classification_report(y_test, y_pred))

# =======================
# SAVE
# =======================
joblib.dump(model, "model.pkl")
joblib.dump(scaler, "scaler.pkl")

print("\n✅ Model saved: model.pkl")
print("✅ Scaler saved: scaler.pkl")
