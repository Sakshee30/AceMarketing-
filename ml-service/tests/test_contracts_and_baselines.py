from datetime import UTC, datetime, timedelta

import pytest
from pydantic import ValidationError

from acemarketing_ml.contracts import ForecastRequest, MetricPoint, PointInTimeRow
from acemarketing_ml.pipelines import _eligible_supervised_rows, seasonal_naive_forecast


def test_point_in_time_contract_rejects_future_feature():
    cutoff = datetime(2026, 1, 1, tzinfo=UTC)
    with pytest.raises(ValidationError):
        PointInTimeRow(
            entity_id="lead-1",
            features={"score": 10},
            feature_available_at=cutoff + timedelta(seconds=1),
            prediction_cutoff=cutoff,
        )


def test_seasonal_naive_preserves_zero_and_rejects_unknown():
    start = datetime(2026, 1, 1, tzinfo=UTC)
    request = ForecastRequest(
        series_id="revenue",
        history=[
            MetricPoint(timestamp=start + timedelta(days=index), value=value)
            for index, value in enumerate([1.0, 0.0, 3.0, 1.0, 0.0, 3.0])
        ],
        horizon=3,
        season_length=3,
        frequency="D",
        timezone="UTC",
    )
    result = seasonal_naive_forecast(request)
    assert result["pointForecast"] == [1.0, 0.0, 3.0]

    unknown = request.model_copy(
        update={
            "history": [
                MetricPoint(timestamp=start + timedelta(days=index), value=value)
                for index, value in enumerate([1.0, None, 3.0, 1.0])
            ]
        }
    )
    with pytest.raises(ValueError, match="unknown observations"):
        seasonal_naive_forecast(unknown)


def test_seasonal_naive_rejects_irregular_time_axis():
    start = datetime(2026, 1, 1, tzinfo=UTC)
    request = ForecastRequest(
        series_id="leads",
        history=[
            MetricPoint(timestamp=start, value=1),
            MetricPoint(timestamp=start + timedelta(days=1), value=2),
            MetricPoint(timestamp=start + timedelta(days=3), value=3),
            MetricPoint(timestamp=start + timedelta(days=4), value=4),
        ],
        horizon=1,
        season_length=2,
        frequency="D",
        timezone="UTC",
    )
    with pytest.raises(ValueError, match="not regular"):
        seasonal_naive_forecast(request)


def test_artifact_store_rejects_tampering(monkeypatch, tmp_path):
    from acemarketing_ml.artifacts import ArtifactStore

    monkeypatch.setenv("ML_ARTIFACT_DIR", str(tmp_path))
    monkeypatch.setenv("ML_ENV", "development")
    store = ArtifactStore()
    record = store.save_joblib("verified-artifact", {"task": "lead_qualification"}, {"task": "lead_qualification"})
    assert len(record["sha256"]) == 64

    artifact_path = tmp_path / "verified-artifact.joblib"
    artifact_path.write_bytes(artifact_path.read_bytes() + b"tampered")
    with pytest.raises(RuntimeError, match="hash verification failed"):
        store.load_verified_joblib("verified-artifact", record["sha256"])


def test_catboost_challenger_preserves_time_boundary(monkeypatch, tmp_path):
    pytest.importorskip("catboost")
    from acemarketing_ml.contracts import ChallengerForecastRequest
    from acemarketing_ml.pipelines import forecast_challenger

    monkeypatch.setenv("ML_ARTIFACT_DIR", str(tmp_path))
    monkeypatch.setenv("ML_ENV", "development")
    start = datetime(2026, 1, 1, tzinfo=UTC)
    history = [
        MetricPoint(timestamp=start + timedelta(days=index), value=float(10 + (index % 7) + index * 0.1))
        for index in range(90)
    ]
    request = ChallengerForecastRequest(
        series_id="qualified-leads",
        history=history,
        horizon=7,
        season_length=7,
        frequency="D",
        timezone="UTC",
        lags=[1, 7, 14],
        historical_covariates=[
            {"timestamp": (start + timedelta(days=index)).isoformat(), "holiday": 1 if index % 30 == 0 else 0}
            for index in range(90)
        ],
        known_future_covariates=[
            {"timestamp": (start + timedelta(days=90 + index)).isoformat(), "holiday": 0} for index in range(7)
        ],
    )
    result = forecast_challenger(request)
    assert result["task"] == "forecast_challenger"
    assert result["status"] == "evaluated_not_promoted"
    assert len(result["pointForecast"]) == 7
    assert result["metrics"]["testRows"] > 0
    assert result["artifact"]["sha256"]


