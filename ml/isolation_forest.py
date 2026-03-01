#!/usr/bin/env python3
# Isolation Forest — baseline anomaly detection for loan records.
# Fits an unsupervised Isolation Forest on numeric features extracted from
# loan records. Anomaly scores are normalized to 0-100 and fed into the
# composite risk scorer as the ML component (weight: 0.35 default).
# This is the "fast baseline" — complements the GAT model in Sprint 5.

from __future__ import annotations

import logging
from typing import Any

import numpy as np
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler

logger = logging.getLogger(__name__)

# Feature extraction configuration
NUMERIC_FEATURES = [
    "employee_count",
    "business_age_months",
    "loan_amount",
]


def extract_features(records: list[dict]) -> np.ndarray:
    """Extract numeric features from loan records into a feature matrix.

    Returns an (n_records, n_features) numpy array.
    """
    features = []
    for r in records:
        row = [float(r.get(f, 0)) for f in NUMERIC_FEATURES]
        features.append(row)
    return np.array(features, dtype=np.float64)


class FraudIsolationForest:
    """Isolation Forest anomaly detector for loan fraud scoring."""

    def __init__(
        self,
        contamination: float = 0.05,
        n_estimators: int = 200,
        random_state: int = 42,
    ):
        self.contamination = contamination
        self.n_estimators = n_estimators
        self.random_state = random_state
        self.model = IsolationForest(
            contamination=contamination,
            n_estimators=n_estimators,
            random_state=random_state,
            n_jobs=-1,
        )
        self.scaler = StandardScaler()
        self._is_fitted = False

    def fit(self, records: list[dict]) -> None:
        """Fit the model on a set of loan records."""
        X = extract_features(records)
        X_scaled = self.scaler.fit_transform(X)
        self.model.fit(X_scaled)
        self._is_fitted = True
        logger.info("IsolationForest fitted on %d records (%d features)", len(records), X.shape[1])

    def predict_scores(self, records: list[dict]) -> dict[str, float]:
        """Score records and return borrower_id -> anomaly score (0-100).

        Higher score = more anomalous = more likely fraud.
        """
        if not self._is_fitted:
            raise RuntimeError("Model not fitted. Call fit() first.")

        X = extract_features(records)
        X_scaled = self.scaler.transform(X)

        # decision_function: lower = more anomalous
        raw_scores = self.model.decision_function(X_scaled)

        # Normalize to 0-100 (invert so higher = more anomalous)
        min_s, max_s = raw_scores.min(), raw_scores.max()
        if max_s - min_s > 0:
            normalized = 100.0 * (1.0 - (raw_scores - min_s) / (max_s - min_s))
        else:
            normalized = np.full_like(raw_scores, 50.0)

        scores = {}
        for i, record in enumerate(records):
            bid = record.get("borrower_id", f"unknown_{i}")
            scores[bid] = float(np.clip(normalized[i], 0, 100))

        return scores

    def evaluate(self, records: list[dict]) -> dict[str, Any]:
        """Evaluate model performance against ground truth labels."""
        scores = self.predict_scores(records)
        labels = {r["borrower_id"]: r.get("fraud_label", False) for r in records}

        # Simple threshold-based evaluation at score >= 50
        threshold = 50.0
        tp = fp = tn = fn = 0
        for bid, score in scores.items():
            predicted_fraud = score >= threshold
            actual_fraud = labels.get(bid, False)
            if predicted_fraud and actual_fraud:
                tp += 1
            elif predicted_fraud and not actual_fraud:
                fp += 1
            elif not predicted_fraud and actual_fraud:
                fn += 1
            else:
                tn += 1

        precision = tp / (tp + fp) if (tp + fp) > 0 else 0.0
        recall = tp / (tp + fn) if (tp + fn) > 0 else 0.0
        f1 = 2 * precision * recall / (precision + recall) if (precision + recall) > 0 else 0.0

        return {
            "threshold": threshold,
            "true_positives": tp,
            "false_positives": fp,
            "true_negatives": tn,
            "false_negatives": fn,
            "precision": round(precision, 4),
            "recall": round(recall, 4),
            "f1_score": round(f1, 4),
            "total_records": len(records),
            "total_fraud": sum(1 for v in labels.values() if v),
        }
