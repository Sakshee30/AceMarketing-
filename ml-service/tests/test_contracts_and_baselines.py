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
