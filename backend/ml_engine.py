"""
DASO ML Engine
==============
Synthetic Data Generation & Service Duration Prediction Model

This module generates synthetic banking service data and trains a 
RandomForestRegressor model to predict transaction durations.
"""

import os
import random
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import mean_absolute_error, r2_score
import joblib

# Seed for reproducibility
RANDOM_SEED = 42
random.seed(RANDOM_SEED)
np.random.seed(RANDOM_SEED)

# Service types and their base durations (in minutes)
SERVICE_TYPES = {
    "Cash_Deposit": {"base": 5, "variance": 3},
    "Cash_Withdrawal": {"base": 4, "variance": 2},
    "Loan_Inquiry": {"base": 15, "variance": 5},
    "KYC_Update": {"base": 12, "variance": 4},
    "Forex": {"base": 20, "variance": 8},
    "Lost_Card": {"base": 10, "variance": 4},
    "Account_Opening": {"base": 25, "variance": 10},
    "Fixed_Deposit": {"base": 18, "variance": 6},
}


def generate_synthetic_data(num_samples: int = 1000, output_path: str = None) -> pd.DataFrame:
    """
    Generate synthetic banking service data for ML training.
    
    Args:
        num_samples: Number of data points to generate
        output_path: Optional path to save CSV file
        
    Returns:
        DataFrame with synthetic data
    """
    data = []
    
    for _ in range(num_samples):
        # Customer demographics
        age = random.randint(18, 90)
        is_disabled = random.choices([0, 1], weights=[0.92, 0.08])[0]
        
        # Service selection
        service_type = random.choice(list(SERVICE_TYPES.keys()))
        service_config = SERVICE_TYPES[service_type]
        
        # Staff and timing factors
        staff_efficiency_score = round(random.uniform(0.8, 1.2), 2)
        time_of_day = random.randint(9, 16)  # Banking hours: 9 AM to 4 PM
        
        # Calculate realistic duration based on multiple factors
        base_duration = service_config["base"]
        variance = service_config["variance"]
        
        # Age factor: older customers may take slightly longer
        age_factor = 1.0 + max(0, (age - 60) * 0.005)
        
        # Disability factor: may require additional assistance
        disability_factor = 1.15 if is_disabled else 1.0
        
        # Time of day factor: rush hours (10-11 AM, 2-3 PM) may be slower
        rush_hour_factor = 1.1 if time_of_day in [10, 11, 14, 15] else 1.0
        
        # Calculate actual duration with noise
        actual_duration = (
            base_duration 
            * age_factor 
            * disability_factor 
            * rush_hour_factor 
            / staff_efficiency_score  # More efficient staff = shorter duration
            + random.gauss(0, variance / 2)
        )
        
        # Ensure minimum duration of 2 minutes
        actual_duration = max(2, round(actual_duration, 1))
        
        data.append({
            "age": age,
            "is_disabled": is_disabled,
            "service_type": service_type,
            "staff_efficiency_score": staff_efficiency_score,
            "time_of_day": time_of_day,
            "actual_duration_min": actual_duration
        })
    
    df = pd.DataFrame(data)
    
    if output_path:
        df.to_csv(output_path, index=False)
        print(f"✅ Generated {num_samples} synthetic records → {output_path}")
    
    return df


def train_duration_model(df: pd.DataFrame, model_path: str = None) -> tuple:
    """
    Train a RandomForest model to predict service duration.
    
    Args:
        df: DataFrame with training data
        model_path: Path to save the trained model
        
    Returns:
        Tuple of (model, label_encoder, metrics_dict)
    """
    # Encode service types
    le = LabelEncoder()
    df_encoded = df.copy()
    df_encoded["service_type_encoded"] = le.fit_transform(df["service_type"])
    
    # Features and target
    feature_cols = ["age", "is_disabled", "service_type_encoded", 
                    "staff_efficiency_score", "time_of_day"]
    X = df_encoded[feature_cols]
    y = df_encoded["actual_duration_min"]
    
    # Train/test split
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=RANDOM_SEED
    )
    
    # Train RandomForest model
    model = RandomForestRegressor(
        n_estimators=100,
        max_depth=10,
        min_samples_split=5,
        min_samples_leaf=2,
        random_state=RANDOM_SEED,
        n_jobs=-1
    )
    model.fit(X_train, y_train)
    
    # Evaluate
    y_pred = model.predict(X_test)
    metrics = {
        "mae": round(mean_absolute_error(y_test, y_pred), 2),
        "r2_score": round(r2_score(y_test, y_pred), 3),
        "feature_importance": dict(zip(feature_cols, 
                                       [round(x, 3) for x in model.feature_importances_]))
    }
    
    # Save model and encoder
    if model_path:
        model_data = {
            "model": model,
            "label_encoder": le,
            "feature_cols": feature_cols
        }
        joblib.dump(model_data, model_path)
        print(f"✅ Model saved → {model_path}")
        print(f"   MAE: {metrics['mae']} mins | R²: {metrics['r2_score']}")
    
    return model, le, metrics


