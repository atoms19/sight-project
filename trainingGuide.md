# NILM Model Training Guide

This guide provides recommendations for datasets, data preparation, and hyperparameters for training the Non-Intrusive Load Monitoring (NILM) Random Forest classifier in the Sight project.

## 1. Recommended Datasets

To train a robust NILM model, you need high-frequency or at least 1Hz (1 sample per second) sub-metered power data. Here are the most widely used open-source datasets suitable for this project:

### A. REDD (Reference Energy Disaggregation Data Set)
* **Description:** One of the original and most popular datasets for NILM. Contains high-frequency (15kHz) and low-frequency (1Hz) power consumption data from several homes in the US.
* **Suitability:** Excellent for your 1-second window requirements.
* **Link:** [REDD Dataset](http://redd.csail.mit.edu/)

### B. UK-DALE (UK Domestic Appliance-Level Electricity)
* **Description:** Contains power demand data from 5 UK homes. Aggregate data is sampled at 16kHz, and individual appliance data at 1/6 Hz (every 6 seconds).
* **Suitability:** Good, though you may need to upsample or interpolate the 6-second appliance data to fit your 1-second extraction window, or adjust your extraction window size.
* **Link:** [UK-DALE Dataset](https://jack-kelly.com/data/)

### C. REFIT (Electrical Load Measurements)
* **Description:** Contains data from 20 homes in the UK over a period of 2 years, sampled at 8-second intervals.
* **Suitability:** Better for long-term modeling. Similar to UK-DALE, it requires interpolation or adjusting your feature window to match the 8-second sampling rate.
* **Link:** [REFIT Dataset](https://pure.strath.ac.uk/en/datasets/refit-electrical-load-measurements-cleaned)

### D. ECO (Electricity Consumption and Occupancy)
* **Description:** Comprehensive dataset from 6 Swiss households over 8 months. Includes 1Hz aggregate and appliance-level data.
* **Suitability:** Very strong fit for your 1-second sampling rate requirement.

## 2. Data Preparation & Feature Engineering

Your current pipeline expects a specific set of features derived from 1-second windows of power readings. 

### Target Feature Vector (`ml-pipeline/nilm/features.py`):
1. `mean` (Mean power in window)
2. `std` (Standard deviation)
3. `min` (Minimum power)
4. `max` (Maximum power)
5. `range` (Max - Min)
6. `spike_count` (Samples > 2 standard deviations from mean)
7. `transition_count` (Absolute step changes > 10% of mean)
8. `hour` (Hour of the day, 0-23)
9. `day_of_week` (Day of the week, 0-6)

### Preprocessing Steps:
1. **Windowing:** Slice the raw dataset into 1-second chunks (or 10-second chunks as per `agent.py`'s `NILM_WINDOW = 10` setting, though `features.py` description mentions 1-second. You should align the dataset window with the agent's cache window).
2. **Feature Extraction:** Run the raw data chunks through your `extract_features` function to generate the feature vectors.
3. **Label Mapping:** Map the dataset's appliance labels to your `APPLIANCE_LABELS`:
   `["idle", "lighting", "hvac", "refrigerator", "washing_machine", "ev_charger", "unknown"]`
4. **Dataframe Creation:** Combine the features and labels into a Pandas DataFrame with columns matching `FEATURE_COLUMNS` + your label column.

## 3. Recommended Hyperparameters

Your model is currently configured in `ml-pipeline/nilm/classifier.py` as a `RandomForestClassifier`.

### Current Parameters:
* `n_estimators=200`: Good balance between performance and training time.
* `max_depth=12`: Prevents overfitting, but might need tuning if accuracy is low.
* `min_samples_leaf=2`: Helps smooth the model and reduce overfitting.
* `class_weight="balanced"`: **Crucial** setting, as appliance classes are heavily imbalanced (e.g., 'idle' happens much more often than 'washing_machine').

### Tuning Recommendations (Grid Search):
If you want to optimize the model further, consider using `GridSearchCV` on these parameter ranges:
* **`n_estimators`**: `[100, 200, 300]` (Higher is generally better but slower).
* **`max_depth`**: `[10, 15, 20, None]` (Increase if the model is underfitting).
* **`min_samples_split`**: `[2, 5, 10]` (Number of samples required to split an internal node).
* **`min_samples_leaf`**: `[1, 2, 4]`

## 4. How to Train

Once your data is prepared in a Pandas DataFrame (e.g., `df`), you can train the model using your existing pipeline:

```python
import pandas as pd
from nilm.classifier import train

# 1. Load your prepared dataset
df = pd.read_csv("prepared_nilm_data.csv")

# 2. Train the model (saves to /models/nilm_rf.pkl by default)
# Ensure the DataFrame has the columns defined in FEATURE_COLUMNS + "appliance"
pipeline = train(df, label_col="appliance", test_size=0.2)
```

**Note:** Ensure the `MODEL_PATH` environment variable is set to an accessible directory before training, or it will default to `/models/nilm_rf.pkl` which might require root access depending on your system.
