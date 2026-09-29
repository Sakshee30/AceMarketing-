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
    dataset_id: str | None = Field(default=None, max_length=256)
    dataset_hash: str | None = Field(default=None, pattern=r"^[a-fA-F0-9]{64}$")
    feature_schema_version: str | None = Field(default=None, max_length=128)
    label_schema_version: str | None = Field(default=None, max_length=128)
    task: ClassificationTask
    rows: list[PointInTimeRow] = Field(min_length=30, max_length=250_000)
    categorical_features: list[str] = Field(default_factory=list, max_length=100)
    label_cutoff: datetime
    calibration_method: Literal["sigmoid", "isotonic"] = "sigmoid"
    operating_capacity_fraction: float = Field(default=0.10, gt=0, le=1)
    decision_threshold: float = Field(default=0.5, ge=0, le=1)
    random_seed: int = 42


class RegressionTrainRequest(BaseModel):
    run_id: str | None = Field(default=None, max_length=256)
    dataset_id: str | None = Field(default=None, max_length=256)
    dataset_hash: str | None = Field(default=None, pattern=r"^[a-fA-F0-9]{64}$")
    feature_schema_version: str | None = Field(default=None, max_length=128)
    label_schema_version: str | None = Field(default=None, max_length=128)
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
    minimum_volume: int = Field(default=30, ge=10, le=250_000)
    random_seed: int = 42


class SegmentationRequest(BaseModel):
    run_id: str | None = Field(default=None, max_length=256)
    rows: list[MatrixRow] = Field(min_length=10, max_length=250_000)
    min_cluster_size: int = Field(default=5, ge=2, le=10_000)
    min_samples: int | None = Field(default=None, ge=1, le=10_000)
    stability_jitter_fraction: float = Field(default=1e-6, ge=0, le=0.05)
    random_seed: int = 42


class RankingCandidate(BaseModel):
    candidate_id: str = Field(min_length=1, max_length=256)
    features: dict[str, float]
    relevance: float
    exposed: bool = True
    position: int | None = Field(default=None, ge=1)


class RankingGroup(BaseModel):
    group_id: str = Field(min_length=1, max_length=256)
    candidates: list[RankingCandidate] = Field(min_length=2, max_length=10_000)
    observed_at: datetime | None = None


class RankingTrainRequest(BaseModel):
    run_id: str | None = Field(default=None, max_length=256)
    groups: list[RankingGroup] = Field(min_length=4, max_length=50_000)
    holdout_fraction: float = Field(default=0.20, ge=0.10, le=0.50)
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


class MeridianFitRequest(BaseModel):
    run_id: str | None = Field(default=None, max_length=256)
    geos: list[str] = Field(min_length=1, max_length=500)
    times: list[datetime] = Field(min_length=8, max_length=10_000)
    kpi: list[list[float]]
    kpi_type: Literal["revenue", "non-revenue"]
    population: list[float]
    media_channels: list[str] = Field(min_length=1, max_length=200)
    media: list[list[list[float]]]
    media_spend: list[float]
    control_names: list[str] = Field(default_factory=list, max_length=200)
    controls: list[list[list[float]]] | None = None
    currency_code: str | None = Field(default=None, min_length=3, max_length=3)
    max_lag: int = Field(default=8, ge=0, le=52)
    prior_draws: int = Field(default=250, ge=50, le=2_000)
    n_chains: int = Field(default=4, ge=2, le=8)
    n_adapt: int = Field(default=500, ge=100, le=5_000)
    n_burnin: int = Field(default=250, ge=50, le=2_500)
    n_keep: int = Field(default=500, ge=100, le=5_000)
    random_seed: int = 42


class PredictionRow(BaseModel):
    entity_id: str = Field(min_length=1, max_length=256)
    features: dict[str, Any]


class ArtifactScoreRequest(BaseModel):
    run_id: str | None = Field(default=None, max_length=256)
    task: Literal["lead_qualification", "paid_conversion", "customer_churn", "future_customer_value"]
    artifact_id: str = Field(min_length=1, max_length=256, pattern=r"^[A-Za-z0-9_.-]+$")
    artifact_sha256: str = Field(pattern=r"^[a-fA-F0-9]{64}$")
    rows: list[PredictionRow] = Field(min_length=1, max_length=50_000)
    horizon: Literal["90d", "180d"] | None = None
    prediction_cutoff: datetime


class RankScoreCandidate(BaseModel):
    candidate_id: str = Field(min_length=1, max_length=256)
    features: dict[str, float]
    eligible: bool = True


class RankScoreGroup(BaseModel):
    group_id: str = Field(min_length=1, max_length=256)
    candidates: list[RankScoreCandidate] = Field(min_length=1, max_length=10_000)


class RankScoreRequest(BaseModel):
    run_id: str | None = Field(default=None, max_length=256)
    artifact_id: str = Field(min_length=1, max_length=256)
    artifact_sha256: str = Field(pattern=r"^[a-fA-F0-9]{64}$")
    groups: list[RankScoreGroup] = Field(min_length=1, max_length=10_000)
    prediction_cutoff: datetime


class ForecastCandidate(BaseModel):
    name: str = Field(min_length=1, max_length=128)
    kind: Literal["baseline", "model", "ensemble"]
    point: list[float] = Field(min_length=4, max_length=10_000)
    lower: list[float] | None = Field(default=None, min_length=4, max_length=10_000)
    upper: list[float] | None = Field(default=None, min_length=4, max_length=10_000)
    quantiles: dict[str, list[float]] = Field(default_factory=dict)
    nominal_coverage: float = Field(default=0.80, gt=0, lt=1)


class ForecastQualificationRequest(BaseModel):
    actual: list[float] = Field(min_length=4, max_length=10_000)
    candidates: list[ForecastCandidate] = Field(min_length=2, max_length=16)
    baseline_name: str = Field(min_length=1, max_length=128)
    minimum_relative_mae_improvement: float = Field(default=0.0, ge=-1, le=1)
    coverage_tolerance: float = Field(default=0.10, ge=0, le=0.5)

    @model_validator(mode="after")
    def validate_candidate_names(self):
        names = [candidate.name for candidate in self.candidates]
        if len(names) != len(set(names)):
            raise ValueError("forecast candidate names must be unique")
        if self.baseline_name not in names:
            raise ValueError("baseline_name must refer to a supplied candidate")
        return self


class ChallengerForecastRequest(ForecastRequest):
    lags: list[int] = Field(default_factory=lambda: [1, 7, 14, 28], min_length=1, max_length=32)
    include_calendar_features: bool = True
    historical_covariates: list[dict[str, Any]] = Field(default_factory=list, max_length=100_000)
    random_seed: int = 42