def test_immature_labels_are_censored_and_not_forced_negative():
    cutoff = datetime(2026, 6, 1, tzinfo=UTC)
    rows = []
    for index in range(40):
        observed = cutoff - timedelta(days=1) if index < 39 else cutoff + timedelta(days=1)
        rows.append(
            PointInTimeRow(
                entity_id=f"lead-{index}",
                features={"score": index},
                label=1 if index % 2 else 0,
                feature_available_at=cutoff - timedelta(days=30),
                prediction_cutoff=cutoff - timedelta(days=20),
                label_observed_at=observed,
            )
        )
    with pytest.raises(ValueError, match="insufficient_data"):
        _eligible_supervised_rows(rows, cutoff)


def test_unobserved_labels_are_censored():
    cutoff = datetime(2026, 6, 1, tzinfo=UTC)
    rows = [
        PointInTimeRow(
            entity_id=f"lead-{index}",
            features={"score": index},
            label=None if index == 0 else (1 if index % 2 else 0),
            feature_available_at=cutoff - timedelta(days=30),
            prediction_cutoff=cutoff - timedelta(days=20),
            label_observed_at=None if index == 0 else cutoff - timedelta(days=1),
        )
        for index in range(41)
    ]
    eligible, censored = _eligible_supervised_rows(rows, cutoff)
    assert len(eligible) == 40
    assert censored == 1


def test_forecast_challenger_rejects_incomplete_future_covariates(monkeypatch, tmp_path):
    pytest.importorskip("catboost")
    from acemarketing_ml.contracts import ChallengerForecastRequest
    from acemarketing_ml.pipelines import forecast_challenger

    monkeypatch.setenv("ML_ARTIFACT_DIR", str(tmp_path))
    monkeypatch.setenv("ML_ENV", "development")
    start = datetime(2026, 1, 1, tzinfo=UTC)
    history = [
        MetricPoint(timestamp=start + timedelta(days=index), value=float(20 + index * 0.2)) for index in range(90)
    ]
    request = ChallengerForecastRequest(
        series_id="leads",
        history=history,
        horizon=7,
        season_length=7,
        frequency="D",
        timezone="UTC",
        lags=[1, 7, 14],
        known_future_covariates=[{"timestamp": (start + timedelta(days=90)).isoformat(), "holiday": 0}],
    )
    with pytest.raises(ValueError, match="missing_future_covariates"):
        forecast_challenger(request)


def test_classification_rejects_single_class_partitions(monkeypatch, tmp_path):
    pytest.importorskip("catboost")
    from acemarketing_ml.contracts import ClassificationTrainRequest
    from acemarketing_ml.pipelines import train_classification

    monkeypatch.setenv("ML_ARTIFACT_DIR", str(tmp_path))
    monkeypatch.setenv("ML_ENV", "development")
    cutoff = datetime(2026, 6, 1, tzinfo=UTC)
    rows = [
        PointInTimeRow(
            entity_id=f"lead-{index}",
            features={"score": index},
            label=1,
            feature_available_at=cutoff - timedelta(days=90 - index),
            prediction_cutoff=cutoff - timedelta(days=80 - index),
            label_observed_at=cutoff - timedelta(days=1),
        )
        for index in range(60)
    ]
    request = ClassificationTrainRequest(
        task="lead_qualification",
        rows=rows,
        categorical_features=[],
        label_cutoff=cutoff,
    )
    with pytest.raises(ValueError, match="insufficient_classes"):
        train_classification(request)


def test_shared_result_contract_manifest():
    import json
    from pathlib import Path

    path = Path(__file__).resolve().parents[2] / "configs" / "ai" / "result-schema-v1.json"
    manifest = json.loads(path.read_text(encoding="utf-8"))
    assert manifest["schemaVersion"] == "ai-result-contract.v1"
    assert "forecast_distribution" in manifest["resultTypes"]
    assert "causal_estimate" in manifest["resultTypes"]
    assert "marketing_mix_analysis" in manifest["resultTypes"]
    assert "calibrationReference" in manifest["resultTypes"]["calibrated_probability"]


def test_anomaly_minimum_volume_and_duplicate_suppression():
    pytest.importorskip("sklearn")
    from acemarketing_ml.contracts import AnomalyRequest, MatrixRow
    from acemarketing_ml.pipelines import anomaly_detection

    rows = [MatrixRow(entity_id=f"entity-{index}", features={"value": float(index)}) for index in range(12)]
    rows.append(MatrixRow(entity_id="entity-0", features={"value": 999.0}))
    result = anomaly_detection(AnomalyRequest(rows=rows, minimum_volume=20))
    assert result["status"] == "insufficient_data"
    assert result["observedVolume"] == 12
    assert result["suppressedDuplicates"] == 1


