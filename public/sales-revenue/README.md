# Sales Revenue Prediction using Linear Regression

Predicts a retail store's **monthly revenue** from 15 marketing, store, and customer features, and shows which factors drive it.

## Project structure

```
Sales_Revenue_Project/
├── sales_revenue.ipynb        # Full workflow: EDA, training, evaluation, plots, model export
├── requirements.txt           # Python dependencies
├── sales_revenue_data.csv     # Dataset (5,000 rows, 15 features + target)
├── trained_model.joblib       # Saved model bundle: {"model": LinearRegression, "features": [...]}
├── presentation.pptx          # 7-slide summary deck
└── README.md
```

## Dataset

`sales_revenue_data.csv` has 5,000 monthly store records and no missing values.
Target: `monthly_revenue`. Features include ad spend (TV, digital, radio), `store_footfall`, `discount_percentage`, `num_sales_staff`, `competitor_count_nearby`, `avg_product_price`, `store_size_sqft`, `customer_satisfaction_score`, `social_media_engagement_score`, `marketing_email_count`, and the flags `is_holiday_season_flag`, `loyalty_program_flag`, `online_orders_flag`.

## Method

80/20 train-test split (`random_state=42`), scikit-learn `LinearRegression`, evaluated on the held-out test set.

## Results (test set)

| Metric | Value |
|---|---|
| R² | 0.930 |
| RMSE | 14,876 |
| MAE | 11,924 |

Key effects (holding other features constant): holiday season +19,949, loyalty program +8,142, online orders +5,082, +1 satisfaction point +3,032, each nearby competitor -1,570. Each extra rupee of digital / TV / radio ad spend adds about 1.31 / 0.88 / 0.68 in revenue.

## How to run

```bash
pip install -r requirements.txt
jupyter notebook sales_revenue.ipynb
```

## Use the saved model

```python
import joblib, pandas as pd

bundle = joblib.load("trained_model.joblib")
df = pd.read_csv("sales_revenue_data.csv")
preds = bundle["model"].predict(df[bundle["features"]].head())
print(preds)
```

## Next steps

Check multicollinearity (VIF), try Ridge / Lasso, and compare Random Forest and XGBoost.
