from __future__ import annotations

import math
from datetime import datetime
from typing import Any
from uuid import uuid4

from .artifacts import ArtifactStore


def _eligible_supervised_rows(rows, label_cutoff: datetime):
    eligible = []
    censored = 0
    for row in rows:
        if row.label is None or row.label_observed_at is None or row.label_observed_at > label_cutoff:
            censored += 1
            continue
        if row.feature_available_at > row.prediction_cutoff:
            raise ValueError("future-feature leakage detected")
        eligible.append(row)
    eligible.sort(key=lambda row: row.prediction_cutoff)
    if len(eligible) < 40:
        raise ValueError("insufficient_data: at least 40 mature labelled rows are required")
    return eligible, censored


def _four_way_time_split(rows):
    n = len(rows)
    train_end = max(1, int(n * 0.50))
    tune_end = max(train_end + 1, int(n * 0.70))
    calibration_end = max(tune_end + 1, int(n * 0.85))
    train = rows[:train_end]
    tune = rows[train_end:tune_end]
    calibration = rows[tune_end:calibration_end]
    test = rows[calibration_end:]
    if min(len(train), len(tune), len(calibration), len(test)) < 2:
        raise ValueError("insufficient_data: time split leaves an undersized partition")
    return train, tune, calibration, test


def _frame(rows, feature_names, categorical_features):
    import pandas as pd

    records = [{name: row.features.get(name) for name in feature_names} for row in rows]
    frame = pd.DataFrame(records, columns=feature_names)
    categorical = set(categorical_features)
    for name in feature_names:
        if name in categorical:
            frame[name] = frame[name].fillna("__missing__").astype(str)
        else:
            frame[name] = pd.to_numeric(frame[name], errors="coerce")
    return frame


def _feature_names(rows):
    names = sorted({str(key) for row in rows for key in row.features.keys()})
    if not names:
        raise ValueError("no features supplied")
    if len(names) > 500:
        raise ValueError("feature schema exceeds 500 columns")
    return names


def _binary_labels(rows):
    values = [int(row.label) for row in rows]
    if not set(values).issubset({0, 1}):
        raise ValueError("classification labels must be 0 or 1")
    return values


