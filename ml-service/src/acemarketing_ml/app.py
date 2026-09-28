from __future__ import annotations

import os
import secrets
from typing import Annotated

from fastapi import Depends, FastAPI, Header, HTTPException

from . import __version__
from .contracts import (
    AnomalyRequest,
    CausalForestRequest,
    ClassificationTrainRequest,
    ForecastRequest,
    MeridianFitRequest,
    RankingTrainRequest,
    RegressionTrainRequest,
    SegmentationRequest,
)
from .pipelines import (
    anomaly_detection,
    behavioral_segments,
    causal_forest_estimate,
    chronos2_forecast,
    dependency_capabilities,
    fit_meridian,
    seasonal_naive_forecast,
    train_classification,
    train_ranker,
    train_regression,
)

app = FastAPI(title="AceMarketing ML Service", version=__version__)


def require_internal_token(
    x_internal_token: Annotated[str | None, Header(alias="X-Internal-Token")] = None,
) -> None:
    expected = os.getenv("ML_SERVICE_AUTH_TOKEN", "")
    if not expected:
        raise HTTPException(status_code=503, detail="ML_SERVICE_AUTH_TOKEN is not configured")
    if not x_internal_token or not secrets.compare_digest(x_internal_token, expected):
        raise HTTPException(status_code=401, detail="invalid internal service credential")


@app.get("/health")
def health():
    return {"ok": True, "service": "acemarketing-ml", "version": __version__}


@app.get("/v1/capabilities", dependencies=[Depends(require_internal_token)])
def capabilities():
    return {
        "schemaVersion": "ml-capabilities.v1",
        "items": dependency_capabilities(),
        "note": "Dependency availability is not training, evaluation, approval or deployment evidence.",
    }


@app.post("/v1/train/classification", dependencies=[Depends(require_internal_token)])
def train_classification_endpoint(request: ClassificationTrainRequest):
    try:
        return train_classification(request)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@app.post("/v1/train/regression", dependencies=[Depends(require_internal_token)])
def train_regression_endpoint(request: RegressionTrainRequest):
    try:
        return train_regression(request)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@app.post("/v1/forecast/seasonal-naive", dependencies=[Depends(require_internal_token)])
def forecast_baseline_endpoint(request: ForecastRequest):
    try:
        return seasonal_naive_forecast(request)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@app.post("/v1/forecast/chronos-2", dependencies=[Depends(require_internal_token)])
def forecast_chronos_endpoint(request: ForecastRequest):
    try:
        return chronos2_forecast(request)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@app.post("/v1/causal/forest-dml", dependencies=[Depends(require_internal_token)])
def causal_forest_endpoint(request: CausalForestRequest):
    try:
        return causal_forest_estimate(request)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@app.post("/v1/mmm/meridian", dependencies=[Depends(require_internal_token)])
def meridian_endpoint(request: MeridianFitRequest):
    try:
        return fit_meridian(request)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@app.post("/v1/anomalies/isolation-forest", dependencies=[Depends(require_internal_token)])
def anomaly_endpoint(request: AnomalyRequest):
    try:
        return anomaly_detection(request)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@app.post("/v1/segments/hdbscan", dependencies=[Depends(require_internal_token)])
def segmentation_endpoint(request: SegmentationRequest):
    try:
        return behavioral_segments(request)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@app.post("/v1/rank/lgbm", dependencies=[Depends(require_internal_token)])
def ranker_endpoint(request: RankingTrainRequest):
    try:
        return train_ranker(request)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
