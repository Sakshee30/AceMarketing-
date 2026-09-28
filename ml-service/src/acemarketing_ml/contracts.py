from __future__ import annotations

from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, Field, model_validator


ClassificationTask = Literal["lead_qualification", "paid_conversion", "customer_churn"]
RegressionTask = Literal["future_customer_value"]


class PointInTimeRow(BaseModel):
    entity_id: str = Field(min_length=1, max_length=256)
    features: dict[str, Any]
    label: float | int | None = None
    feature_available_at: datetime
    prediction_cutoff: datetime
    label_observed_at: datetime | None = None

    @model_validator(mode="after")
    def validate_point_in_time(self):
        if self.feature_available_at > self.prediction_cutoff:
            raise ValueError("feature_available_at cannot be after prediction_cutoff")
        return self


class ClassificationTrainRequest(BaseModel):
    run_id: str | None = Field(default=None, max_length=256)
    task: ClassificationTask
    rows: list[PointInTimeRow] = Field(min_length=30, max_length=250_000)
    categorical_features: list[str] = Field(default_factory=list, max_length=100)
    label_cutoff: datetime
    calibration_method: Literal["sigmoid", "isotonic"] = "sigmoid"
    random_seed: int = 42


class RegressionTrainRequest(BaseModel):
    run_id: str | None = Field(default=None, max_length=256)
    task: RegressionTask
    horizon: Literal["90d", "180d"]
    rows: list[PointInTimeRow] = Field(min_length=30, max_length=250_000)
    categorical_features: list[str] = Field(default_factory=list, max_length=100)
    label_cutoff: datetime
    random_seed: int = 42


class MetricPoint(BaseModel):
    timestamp: datetime
    value: float | None


class ForecastRequest(BaseModel):
    run_id: str | None = Field(default=None, max_length=256)
    series_id: str = Field(min_length=1, max_length=256)
    history: list[MetricPoint] = Field(min_length=4, max_length=100_000)
    horizon: int = Field(ge=1, le=730)
    season_length: int = Field(ge=1, le=366)
    frequency: str = Field(min_length=1, max_length=32)
    timezone: str = Field(min_length=1, max_length=128)
    known_future_covariates: list[dict[str, Any]] = Field(default_factory=list)


class MatrixRow(BaseModel):
    entity_id: str = Field(min_length=1, max_length=256)
    features: dict[str, float]


class AnomalyRequest(BaseModel):
    run_id: str | None = Field(default=None, max_length=256)
    rows: list[MatrixRow] = Field(min_length=10, max_length=250_000)
    contamination: float = Field(default=0.02, gt=0, le=0.5)
    random_seed: int = 42


class SegmentationRequest(BaseModel):
    run_id: str | None = Field(default=None, max_length=256)
    rows: list[MatrixRow] = Field(min_length=10, max_length=250_000)
    min_cluster_size: int = Field(default=5, ge=2, le=10_000)
    min_samples: int | None = Field(default=None, ge=1, le=10_000)


class RankingCandidate(BaseModel):
    candidate_id: str = Field(min_length=1, max_length=256)
    features: dict[str, float]
    relevance: float
    exposed: bool = True
    position: int | None = Field(default=None, ge=1)


class RankingGroup(BaseModel):
    group_id: str = Field(min_length=1, max_length=256)
    candidates: list[RankingCandidate] = Field(min_length=2, max_length=10_000)


class RankingTrainRequest(BaseModel):
    run_id: str | None = Field(default=None, max_length=256)
    groups: list[RankingGroup] = Field(min_length=3, max_length=50_000)
    random_seed: int = 42


class CapabilityResponse(BaseModel):
    task: str
    implementation: str
    dependency_available: bool
    trained: bool = False
    evaluated: bool = False
    approved: bool = False
    deployed: bool = False
    reason: str | None = None


class CausalRow(BaseModel):
    entity_id: str = Field(min_length=1, max_length=256)
    treatment: float
    outcome: float
    covariates: dict[str, float]
    group_id: str | None = Field(default=None, max_length=256)
    observed_at: datetime


class CausalForestRequest(BaseModel):
    run_id: str | None = Field(default=None, max_length=256)
    rows: list[CausalRow] = Field(min_length=100, max_length=250_000)
    treatment_name: str = Field(min_length=1, max_length=128)
    outcome_name: str = Field(min_length=1, max_length=128)
    estimand: str = Field(min_length=1, max_length=256)
    random_seed: int = 42
    minimum_overlap: float = Field(default=0.05, gt=0, lt=0.5)
