from datetime import UTC, datetime, timedelta

import pytest
from pydantic import ValidationError

from acemarketing_ml.contracts import ForecastRequest, MetricPoint, PointInTimeRow
from acemarketing_ml.pipelines import seasonal_naive_forecast


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
            {"timestamp": (start + timedelta(days=90 + index)).isoformat(), "holiday": 0}
            for index in range(7)
        ],
    )
    result = forecast_challenger(request)
    assert result["task"] == "forecast_challenger"
    assert result["status"] == "evaluated_not_promoted"
    assert len(result["pointForecast"]) == 7
    assert result["metrics"]["testRows"] > 0
    assert result["artifact"]["sha256"]