def predict_duration(
    age: int,
    is_disabled: int,
    service_type: str,
    staff_efficiency_score: float = 1.0,
    time_of_day: int = 12,
    model_path: str = "duration_predictor.pkl"
) -> float:
    """
    Predict service duration for a customer.
    
    Args:
        age: Customer age (18-90)
        is_disabled: 0 or 1
        service_type: One of the SERVICE_TYPES keys
        staff_efficiency_score: Staff efficiency (0.8-1.2)
        time_of_day: Hour of day (9-16)
        model_path: Path to trained model
        
    Returns:
        Predicted duration in minutes
    """
    model_data = joblib.load(model_path)
    model = model_data["model"]
    le = model_data["label_encoder"]
    
    # Encode service type
    try:
        service_encoded = le.transform([service_type])[0]
    except ValueError:
        # Unknown service type - use default
        service_encoded = 0
    
    # Create feature array
    features = np.array([[
        age, is_disabled, service_encoded,
        staff_efficiency_score, time_of_day
    ]])
    
    prediction = model.predict(features)[0]
    return round(prediction, 1)


def calculate_priority(
    age: int,
    is_disabled: bool,
    service_type: str,
    wait_time_min: float
) -> float:
    """
    Calculate customer priority score for queue positioning.
    
    Priority Formula:
    - Lost_Card: +50 (urgent cases)
    - Disabled: +30 (accessibility priority)
    - Age > 70: +20 (senior citizen priority)
    - Wait time decay: +0.5 per minute waited
    
    Args:
        age: Customer age
        is_disabled: Whether customer has disability
        service_type: Type of service requested
        wait_time_min: Time already spent waiting
        
    Returns:
        Priority score (higher = more urgent)
    """
    base_score = 0.0
    
    # Urgency-based scoring
    if service_type == "Lost_Card":
        base_score += 50
    
    # Accessibility priority
    if is_disabled:
        base_score += 30
    
    # Senior citizen priority
    if age > 70:
        base_score += 20
    elif age > 60:
        base_score += 10  # Moderate priority for 60-70
    
    # Time decay factor: priority increases as they wait
    priority = base_score + (wait_time_min * 0.5)
    
    return round(priority, 2)


def get_service_types() -> list:
    """Return list of available service types."""
    return list(SERVICE_TYPES.keys())


# ============================================================
# Main execution: Generate data and train model
# ============================================================

if __name__ == "__main__":
    print("\n" + "="*60)
    print("🏦 DASO ML Engine - Synthetic Data & Model Training")
    print("="*60 + "\n")
    
    # Get script directory for file paths
    script_dir = os.path.dirname(os.path.abspath(__file__))
    data_path = os.path.join(script_dir, "synthetic_bank_data.csv")
    model_path = os.path.join(script_dir, "duration_predictor.pkl")
    
    # Step 1: Generate synthetic data
    print("📊 Step 1: Generating synthetic data...")
    df = generate_synthetic_data(num_samples=1000, output_path=data_path)
    print(f"   Sample distribution:")
    print(df["service_type"].value_counts().to_string().replace("\n", "\n   "))
    print()
    
    # Step 2: Train model
    print("🤖 Step 2: Training duration prediction model...")
    model, le, metrics = train_duration_model(df, model_path=model_path)
    print(f"\n   Feature Importance:")
    for feat, imp in sorted(metrics["feature_importance"].items(), 
                           key=lambda x: x[1], reverse=True):
        bar = "█" * int(imp * 40)
        print(f"   {feat:25} {bar} {imp:.3f}")
    print()
    
    # Step 3: Test predictions
    print("🧪 Step 3: Testing predictions...")
    test_cases = [
        {"age": 35, "is_disabled": 0, "service_type": "Cash_Deposit", 
         "staff_efficiency_score": 1.0, "time_of_day": 10},
        {"age": 72, "is_disabled": 1, "service_type": "Loan_Inquiry",
         "staff_efficiency_score": 0.9, "time_of_day": 14},
        {"age": 45, "is_disabled": 0, "service_type": "Forex",
         "staff_efficiency_score": 1.1, "time_of_day": 11},
    ]
    
    for case in test_cases:
        pred = predict_duration(**case, model_path=model_path)
        priority = calculate_priority(
            case["age"], 
            bool(case["is_disabled"]), 
            case["service_type"], 
            wait_time_min=5
        )
        print(f"   {case['service_type']:15} | Age: {case['age']:2} | "
              f"Predicted: {pred:5.1f} min | Priority: {priority:5.1f}")
    
    print("\n" + "="*60)
    print("✅ ML Engine initialization complete!")
    print("="*60 + "\n")