def train_classification(request) -> dict[str, Any]:
    from catboost import CatBoostClassifier
    from sklearn.calibration import CalibratedClassifierCV
    from sklearn.metrics import average_precision_score, brier_score_loss, log_loss, precision_score, recall_score

    eligible, censored = _eligible_supervised_rows(request.rows, request.label_cutoff)
    train, tune, calibration, test = _four_way_time_split(eligible)
    for partition_name, partition in [("train", train), ("tune", tune), ("calibration", calibration), ("test", test)]:
        if len(set(_binary_labels(partition))) < 2:
            raise ValueError(f"insufficient_classes: {partition_name} partition must contain both classes")

    names = _feature_names(eligible)
    categorical = [name for name in request.categorical_features if name in names]
    x_train = _frame(train, names, categorical)
    x_tune = _frame(tune, names, categorical)
    x_cal = _frame(calibration, names, categorical)
    x_test = _frame(test, names, categorical)
    y_train = _binary_labels(train)
    y_tune = _binary_labels(tune)
    y_cal = _binary_labels(calibration)
    y_test = _binary_labels(test)

    model = CatBoostClassifier(
        iterations=500,
        depth=6,
        learning_rate=0.05,
        loss_function="Logloss",
        eval_metric="AUC",
        random_seed=request.random_seed,
        verbose=False,
        allow_writing_files=False,
    )
    model.fit(
        x_train,
        y_train,
        cat_features=categorical,
        eval_set=(x_tune, y_tune),
        early_stopping_rounds=50,
        verbose=False,
    )

    warnings = []
    method = request.calibration_method
    positives = sum(y_cal)
    negatives = len(y_cal) - positives
    if method == "isotonic" and (len(y_cal) < 100 or min(positives, negatives) < 20):
        method = "sigmoid"
        warnings.append("Isotonic calibration was replaced with sigmoid because the calibration partition is too small.")

    try:
        from sklearn.frozen import FrozenEstimator

        calibrator = CalibratedClassifierCV(FrozenEstimator(model), method=method)
    except ImportError:
        calibrator = CalibratedClassifierCV(model, method=method, cv="prefit")
    calibrator.fit(x_cal, y_cal)

    probability = calibrator.predict_proba(x_test)[:, 1]
    predicted = (probability >= 0.5).astype(int)
    metrics = {
        "precision": float(precision_score(y_test, predicted, zero_division=0)),
        "recall": float(recall_score(y_test, predicted, zero_division=0)),
        "prAuc": float(average_precision_score(y_test, probability)),
        "logLoss": float(log_loss(y_test, probability, labels=[0, 1])),
        "brier": float(brier_score_loss(y_test, probability)),
        "testRows": len(y_test),
        "positiveRate": float(sum(y_test) / len(y_test)),
    }

    artifact_id = request.run_id or f"{request.task}_{uuid4().hex}"
    artifact = ArtifactStore().save_joblib(
        artifact_id,
        {
            "task": request.task,
            "model": model,
            "calibrator": calibrator,
            "features": names,
            "categoricalFeatures": categorical,
            "calibrationMethod": method,
        },
        {
            "task": request.task,
            "kind": "catboost_classifier_calibrated",
            "target": request.task,
            "trainingRows": len(train),
            "tuningRows": len(tune),
            "calibrationRows": len(calibration),
            "testRows": len(test),
            "labelCutoff": request.label_cutoff.isoformat(),
            "randomSeed": request.random_seed,
        },
    )
    return {
        "task": request.task,
        "status": "evaluated_not_promoted",
        "artifact": artifact,
        "metrics": metrics,
        "calibrationMethod": method,
        "censoredRows": censored,
        "warnings": warnings,
        "promotion": {"approved": False, "reason": "Promotion thresholds and tenant approval must be evaluated outside training."},
    }


def train_regression(request) -> dict[str, Any]:
    import numpy as np
    from catboost import CatBoostRegressor
    from sklearn.metrics import mean_absolute_error, mean_squared_error

    eligible, censored = _eligible_supervised_rows(request.rows, request.label_cutoff)
    train, tune, _, test = _four_way_time_split(eligible)
    names = _feature_names(eligible)
    categorical = [name for name in request.categorical_features if name in names]
    x_train = _frame(train, names, categorical)
    x_tune = _frame(tune, names, categorical)
    x_test = _frame(test, names, categorical)
    y_train = [float(row.label) for row in train]
    y_tune = [float(row.label) for row in tune]
    y_test = np.asarray([float(row.label) for row in test], dtype=float)

    model = CatBoostRegressor(
        iterations=700,
        depth=6,
        learning_rate=0.04,
        loss_function="MAE",
        random_seed=request.random_seed,
        verbose=False,
        allow_writing_files=False,
    )
    model.fit(
        x_train,
        y_train,
        cat_features=categorical,
        eval_set=(x_tune, y_tune),
        early_stopping_rounds=60,
        verbose=False,
    )
    prediction = np.asarray(model.predict(x_test), dtype=float)
    residual = prediction - y_test
    metrics = {
        "mae": float(mean_absolute_error(y_test, prediction)),
        "rmse": float(math.sqrt(mean_squared_error(y_test, prediction))),
        "bias": float(residual.mean()),
        "testRows": int(len(y_test)),
    }
    artifact_id = request.run_id or f"{request.task}_{request.horizon}_{uuid4().hex}"
    artifact = ArtifactStore().save_joblib(
        artifact_id,
        {"task": request.task, "horizon": request.horizon, "model": model, "features": names, "categoricalFeatures": categorical},
        {
            "task": request.task,
            "kind": "catboost_regressor",
            "target": "net_revenue",
            "horizon": request.horizon,
            "trainingRows": len(train),
            "tuningRows": len(tune),
            "testRows": len(test),
            "labelCutoff": request.label_cutoff.isoformat(),
            "randomSeed": request.random_seed,
        },
    )
    return {
        "task": request.task,
        "horizon": request.horizon,
        "status": "evaluated_not_promoted",
        "artifact": artifact,
        "metrics": metrics,
        "censoredRows": censored,
        "warnings": ["Point predictions do not carry a fabricated confidence percentage."],
        "promotion": {"approved": False, "reason": "Tenant-specific thresholds and interval validation are still required."},
    }


