import os
import sys
import pandas as pd
import numpy as np
from pathlib import Path

# Add project root to sys path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Set the path to save the model locally in ml-pipeline so we don't need root
os.environ["MODEL_PATH"] = os.path.join(os.path.dirname(os.path.abspath(__file__)), "nilm_rf.pkl")

from nilm.features import extract_features
from nilm.classifier import train, APPLIANCE_LABELS

def generate_synthetic_signatures(samples_per_class=1000):
    """
    Generates realistic 1Hz power signatures for a 10-second window.
    These synthetic signatures allow us to train the NILM model correctly,
    since standard Kaggle datasets use 10-minute/hourly intervals, which 
    cannot capture the 1-second spike and transition counts our model requires.
    """
    records = []
    np.random.seed(42)
    
    for label in APPLIANCE_LABELS:
        for _ in range(samples_per_class):
            # Simulate 10-second window of 1Hz data
            if label == "idle":
                # Very low stable power (e.g., standby devices)
                arr = np.random.normal(5, 0.5, 10)
            elif label == "lighting":
                # Stable medium power
                arr = np.random.normal(60, 2, 10)
            elif label == "hvac":
                # High power, some minor fluctuations
                arr = np.random.normal(1500, 30, 10)
            elif label == "refrigerator":
                # 150W stable, but often has massive compressor spikes at start
                arr = np.random.normal(150, 5, 10)
                if np.random.rand() > 0.8: # 20% chance of catching a spike in window
                    arr[0] = arr[0] * 6 
            elif label == "washing_machine":
                # High variance, lots of internal component switching
                arr = np.random.normal(500, 150, 10)
            elif label == "ev_charger":
                # Very high, very stable
                arr = np.random.normal(3000, 10, 10)
            else: # "unknown"
                # Random noise
                arr = np.random.uniform(0, 4000, 10)
            
            # Clip negative values
            arr = np.clip(arr, 0, None)
            
            # Extract features expected by the pipeline
            series = pd.Series(arr)
            feat_dict = extract_features(series)
            feat_dict["appliance"] = label
            records.append(feat_dict)
            
    return pd.DataFrame(records)

if __name__ == "__main__":
    print("Generating synthetic 1Hz high-frequency power data...")
    df = generate_synthetic_signatures(samples_per_class=1500)
    print(f"Generated {len(df)} samples across {len(APPLIANCE_LABELS)} classes.")
    
    print("Training the NILM Random Forest Classifier...")
    model_pipeline = train(df, label_col="appliance")
    
    print(f"Success! Model trained and saved to {os.environ['MODEL_PATH']}")