def test_segmentation_reports_stability_diagnostics():
    pytest.importorskip("sklearn")
    from acemarketing_ml.contracts import MatrixRow, SegmentationRequest
    from acemarketing_ml.pipelines import behavioral_segments

    rows = []
    for index in range(20):
        base = 0.0 if index < 10 else 10.0
        rows.append(
            MatrixRow(
                entity_id=f"entity-{index}",
                features={"x": base + index * 0.01, "y": base + index * 0.02},
            )
        )
    result = behavioral_segments(
        SegmentationRequest(rows=rows, min_cluster_size=3, min_samples=2, stability_jitter_fraction=1e-6)
    )
    assert result["status"] == "evaluated_not_promoted"
    assert "perturbationAdjustedRand" in result["stability"]
    assert 0.0 <= result["stability"]["noiseFraction"] <= 1.0


def test_ranker_evaluates_held_out_groups(monkeypatch, tmp_path):
    pytest.importorskip("lightgbm")
    from acemarketing_ml.contracts import RankingCandidate, RankingGroup, RankingTrainRequest
    from acemarketing_ml.pipelines import train_ranker

    monkeypatch.setenv("ML_ARTIFACT_DIR", str(tmp_path))
    monkeypatch.setenv("ML_ENV", "development")
    start = datetime(2026, 1, 1, tzinfo=UTC)
    groups = []
    for group_index in range(10):
        groups.append(
            RankingGroup(
                group_id=f"group-{group_index}",
                observed_at=start + timedelta(days=group_index),
                candidates=[
                    RankingCandidate(
                        candidate_id=f"{group_index}-a",
                        features={"quality": 1.0, "price": 0.2},
                        relevance=3.0,
                        exposed=True,
                        position=1,
                    ),
                    RankingCandidate(
                        candidate_id=f"{group_index}-b",
                        features={"quality": 0.5, "price": 0.8},
                        relevance=1.0,
                        exposed=True,
                        position=2,
                    ),
                ],
            )
        )
    result = train_ranker(RankingTrainRequest(groups=groups, holdout_fraction=0.2))
    assert result["status"] == "evaluated_not_promoted"
    assert result["metrics"]["splitMethod"] == "time_ordered_group_holdout"
    assert result["metrics"]["trainingGroups"] == 8
    assert result["metrics"]["holdoutGroups"] == 2
    assert result["metrics"]["exposureAware"] is True
    assert result["artifact"]["sha256"]


def test_meridian_budget_scenario_constraints_are_feasible_and_bounded():
    from acemarketing_ml.contracts import MeridianBudgetScenario
    from acemarketing_ml.pipelines import _validate_meridian_scenario

    scenario = MeridianBudgetScenario(
        total_budget=1000.0,
        minimum_allocation={"Search": 0.4, "Social": 0.2},
        maximum_allocation={"Search": 0.8, "Social": 0.6},
        max_change_fraction=0.5,
    )
    validated = _validate_meridian_scenario(["Search", "Social"], [600.0, 400.0], scenario)
    assert validated["totalBudget"] == 1000.0
    assert validated["baselineAllocation"] == {"Search": 0.6, "Social": 0.4}
    assert validated["minimumAllocation"]["Search"] == 0.4
    assert validated["maximumAllocation"]["Social"] == 0.6
    assert 0 <= validated["lowerConstraint"]["Search"] <= 1
    assert 0 <= validated["upperConstraint"]["Social"] <= 1


def test_meridian_budget_scenario_rejects_infeasible_or_unknown_channel_constraints():
    from acemarketing_ml.contracts import MeridianBudgetScenario
    from acemarketing_ml.pipelines import _validate_meridian_scenario

    with pytest.raises(ValueError, match="unknown media channels"):
        _validate_meridian_scenario(
            ["Search", "Social"],
            [600.0, 400.0],
            MeridianBudgetScenario(minimum_allocation={"Telepathy": 0.1}),
        )
    with pytest.raises(ValueError, match="sum above 1"):
        _validate_meridian_scenario(
            ["Search", "Social"],
            [600.0, 400.0],
            MeridianBudgetScenario(
                minimum_allocation={"Search": 0.7, "Social": 0.6},
                maximum_allocation={"Search": 0.9, "Social": 0.9},
            ),
        )