def seasonal_naive_forecast(request) -> dict[str, Any]:
    history = sorted(request.history, key=lambda point: point.timestamp)
    if any(point.value is None for point in history):
        raise ValueError("history contains unknown observations; unknown values must not be treated as zero")
    timestamps = [point.timestamp for point in history]
    if len(timestamps) >= 3:
        deltas = [(timestamps[i] - timestamps[i - 1]).total_seconds() for i in range(1, len(timestamps))]
        reference = deltas[0]
        if any(abs(delta - reference) > max(1.0, abs(reference) * 0.01) for delta in deltas[1:]):
            raise ValueError("history timestamps are not regular at the declared frequency")
    values = [float(point.value) for point in history]
    season = request.season_length
    if len(values) < season:
        raise ValueError("insufficient_data: history is shorter than season_length")
    forecast = [values[len(values) - season + (step % season)] for step in range(request.horizon)]

    backtests = []
    max_origins = min(5, max(0, len(values) - season - 1))
    for offset in range(max_origins, 0, -1):
        origin = len(values) - offset
        if origin < season:
            continue
        predicted = values[origin - season]
        actual = values[origin]
        backtests.append({"originIndex": origin, "actual": actual, "prediction": predicted, "absoluteError": abs(actual - predicted)})
    mae = sum(item["absoluteError"] for item in backtests) / len(backtests) if backtests else None

    return {
        "task": "forecast_baseline",
        "seriesId": request.series_id,
        "model": "seasonal_naive",
        "status": "baseline",
        "horizon": request.horizon,
        "frequency": request.frequency,
        "timezone": request.timezone,
        "pointForecast": forecast,
        "backtest": {"origins": backtests, "mae": mae},
        "intervals": None,
        "warning": "Seasonal-naive is a deterministic baseline; it is not a causal effect estimate.",
    }


def anomaly_detection(request) -> dict[str, Any]:
    import pandas as pd
    from sklearn.ensemble import IsolationForest

    names = sorted({key for row in request.rows for key in row.features})
    frame = pd.DataFrame([{name: row.features.get(name, 0.0) for name in names} for row in request.rows]).fillna(0.0)
    model = IsolationForest(contamination=request.contamination, random_state=request.random_seed)
    predicted = model.fit_predict(frame)
    scores = model.decision_function(frame)
    items = [
        {
            "entityId": row.entity_id,
            "anomaly": bool(predicted[index] == -1),
            "score": float(scores[index]),
        }
        for index, row in enumerate(request.rows)
    ]
    return {
        "task": "anomaly_detection",
        "status": "evaluated_not_promoted",
        "items": items,
        "warning": "IsolationForest anomaly scores are investigation signals, not fraud probabilities.",
    }


def behavioral_segments(request) -> dict[str, Any]:
    import pandas as pd
    from sklearn.cluster import HDBSCAN

    names = sorted({key for row in request.rows for key in row.features})
    frame = pd.DataFrame([{name: row.features.get(name, 0.0) for name in names} for row in request.rows]).fillna(0.0)
    kwargs = {"min_cluster_size": request.min_cluster_size}
    if request.min_samples is not None:
        kwargs["min_samples"] = request.min_samples
    model = HDBSCAN(**kwargs)
    labels = model.fit_predict(frame)
    items = [{"entityId": row.entity_id, "cluster": int(labels[index]), "noise": bool(labels[index] == -1)} for index, row in enumerate(request.rows)]
    return {
        "task": "behavioral_segments",
        "status": "evaluated_not_promoted",
        "items": items,
        "clusters": len({int(value) for value in labels if int(value) >= 0}),
        "warning": "Cluster IDs are version-specific and must not be assumed stable after refitting.",
    }


