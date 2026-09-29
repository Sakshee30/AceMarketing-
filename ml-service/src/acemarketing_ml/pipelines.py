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
    names = sorted({str(key) for row in rows for key in row.features})
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
    predicted = (probability >= request.decision_threshold).astype(int)
    ranked = sorted(zip(probability.tolist(), y_test, strict=True), key=lambda item: item[0], reverse=True)
    capacity_n = max(1, min(len(ranked), math.ceil(len(ranked) * request.operating_capacity_fraction)))
    top_positives = sum(label for _, label in ranked[:capacity_n])
    overall_rate = float(sum(y_test) / len(y_test))
    top_rate = float(top_positives / capacity_n)
    lift_at_capacity = float(top_rate / overall_rate) if overall_rate > 0 else None
    reliability = []
    for lower in [0.0, 0.2, 0.4, 0.6, 0.8]:
        upper = lower + 0.2
        indexes = [index for index, value in enumerate(probability) if lower <= float(value) < upper or (upper >= 1.0 and float(value) == 1.0)]
        if not indexes:
            continue
        reliability.append({
            "lower": lower,
            "upper": min(1.0, upper),
            "count": len(indexes),
            "meanProbability": float(sum(float(probability[index]) for index in indexes) / len(indexes)),
            "observedRate": float(sum(y_test[index] for index in indexes) / len(indexes)),
        })
    metrics = {
        "precision": float(precision_score(y_test, predicted, zero_division=0)),
        "recall": float(recall_score(y_test, predicted, zero_division=0)),
        "prAuc": float(average_precision_score(y_test, probability)),
        "logLoss": float(log_loss(y_test, probability, labels=[0, 1])),
        "brier": float(brier_score_loss(y_test, probability)),
        "testRows": len(y_test),
        "positiveRate": overall_rate,
        "decisionThreshold": request.decision_threshold,
        "operatingCapacityFraction": request.operating_capacity_fraction,
        "liftAtCapacity": lift_at_capacity,
        "reliability": reliability,
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
            "datasetId": request.dataset_id,
            "datasetHash": request.dataset_hash,
            "featureSchemaVersion": request.feature_schema_version,
            "labelSchemaVersion": request.label_schema_version,
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
    baseline_value = float(np.mean(y_train))
    baseline_prediction = np.full_like(y_test, baseline_value, dtype=float)
    metrics = {
        "mae": float(mean_absolute_error(y_test, prediction)),
        "rmse": float(math.sqrt(mean_squared_error(y_test, prediction))),
        "bias": float(residual.mean()),
        "baselineMae": float(mean_absolute_error(y_test, baseline_prediction)),
        "baselineRmse": float(math.sqrt(mean_squared_error(y_test, baseline_prediction))),
        "baselineValue": baseline_value,
        "testRows": len(y_test),
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
            "datasetId": request.dataset_id,
            "datasetHash": request.dataset_hash,
            "featureSchemaVersion": request.feature_schema_version,
            "labelSchemaVersion": request.label_schema_version,
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

    unique_rows = []
    seen = set()
    suppressed_duplicates = 0
    for row in request.rows:
        if row.entity_id in seen:
            suppressed_duplicates += 1
            continue
        seen.add(row.entity_id)
        unique_rows.append(row)

    if len(unique_rows) < request.minimum_volume:
        return {
            "task": "anomaly_detection",
            "status": "insufficient_data",
            "items": [],
            "minimumVolume": request.minimum_volume,
            "observedVolume": len(unique_rows),
            "suppressedDuplicates": suppressed_duplicates,
            "warning": "Anomaly detection was not fitted because the minimum-volume requirement was not met.",
        }

    names = sorted({key for row in unique_rows for key in row.features})
    if not names:
        raise ValueError("anomaly detection requires at least one numeric feature")
    frame = pd.DataFrame([{name: row.features.get(name, 0.0) for name in names} for row in unique_rows]).fillna(0.0)
    model = IsolationForest(contamination=request.contamination, random_state=request.random_seed)
    predicted = model.fit_predict(frame)
    scores = model.decision_function(frame)
    items = [
        {
            "entityId": row.entity_id,
            "anomaly": bool(predicted[index] == -1),
            "score": float(scores[index]),
        }
        for index, row in enumerate(unique_rows)
    ]
    flagged = sum(1 for item in items if item["anomaly"])
    return {
        "task": "anomaly_detection",
        "status": "evaluated_not_promoted",
        "items": items,
        "threshold": {
            "decisionFunction": 0.0,
            "contamination": request.contamination,
            "flagged": flagged,
            "flaggedRate": float(flagged / len(items)) if items else 0.0,
        },
        "minimumVolume": request.minimum_volume,
        "observedVolume": len(unique_rows),
        "suppressedDuplicates": suppressed_duplicates,
        "feedbackMonitoring": {
            "falsePositiveFeedbackSupported": True,
            "promotionRequiresUsefulnessReview": True,
        },
        "warning": "IsolationForest anomaly scores are investigation signals, not fraud probabilities.",
    }


def behavioral_segments(request) -> dict[str, Any]:
    import numpy as np
    import pandas as pd
    from sklearn.cluster import HDBSCAN
    from sklearn.metrics import adjusted_rand_score

    names = sorted({key for row in request.rows for key in row.features})
    if not names:
        raise ValueError("segmentation requires at least one numeric feature")
    frame = pd.DataFrame([{name: row.features.get(name, 0.0) for name in names} for row in request.rows]).fillna(0.0)
    kwargs = {"min_cluster_size": request.min_cluster_size}
    if request.min_samples is not None:
        kwargs["min_samples"] = request.min_samples
    model = HDBSCAN(**kwargs)
    labels = model.fit_predict(frame)

    rng = np.random.default_rng(request.random_seed)
    scale = frame.std(axis=0, ddof=0).replace(0, 1.0).to_numpy(dtype=float)
    perturbation = rng.normal(0.0, request.stability_jitter_fraction, size=frame.shape) * scale
    perturbed = frame.to_numpy(dtype=float) + perturbation
    refit = HDBSCAN(**kwargs)
    perturbed_labels = refit.fit_predict(perturbed)
    stability_ari = float(adjusted_rand_score(labels, perturbed_labels))

    probabilities = getattr(model, "probabilities_", None)
    membership_strength = (
        float(np.asarray(probabilities, dtype=float)[np.asarray(labels) >= 0].mean())
        if probabilities is not None and np.any(np.asarray(labels) >= 0)
        else None
    )
    noise_count = int(sum(int(value) == -1 for value in labels))
    items = [
        {"entityId": row.entity_id, "cluster": int(labels[index]), "noise": bool(labels[index] == -1)}
        for index, row in enumerate(request.rows)
    ]
    return {
        "task": "behavioral_segments",
        "status": "evaluated_not_promoted",
        "items": items,
        "clusters": len({int(value) for value in labels if int(value) >= 0}),
        "stability": {
            "perturbationAdjustedRand": stability_ari,
            "jitterFraction": request.stability_jitter_fraction,
            "noiseCount": noise_count,
            "noiseFraction": float(noise_count / len(labels)) if len(labels) else 0.0,
            "meanMembershipStrength": membership_strength,
        },
        "warning": "Cluster IDs are version-specific and must not be assumed stable after refitting; perturbation stability is diagnostic evidence, not semantic identity across versions.",
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
            exposed_groups.append((group.group_id, group.observed_at, candidates))
    if len(exposed_groups) < 4:
        raise ValueError("insufficient_data: ranking requires at least 4 groups with 2 exposed candidates each")

    if all(observed_at is not None for _, observed_at, _ in exposed_groups):
        exposed_groups.sort(key=lambda item: item[1])
        split_method = "time_ordered_group_holdout"
    else:
        split_method = "input_order_group_holdout"

    test_groups = max(1, math.ceil(len(exposed_groups) * request.holdout_fraction))
    if len(exposed_groups) - test_groups < 3:
        test_groups = len(exposed_groups) - 3
    train_groups = exposed_groups[:-test_groups]
    holdout_groups = exposed_groups[-test_groups:]
    if not train_groups or not holdout_groups:
        raise ValueError("insufficient_data: ranking group holdout could not be created")

    names = sorted({key for _, _, candidates in exposed_groups for candidate in candidates for key in candidate.features})
    if not names:
        raise ValueError("ranking requires at least one candidate feature")

    def build_frame(groups):
        rows = []
        labels = []
        sizes = []
        positions = []
        for _, _, candidates in groups:
            sizes.append(len(candidates))
            for candidate in candidates:
                rows.append({name: candidate.features.get(name, 0.0) for name in names})
                labels.append(float(candidate.relevance))
                positions.append(candidate.position)
        return pd.DataFrame(rows, columns=names).fillna(0.0), labels, sizes, positions

    train_frame, train_labels, train_sizes, train_positions = build_frame(train_groups)
    test_frame, test_labels, test_sizes, test_positions = build_frame(holdout_groups)

    model = LGBMRanker(objective="lambdarank", random_state=request.random_seed, n_estimators=150)
    model.fit(train_frame, train_labels, group=train_sizes)
    predictions = model.predict(test_frame)

    ndcgs = []
    offset = 0
    for size in test_sizes:
        truth = np.asarray(test_labels[offset:offset + size], dtype=float).reshape(1, -1)
        score = np.asarray(predictions[offset:offset + size], dtype=float).reshape(1, -1)
        ndcgs.append(float(ndcg_score(truth, score)))
        offset += size

    artifact_id = request.run_id or f"offer_ranking_{uuid4().hex}"
    artifact = ArtifactStore().save_joblib(
        artifact_id,
        {"task": "offer_ranking", "model": model, "features": names},
        {
            "task": "offer_ranking",
            "kind": "lightgbm_ranker",
            "trainingGroups": len(train_groups),
            "holdoutGroups": len(holdout_groups),
            "splitMethod": split_method,
            "randomSeed": request.random_seed,
        },
    )
    observed_positions = [position for position in train_positions + test_positions if position is not None]
    return {
        "task": "offer_ranking",
        "status": "evaluated_not_promoted",
        "artifact": artifact,
        "metrics": {
            "meanNdcg": float(sum(ndcgs) / len(ndcgs)),
            "holdoutGroups": len(ndcgs),
            "trainingGroups": len(train_groups),
            "splitMethod": split_method,
            "exposureAware": True,
            "positionContextCoverage": float(len(observed_positions) / (len(train_labels) + len(test_labels))),
        },
        "warning": "Only exposed candidates were treated as labelled observations; NDCG is measured on held-out groups and does not prove incremental lift.",
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


def chronos2_forecast(request) -> dict[str, Any]:
    import hashlib
    import json
    import os
    from pathlib import Path

    import pandas as pd

    revision = os.getenv("CHRONOS2_REVISION", "").strip()
    if not revision:
        raise ValueError("CHRONOS2_REVISION must pin the amazon/chronos-2 snapshot before inference")

    try:
        from chronos import Chronos2Pipeline
        from huggingface_hub import snapshot_download
    except ImportError as exc:
        raise ValueError("chronos-forecasting optional dependency is not installed") from exc

    history = sorted(request.history, key=lambda point: point.timestamp)
    if any(point.value is None for point in history):
        raise ValueError("history contains unknown observations; unknown values must not be treated as zero")

    configured_snapshot = os.getenv("CHRONOS2_SNAPSHOT_DIR", "").strip()
    allow_download = os.getenv("CHRONOS2_ALLOW_DOWNLOAD", "false").lower() == "true"
    environment = os.getenv("ML_ENV", "development").lower()
    if configured_snapshot:
        root = Path(configured_snapshot).expanduser().resolve()
        if not root.exists() or not root.is_dir():
            raise ValueError("CHRONOS2_SNAPSHOT_DIR does not point to a provisioned checkpoint directory")
    else:
        if environment == "production" or not allow_download:
            raise ValueError(
                "Chronos-2 checkpoint is not provisioned. Set CHRONOS2_SNAPSHOT_DIR to a pinned snapshot; "
                "interactive model downloads are disabled."
            )
        local_snapshot = snapshot_download(repo_id="amazon/chronos-2", revision=revision)
        root = Path(local_snapshot)

    digest = hashlib.sha256()
    for path in sorted(p for p in root.rglob("*") if p.is_file()):
        digest.update(str(path.relative_to(root)).encode("utf-8"))
        digest.update(path.read_bytes())
    snapshot_hash = digest.hexdigest()
    expected_hash = os.getenv("CHRONOS2_EXPECTED_SHA256", "").strip().lower()
    if expected_hash and snapshot_hash.lower() != expected_hash:
        raise ValueError("Chronos-2 provisioned checkpoint hash does not match CHRONOS2_EXPECTED_SHA256")

    context_df = pd.DataFrame(
        {
            "id": [request.series_id] * len(history),
            "timestamp": [point.timestamp for point in history],
            "target": [float(point.value) for point in history],
        }
    )

    future_df = None
    if request.known_future_covariates:
        future_df = pd.DataFrame(request.known_future_covariates)
        required = {"id", "timestamp"}
        if not required.issubset(set(future_df.columns)):
            raise ValueError("known_future_covariates require id and timestamp columns")
        if len(future_df) != request.horizon:
            raise ValueError("known_future_covariates must contain exactly one row per forecast step")

    device = os.getenv("CHRONOS2_DEVICE", "cpu")
    pipeline = Chronos2Pipeline.from_pretrained(str(root), device_map=device)
    prediction = pipeline.predict_df(
        context_df,
        future_df=future_df,
        prediction_length=request.horizon,
        quantile_levels=[0.1, 0.5, 0.9],
        id_column="id",
        timestamp_column="timestamp",
        target="target",
        freq=request.frequency,
    )
    records = json.loads(prediction.to_json(orient="records", date_format="iso"))
    return {
        "task": "forecast_primary",
        "status": "modelled_not_promoted",
        "model": "amazon/chronos-2",
        "revision": revision,
        "snapshotSha256": snapshot_hash,
        "device": device,
        "seriesId": request.series_id,
        "horizon": request.horizon,
        "frequency": request.frequency,
        "timezone": request.timezone,
        "forecasts": records,
        "quantileLevels": [0.1, 0.5, 0.9],
        "warning": "Chronos-2 output is a probabilistic forecast, not evidence that changing spend causes the predicted outcome.",
        "promotion": {"approved": False, "reason": "Rolling-origin comparison against baseline and challenger is still required."},
    }


def causal_forest_estimate(request) -> dict[str, Any]:
    import numpy as np
    import pandas as pd

    try:
        from econml.dml import CausalForestDML
        from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
    except ImportError as exc:
        raise ValueError("econml optional dependency is not installed") from exc

    rows = sorted(request.rows, key=lambda row: row.observed_at)
    names = sorted({key for row in rows for key in row.covariates})
    if not names:
        raise ValueError("causal estimation requires documented covariates")

    x = pd.DataFrame([{name: row.covariates.get(name, 0.0) for name in names} for row in rows]).fillna(0.0)
    treatment = np.asarray([float(row.treatment) for row in rows], dtype=float)
    outcome = np.asarray([float(row.outcome) for row in rows], dtype=float)

    unique_treatment = np.unique(treatment)
    if unique_treatment.size < 2:
        raise ValueError("insufficient_evidence: treatment has no variation")

    if set(unique_treatment).issubset({0.0, 1.0}):
        treated_rate = float(treatment.mean())
        if treated_rate < request.minimum_overlap or treated_rate > 1.0 - request.minimum_overlap:
            raise ValueError("insufficient_evidence: treatment overlap is below the configured minimum")

    split = max(50, int(len(rows) * 0.8))
    if split >= len(rows):
        split = len(rows) - 20
    x_train, x_test = x.iloc[:split], x.iloc[split:]
    t_train = treatment[:split]
    y_train = outcome[:split]
    if len(x_test) < 20:
        raise ValueError("insufficient_evidence: holdout population is too small")

    binary_treatment = set(unique_treatment).issubset({0.0, 1.0})
    treatment_model = (
        RandomForestClassifier(n_estimators=150, min_samples_leaf=5, random_state=request.random_seed)
        if binary_treatment
        else RandomForestRegressor(n_estimators=150, min_samples_leaf=5, random_state=request.random_seed)
    )
    model = CausalForestDML(
        model_y=RandomForestRegressor(n_estimators=150, min_samples_leaf=5, random_state=request.random_seed),
        model_t=treatment_model,
        n_estimators=400,
        min_samples_leaf=10,
        max_depth=None,
        discrete_treatment=binary_treatment,
        random_state=request.random_seed,
    )
    fit_kwargs = {"X": x_train}
    group_values = [row.group_id for row in rows[:split]]
    if all(value is not None for value in group_values) and len(set(group_values)) >= 2:
        fit_kwargs["groups"] = np.asarray(group_values)
    model.fit(y_train, t_train, **fit_kwargs)
    effects = np.asarray(model.effect(x_test), dtype=float)
    ate = float(effects.mean())
    try:
        effect_lower, effect_upper = model.effect_interval(x_test, alpha=0.05)
        interval = [float(np.mean(effect_lower)), float(np.mean(effect_upper))]
        interval_method = "econml_effect_interval"
    except (AttributeError, RuntimeError, ValueError):
        stderr = float(effects.std(ddof=1) / np.sqrt(max(1, len(effects))))
        interval = [ate - 1.96 * stderr, ate + 1.96 * stderr]
        interval_method = "holdout_effect_mean_normal_approximation"

    return {
        "task": "incrementality",
        "status": "evaluated_not_promoted",
        "estimand": request.estimand,
        "treatment": request.treatment_name,
        "outcome": request.outcome_name,
        "sampleSize": len(rows),
        "holdoutSize": len(x_test),
        "averageTreatmentEffect": ate,
        "interval95": interval,
        "intervalMethod": interval_method,
        "groupAwareCrossFitting": "groups" in fit_kwargs,
        "overlap": {
            "treatmentMin": float(treatment.min()),
            "treatmentMax": float(treatment.max()),
            "binaryTreatedRate": float(treatment.mean()) if set(unique_treatment).issubset({0.0, 1.0}) else None,
        },
        "warning": "This observational estimate depends on documented no-unmeasured-confounding and overlap assumptions; it is not a randomized experiment.",
        "promotion": {"approved": False, "reason": "Assumption review, sensitivity checks and experiment comparison are required before action."},
    }


def fit_meridian(request) -> dict[str, Any]:
    import tempfile
    from pathlib import Path

    import numpy as np
    import xarray as xr

    try:
        from meridian.data import input_data
        from meridian.model import model, spec
    except ImportError as exc:
        raise ValueError("google-meridian optional dependency is not installed") from exc

    geos = list(request.geos)
    times = list(request.times)
    channels = list(request.media_channels)
    kpi = np.asarray(request.kpi, dtype=float)
    population = np.asarray(request.population, dtype=float)
    media = np.asarray(request.media, dtype=float)
    spend = np.asarray(request.media_spend, dtype=float)

    if kpi.shape != (len(geos), len(times)):
        raise ValueError("kpi must have shape (n_geos, n_times)")
    if population.shape != (len(geos),):
        raise ValueError("population must have shape (n_geos,)")
    if media.shape != (len(geos), len(times), len(channels)):
        raise ValueError("media must have shape (n_geos, n_times, n_media_channels)")
    if spend.shape != (len(channels),):
        raise ValueError("media_spend must have one aggregate value per media channel")
    if np.any(kpi < 0) or np.any(population <= 0) or np.any(media < 0) or np.any(spend < 0):
        raise ValueError("Meridian KPI/media/spend inputs must satisfy non-negative data requirements")

    coords = {"geo": geos, "time": times}
    kpi_da = xr.DataArray(kpi, dims=("geo", "time"), coords=coords)
    population_da = xr.DataArray(population, dims=("geo",), coords={"geo": geos})
    media_da = xr.DataArray(
        media,
        dims=("geo", "media_time", "media_channel"),
        coords={"geo": geos, "media_time": times, "media_channel": channels},
    )
    spend_da = xr.DataArray(spend, dims=("media_channel",), coords={"media_channel": channels})

    controls_da = None
    if request.controls is not None:
        controls = np.asarray(request.controls, dtype=float)
        if controls.shape != (len(geos), len(times), len(request.control_names)):
            raise ValueError("controls must have shape (n_geos, n_times, n_controls)")
        controls_da = xr.DataArray(
            controls,
            dims=("geo", "time", "control_variable"),
            coords={**coords, "control_variable": request.control_names},
        )

    data = input_data.InputData(
        kpi=kpi_da,
        kpi_type=request.kpi_type,
        population=population_da,
        controls=controls_da,
        media=media_da,
        media_spend=spend_da,
        currency_code=request.currency_code,
    )
    model_spec = spec.ModelSpec(max_lag=request.max_lag)
    mmm = model.Meridian(input_data=data, model_spec=model_spec)
    mmm.sample_prior(request.prior_draws, seed=request.random_seed)
    mmm.sample_posterior_and_review(
        n_chains=request.n_chains,
        n_adapt=request.n_adapt,
        n_burnin=request.n_burnin,
        n_keep=request.n_keep,
        seed=request.random_seed,
    )

    health = mmm.health_summary
    health_results = getattr(health, "results", None)
    overall = getattr(health_results, "overall_status", None)
    health_status = str(overall) if overall is not None else "unknown"
    eda = [str(item)[:1500] for item in getattr(mmm, "eda_outcomes", [])]

    artifact_id = request.run_id or f"marketing_mix_{uuid4().hex}"
    with tempfile.NamedTemporaryFile(prefix="ace-meridian-", suffix=".nc", delete=False) as handle:
        artifact_path = Path(handle.name)
    try:
        mmm.inference_data.to_netcdf(str(artifact_path))
        artifact = ArtifactStore().save_file(
            artifact_id,
            artifact_path,
            ".nc",
            {
                "task": "marketing_mix",
                "kind": "meridian_inference_data",
                "geos": len(geos),
                "times": len(times),
                "mediaChannels": channels,
                "currencyCode": request.currency_code,
                "maxLag": request.max_lag,
                "nChains": request.n_chains,
                "nKeep": request.n_keep,
                "randomSeed": request.random_seed,
                "healthStatus": health_status,
            },
        )
    finally:
        artifact_path.unlink(missing_ok=True)

    health_failed = "FAIL" in health_status.upper()
    return {
        "task": "marketing_mix",
        "status": "blocked_by_diagnostics" if health_failed else "evaluated_not_promoted",
        "artifact": artifact,
        "healthStatus": health_status,
        "edaOutcomes": eda,
        "sampling": {
            "priorDraws": request.prior_draws,
            "chains": request.n_chains,
            "adapt": request.n_adapt,
            "burnin": request.n_burnin,
            "keep": request.n_keep,
        },
        "promotion": {
            "approved": False,
            "reason": (
                "Meridian health checks failed; scenarios and recommendations are blocked."
                if health_failed
                else "Holdout/model-fit review and explicit tenant approval are required before promotion."
            ),
        },
        "warning": "MMM estimates depend on model specification, priors, controls and identification assumptions; attribution is not relabelled as causal incrementality.",
    }


def _prediction_frame(rows, feature_names, categorical_features):
    import pandas as pd

    frame = pd.DataFrame(
        [{name: row.features.get(name) for name in feature_names} for row in rows],
        columns=feature_names,
    )
    categorical = set(categorical_features)
    for name in feature_names:
        if name in categorical:
            frame[name] = frame[name].fillna("__missing__").astype(str)
        else:
            frame[name] = pd.to_numeric(frame[name], errors="coerce")
    return frame


def score_artifact(request) -> dict[str, Any]:
    artifact = ArtifactStore().load_verified_joblib(request.artifact_id, request.artifact_sha256)
    artifact_task = str(artifact.get("task") or "")
    if artifact_task != request.task:
        raise ValueError("artifact task does not match requested task")
    feature_names = list(artifact.get("features") or [])
    categorical = list(artifact.get("categoricalFeatures") or [])
    if not feature_names:
        raise ValueError("artifact does not contain a serving feature schema")
    frame = _prediction_frame(request.rows, feature_names, categorical)

    items = []
    if request.task in {"lead_qualification", "paid_conversion", "customer_churn"}:
        calibrator = artifact.get("calibrator")
        if calibrator is None:
            raise ValueError("classification artifact does not contain its fitted calibration component")
        probabilities = calibrator.predict_proba(frame)[:, 1]
        for row, probability in zip(request.rows, probabilities, strict=True):
            items.append(
                {
                    "entityId": row.entity_id,
                    "probability": float(probability),
                    "horizon": request.horizon,
                }
            )
        result_type = "calibrated_probability"
    else:
        if request.horizon and str(artifact.get("horizon") or "") != request.horizon:
            raise ValueError("artifact horizon does not match requested horizon")
        model = artifact.get("model")
        if model is None:
            raise ValueError("regression artifact does not contain a fitted model")
        estimates = model.predict(frame)
        for row, estimate in zip(request.rows, estimates, strict=True):
            items.append(
                {
                    "entityId": row.entity_id,
                    "estimate": float(estimate),
                    "horizon": str(artifact.get("horizon") or request.horizon or ""),
                }
            )
        result_type = "regression_estimate"

    return {
        "task": request.task,
        "status": "served_from_verified_artifact",
        "resultType": result_type,
        "artifact": {
            "artifactId": request.artifact_id,
            "sha256": request.artifact_sha256.lower(),
        },
        "predictionCutoff": request.prediction_cutoff.isoformat(),
        "items": items,
        "warnings": [
            "Feature contributions, when separately exposed, are associative model explanations and are not causal effects."
        ],
    }


def forecast_challenger(request) -> dict[str, Any]:
    import numpy as np
    import pandas as pd
    from catboost import CatBoostRegressor
    from sklearn.metrics import mean_absolute_error, mean_squared_error

    history = sorted(request.history, key=lambda point: point.timestamp)
    if any(point.value is None for point in history):
        raise ValueError("history contains unknown observations; unknown values must not be treated as zero")
    if len(history) < max(request.lags) + max(12, request.horizon):
        raise ValueError("insufficient_data: lagged challenger needs more history for training and holdout evaluation")

    timestamps = [point.timestamp for point in history]
    values = np.asarray([float(point.value) for point in history], dtype=float)
    historical_covariates = {}
    for item in request.historical_covariates:
        timestamp = str(item.get("timestamp") or "")
        if timestamp:
            historical_covariates[timestamp] = dict(item)

    known_future_keys = {
        key
        for item in request.known_future_covariates
        for key, value in item.items()
        if key not in {"id", "timestamp", "target"} and isinstance(value, (int, float))
    }
    historical_only_keys = {
        key
        for item in request.historical_covariates
        for key, value in item.items()
        if key not in {"id", "timestamp", "target"}
        and isinstance(value, (int, float))
        and key not in known_future_keys
    }

    if request.known_future_covariates:
        if len(timestamps) < 2:
            raise ValueError("insufficient_data: at least two timestamps are required")
        step = timestamps[-1] - timestamps[-2]
        if step.total_seconds() <= 0:
            raise ValueError("history timestamps must be strictly increasing")
        supplied = {}
        for item in request.known_future_covariates:
            timestamp = str(item.get("timestamp") or "")
            if not timestamp:
                raise ValueError("missing_future_covariates: each future covariate row requires timestamp")
            if timestamp in supplied:
                raise ValueError("missing_future_covariates: duplicate future covariate timestamp")
            supplied[timestamp] = item
        expected = [(timestamps[-1] + step * index).isoformat() for index in range(1, request.horizon + 1)]
        missing = [timestamp for timestamp in expected if timestamp not in supplied]
        if missing:
            raise ValueError("missing_future_covariates: every forecast step must be supplied once future covariates are declared")
        for timestamp in expected:
            item = supplied[timestamp]
            absent = [key for key in known_future_keys if not isinstance(item.get(key), (int, float))]
            if absent:
                raise ValueError("missing_future_covariates: declared numeric future covariates must be available for every forecast step")

    rows = []
    targets = []
    for index in range(max(request.lags), len(values)):
        row = {f"lag_{lag}": float(values[index - lag]) for lag in request.lags}
        if request.include_calendar_features:
            ts = timestamps[index]
            row.update(
                {
                    "dow": int(ts.weekday()),
                    "month": int(ts.month),
                    "day": int(ts.day),
                    "dayofyear": int(ts.timetuple().tm_yday),
                }
            )
        current_covariates = historical_covariates.get(timestamps[index].isoformat(), {})
        prior_covariates = historical_covariates.get(timestamps[index - 1].isoformat(), {})
        for key in known_future_keys:
            value = current_covariates.get(key)
            if isinstance(value, (int, float)):
                row[f"cov_{key}"] = float(value)
        for key in historical_only_keys:
            value = prior_covariates.get(key)
            if isinstance(value, (int, float)):
                row[f"cov_{key}"] = float(value)
        rows.append(row)
        targets.append(float(values[index]))

    frame = pd.DataFrame(rows).fillna(0.0)
    targets_arr = np.asarray(targets, dtype=float)
    holdout = max(request.horizon, min(max(8, int(len(frame) * 0.2)), max(8, len(frame) // 3)))
    if len(frame) - holdout < 20:
        raise ValueError("insufficient_data: lagged challenger leaves fewer than 20 training rows")
    x_train, x_test = frame.iloc[:-holdout], frame.iloc[-holdout:]
    y_train, y_test = targets_arr[:-holdout], targets_arr[-holdout:]

    model = CatBoostRegressor(
        iterations=500,
        depth=6,
        learning_rate=0.05,
        loss_function="MAE",
        random_seed=request.random_seed,
        verbose=False,
        allow_writing_files=False,
    )
    model.fit(x_train, y_train, verbose=False)
    holdout_prediction = np.asarray(model.predict(x_test), dtype=float)
    metrics = {
        "mae": float(mean_absolute_error(y_test, holdout_prediction)),
        "rmse": float(math.sqrt(mean_squared_error(y_test, holdout_prediction))),
        "bias": float((holdout_prediction - y_test).mean()),
        "testRows": len(y_test),
    }

    known_covariates = {}
    for item in request.known_future_covariates:
        timestamp = str(item.get("timestamp") or "")
        if timestamp:
            known_covariates[timestamp] = dict(item)

    working_values = list(values)
    forecast = []
    last_timestamp = timestamps[-1]
    if len(timestamps) < 2:
        raise ValueError("insufficient_data: at least two timestamps are required")
    step = timestamps[-1] - timestamps[-2]
    if step.total_seconds() <= 0:
        raise ValueError("history timestamps must be strictly increasing")
    for horizon_index in range(1, request.horizon + 1):
        future_timestamp = last_timestamp + step * horizon_index
        feature_row = {f"lag_{lag}": float(working_values[-lag]) for lag in request.lags}
        if request.include_calendar_features:
            feature_row.update(
                {
                    "dow": int(future_timestamp.weekday()),
                    "month": int(future_timestamp.month),
                    "day": int(future_timestamp.day),
                    "dayofyear": int(future_timestamp.timetuple().tm_yday),
                }
            )
        covariates = known_covariates.get(future_timestamp.isoformat(), {})
        for key in known_future_keys:
            value = covariates.get(key)
            if isinstance(value, (int, float)):
                feature_row[f"cov_{key}"] = float(value)
        latest_observed_covariates = historical_covariates.get(last_timestamp.isoformat(), {})
        for key in historical_only_keys:
            value = latest_observed_covariates.get(key)
            if isinstance(value, (int, float)):
                feature_row[f"cov_{key}"] = float(value)
        for column in frame.columns:
            feature_row.setdefault(column, 0.0)
        future_frame = pd.DataFrame([feature_row], columns=frame.columns)
        prediction = float(model.predict(future_frame)[0])
        forecast.append({"timestamp": future_timestamp.isoformat(), "point": prediction})
        working_values.append(prediction)

    artifact_id = request.run_id or f"forecast_challenger_{uuid4().hex}"
    artifact = ArtifactStore().save_joblib(
        artifact_id,
        {
            "task": "forecast_challenger",
            "model": model,
            "features": list(frame.columns),
            "lags": list(request.lags),
            "frequency": request.frequency,
        },
        {
            "task": "forecast_challenger",
            "kind": "catboost_lag_regressor",
            "seriesId": request.series_id,
            "frequency": request.frequency,
            "timezone": request.timezone,
            "lags": list(request.lags),
            "randomSeed": request.random_seed,
            "trainingRows": len(x_train),
            "testRows": len(x_test),
        },
    )
    return {
        "task": "forecast_challenger",
        "status": "evaluated_not_promoted",
        "artifact": artifact,
        "seriesId": request.series_id,
        "horizon": request.horizon,
        "frequency": request.frequency,
        "timezone": request.timezone,
        "pointForecast": forecast,
        "metrics": metrics,
        "intervals": None,
        "warning": "Recursive lag forecasts are predictive only; future covariates are accepted only when explicitly supplied as known at forecast time.",
        "promotion": {"approved": False, "reason": "Compare against seasonal-naive and Chronos on predeclared rolling-origin criteria before promotion."},
    }


def score_ranker(request) -> dict[str, Any]:
    import pandas as pd

    artifact = ArtifactStore().load_verified_joblib(request.artifact_id, request.artifact_sha256)
    if str(artifact.get("task") or "") != "offer_ranking":
        raise ValueError("artifact is not an offer-ranking artifact")
    model = artifact.get("model")
    feature_names = list(artifact.get("features") or [])
    if model is None or not feature_names:
        raise ValueError("ranker artifact is missing model or feature schema")

    groups = []
    for group in request.groups:
        eligible = [candidate for candidate in group.candidates if candidate.eligible]
        if not eligible:
            groups.append({"groupId": group.group_id, "items": []})
            continue
        frame = pd.DataFrame(
            [{name: candidate.features.get(name, 0.0) for name in feature_names} for candidate in eligible],
            columns=feature_names,
        ).fillna(0.0)
        scores = model.predict(frame)
        items = sorted(
            [
                {"candidateId": candidate.candidate_id, "score": float(score)}
                for candidate, score in zip(eligible, scores, strict=True)
            ],
            key=lambda item: item["score"],
            reverse=True,
        )
        for position, item in enumerate(items, start=1):
            item["rank"] = position
        groups.append({"groupId": group.group_id, "items": items})

    return {
        "task": "offer_ranking",
        "status": "served_from_verified_artifact",
        "resultType": "ranking",
        "artifact": {"artifactId": request.artifact_id, "sha256": request.artifact_sha256.lower()},
        "predictionCutoff": request.prediction_cutoff.isoformat(),
        "groups": groups,
        "warning": "Eligibility and consent exclusions are applied before ranking; ranking scores do not prove incremental lift.",
    }
