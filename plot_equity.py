# plot_equity.py

import pandas as pd
import matplotlib.pyplot as plt

# ========== UTILS ==========
def pick_time_column(df):
    for c in df.columns:
        if "time" in c.lower() or "date" in c.lower():
            return c
    return None

def pick_equity_column(df):
    for c in df.columns:
        if "equity" in c.lower() or "balance" in c.lower():
            return c
    return None

def clean_time(s):
    if isinstance(s, str):
        return s.split("(")[0].strip()
    return s

# ========== LOAD ==========
price = pd.read_csv("price_series.csv")
equity = pd.read_csv("equity_curve.csv")
bh = pd.read_csv("equity_bh.csv")
trades = pd.read_csv("trades.csv")

print("Equity columns:", equity.columns.tolist())
print("BH columns:", bh.columns.tolist())

# ========== PRICE ==========
price_time = pick_time_column(price)
if price_time is None:
    raise RuntimeError("❌ Не найдена колонка времени в price_series.csv")

price[price_time] = price[price_time].apply(clean_time)
price[price_time] = pd.to_datetime(price[price_time], errors="coerce")
price = price.dropna(subset=[price_time])

price["SMA20"] = price["close"].rolling(20).mean()
price["SMA50"] = price["close"].rolling(50).mean()

# ========== EQUITY ==========
eq_time = pick_time_column(equity)
eq_val = pick_equity_column(equity)

bh_time = pick_time_column(bh)
bh_val = pick_equity_column(bh)

# ========== PLOT ==========
plt.figure(figsize=(14, 8))

# ---- PRICE ----
plt.subplot(2, 1, 1)
plt.plot(price[price_time], price["close"], label="Price")
plt.plot(price[price_time], price["SMA20"], label="SMA20")
plt.plot(price[price_time], price["SMA50"], label="SMA50")

if not trades.empty:
    for _, t in trades.iterrows():
        if "entryTime" in t and "exitTime" in t:
            et = pd.to_datetime(clean_time(t["entryTime"]), errors="coerce")
            xt = pd.to_datetime(clean_time(t["exitTime"]), errors="coerce")
            if pd.notna(et) and pd.notna(xt):
                plt.scatter(et, t["entry"], c="green", s=30)
                plt.scatter(xt, t["exit"], c="red", s=30)

plt.legend()
plt.title("Price + Trades")

# ---- EQUITY ----
plt.subplot(2, 1, 2)

if eq_time and eq_val:
    equity[eq_time] = equity[eq_time].apply(clean_time)
    equity[eq_time] = pd.to_datetime(equity[eq_time], errors="coerce")
    equity = equity.dropna(subset=[eq_time])
    plt.plot(equity[eq_time], equity[eq_val], label="Strategy")

if bh_time and bh_val:
    bh[bh_time] = bh[bh_time].apply(clean_time)
    bh[bh_time] = pd.to_datetime(bh[bh_time], errors="coerce")
    bh = bh.dropna(subset=[bh_time])
    plt.plot(bh[bh_time], bh[bh_val], label="Buy & Hold", linestyle="--")

plt.legend()
plt.title("Equity Curve")

plt.tight_layout()
plt.show()