def train_ranker(request) -> dict[str, Any]:
    import numpy as np
    import pandas as pd
    from lightgbm import LGBMRanker
    from sklearn.metrics import ndcg_score

    exposed_groups = []
    for group in request.groups:
        candidates = [candidate for candidate in group.candidates if candidate.exposed]
        if len(candidates) >= 2:
            exposed_groups.append((group.group_id, candidates))
    if len(exposed_groups) < 3:
        raise ValueError("insufficient_data: ranking requires at least 3 groups with 2 exposed candidates each")

    names = sorted({key for _, candidates in exposed_groups for candidate in candidates for key in candidate.features})
    rows = []
    labels = []
    group_sizes = []
    for _, candidates in exposed_groups:
        group_sizes.append(len(candidates))
        for candidate in candidates:
            rows.append({name: candidate.features.get(name, 0.0) for name in names})
            labels.append(float(candidate.relevance))
    frame = pd.DataFrame(rows).fillna(0.0)
    model = LGBMRanker(objective="lambdarank", random_state=request.random_seed, n_estimators=150)
    model.fit(frame, labels, group=group_sizes)
    predictions = model.predict(frame)

    ndcgs = []
    offset = 0
    for size in group_sizes:
        truth = np.asarray(labels[offset:offset + size], dtype=float).reshape(1, -1)
        score = np.asarray(predictions[offset:offset + size], dtype=float).reshape(1, -1)
        ndcgs.append(float(ndcg_score(truth, score)))
        offset += size

    artifact_id = request.run_id or f"offer_ranking_{uuid4().hex}"
    artifact = ArtifactStore().save_joblib(
        artifact_id,
        {"task": "offer_ranking", "model": model, "features": names},
        {"task": "offer_ranking", "kind": "lightgbm_ranker", "groups": len(group_sizes), "randomSeed": request.random_seed},
    )
    return {
        "task": "offer_ranking",
        "status": "evaluated_not_promoted",
        "artifact": artifact,
        "metrics": {"meanNdcg": float(sum(ndcgs) / len(ndcgs)), "groups": len(ndcgs)},
        "warning": "Only exposed candidates were treated as labelled observations; offline ranking quality does not prove incremental lift.",
    }


def dependency_capabilities() -> list[dict[str, Any]]:
    import importlib.util

    checks = [
        ("lead_qualification", "catboost", "CatBoostClassifier"),
        ("paid_conversion", "catboost", "CatBoostClassifier"),
        ("customer_churn", "catboost", "CatBoostClassifier"),
        ("future_customer_value", "catboost", "CatBoostRegressor"),
        ("forecast_primary", "chronos", "amazon/chronos-2"),
        ("forecast_challenger", "catboost", "CatBoostRegressor"),
        ("forecast_baseline", None, "seasonal_naive"),
        ("marketing_mix", "meridian", "meridian.model.model.Meridian"),
        ("incrementality", "econml", "econml.dml.CausalForestDML"),
        ("anomaly_detection", "sklearn", "IsolationForest"),
        ("behavioral_segments", "sklearn", "HDBSCAN"),
        ("offer_ranking", "lightgbm", "LGBMRanker"),
        ("probability_calibration", "sklearn", "CalibratedClassifierCV"),
    ]
    result = []
    for task, module, implementation in checks:
        available = True if module is None else importlib.util.find_spec(module) is not None
        result.append(
            {
                "task": task,
                "implementation": implementation,
                "dependencyAvailable": available,
                "trained": False,
                "evaluated": False,
                "approved": False,
                "deployed": False,
                "reason": None if available else f"Optional dependency {module} is not installed in this service profile.",
            }
        )
    return result
