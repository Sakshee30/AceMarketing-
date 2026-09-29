from __future__ import annotations

import math
from typing import Any


def _mean(values: list[float]) -> float:
    if not values:
        raise ValueError("metric requires at least one value")
    return float(sum(values) / len(values))


def _pinball(actual: float, predicted: float, quantile: float) -> float:
    error = actual - predicted
    return float(max(quantile * error, (quantile - 1.0) * error))


def evaluate_forecast_candidates(request) -> dict[str, Any]:
    actual = [float(value) for value in request.actual]
    if len(actual) < 4:
        raise ValueError("forecast qualification requires at least four untouched evaluation observations")

    evaluations = []
    by_name = {}
    for candidate in request.candidates:
        point = [float(value) for value in candidate.point]
        if len(point) != len(actual):
            raise ValueError(f"candidate {candidate.name} point forecast length does not match actuals")

        errors = [predicted - observed for predicted, observed in zip(point, actual, strict=True)]
        absolute = [abs(value) for value in errors]
        squared = [value * value for value in errors]
        nonzero = [(observed, predicted) for observed, predicted in zip(actual, point, strict=True) if observed != 0]
        mape = None
        if nonzero:
            mape = 100.0 * _mean([abs((observed - predicted) / observed) for observed, predicted in nonzero])

        coverage = None
        interval_width = None
        interval_loss = None
        if candidate.lower is not None or candidate.upper is not None:
            if candidate.lower is None or candidate.upper is None:
                raise ValueError(f"candidate {candidate.name} must supply both lower and upper intervals")
            lower = [float(value) for value in candidate.lower]
            upper = [float(value) for value in candidate.upper]
            if len(lower) != len(actual) or len(upper) != len(actual):
                raise ValueError(f"candidate {candidate.name} interval lengths do not match actuals")
            if any(lo > hi for lo, hi in zip(lower, upper, strict=True)):
                raise ValueError(f"candidate {candidate.name} contains an inverted interval")
            covered = [1.0 if lo <= obs <= hi else 0.0 for lo, obs, hi in zip(lower, actual, upper, strict=True)]
            coverage = _mean(covered)
            interval_width = _mean([hi - lo for lo, hi in zip(lower, upper, strict=True)])
            alpha = max(1e-6, 1.0 - float(candidate.nominal_coverage))
            winkler = []
            for lo, obs, hi in zip(lower, actual, upper, strict=True):
                score = hi - lo
                if obs < lo:
                    score += (2.0 / alpha) * (lo - obs)
                elif obs > hi:
                    score += (2.0 / alpha) * (obs - hi)
                winkler.append(score)
            interval_loss = _mean(winkler)

        quantile_loss = None
        if candidate.quantiles:
            losses = []
            for key, values in candidate.quantiles.items():
                q = float(key)
                if not 0.0 < q < 1.0:
                    raise ValueError(f"candidate {candidate.name} has invalid quantile {key}")
                predicted_values = [float(value) for value in values]
                if len(predicted_values) != len(actual):
                    raise ValueError(f"candidate {candidate.name} quantile {key} length does not match actuals")
                losses.extend(_pinball(obs, pred, q) for obs, pred in zip(actual, predicted_values, strict=True))
            quantile_loss = _mean(losses)

        metrics = {
            "mae": _mean(absolute),
            "rmse": math.sqrt(_mean(squared)),
            "bias": _mean(errors),
            "mapeNonZeroOnly": mape,
            "zeroActualCount": sum(1 for value in actual if value == 0),
            "intervalCoverage": coverage,
            "intervalMeanWidth": interval_width,
            "intervalLoss": interval_loss,
            "quantileLoss": quantile_loss,
            "sampleSize": len(actual),
        }
        item = {
            "name": candidate.name,
            "kind": candidate.kind,
            "metrics": metrics,
            "nominalCoverage": candidate.nominal_coverage if coverage is not None else None,
        }
        evaluations.append(item)
        by_name[candidate.name] = item

    baseline = by_name.get(request.baseline_name)
    if baseline is None:
        raise ValueError("baseline candidate is missing")

    eligible = []
    baseline_mae = float(baseline["metrics"]["mae"])
    for item in evaluations:
        if item["name"] == request.baseline_name:
            continue
        mae = float(item["metrics"]["mae"])
        improvement = (baseline_mae - mae) / baseline_mae if baseline_mae > 0 else (1.0 if mae == 0 else -math.inf)
        coverage_ok = True
        coverage = item["metrics"]["intervalCoverage"]
        nominal = item["nominalCoverage"]
        if coverage is not None and nominal is not None:
            coverage_ok = abs(float(coverage) - float(nominal)) <= request.coverage_tolerance
        item["baselineRelativeMaeImprovement"] = improvement
        item["passesPredeclaredGate"] = bool(improvement >= request.minimum_relative_mae_improvement and coverage_ok)
        item["gateDetails"] = {
            "minimumRelativeMaeImprovement": request.minimum_relative_mae_improvement,
            "coverageTolerance": request.coverage_tolerance,
            "coverageOk": coverage_ok,
        }
        if item["passesPredeclaredGate"]:
            eligible.append(item)

    eligible.sort(key=lambda item: (item["metrics"]["mae"], item["metrics"]["rmse"]))
    selected = eligible[0]["name"] if eligible else request.baseline_name
    return {
        "task": "forecast_qualification",
        "status": "evaluated_not_promoted",
        "baseline": request.baseline_name,
        "selectedForReview": selected,
        "candidateEvaluations": evaluations,
        "finalEvaluationUntouched": True,
        "promotion": {
            "approved": False,
            "reason": "Qualification evidence can support a human promotion decision but never promotes a model automatically.",
        },
    }
