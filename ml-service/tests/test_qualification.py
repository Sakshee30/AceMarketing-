import pytest

from acemarketing_ml.contracts import ForecastCandidate, ForecastQualificationRequest
from acemarketing_ml.qualification import evaluate_forecast_candidates


def test_forecast_qualification_preserves_baseline_when_candidate_fails_gate():
    request = ForecastQualificationRequest(
        actual=[10.0, 12.0, 11.0, 13.0],
        candidates=[
            ForecastCandidate(name="seasonal", kind="baseline", point=[10.0, 11.0, 10.0, 12.0]),
            ForecastCandidate(name="candidate", kind="model", point=[9.0, 10.0, 9.0, 10.0]),
        ],
        baseline_name="seasonal",
        minimum_relative_mae_improvement=0.10,
    )
    result = evaluate_forecast_candidates(request)
    assert result["selectedForReview"] == "seasonal"
    assert result["promotion"]["approved"] is False


def test_forecast_qualification_selects_better_candidate_for_review_only():
    request = ForecastQualificationRequest(
        actual=[10.0, 12.0, 11.0, 13.0],
        candidates=[
            ForecastCandidate(name="seasonal", kind="baseline", point=[8.0, 10.0, 9.0, 11.0]),
            ForecastCandidate(
                name="chronos",
                kind="model",
                point=[10.0, 12.0, 11.0, 13.0],
                lower=[9.0, 11.0, 10.0, 12.0],
                upper=[11.0, 13.0, 12.0, 14.0],
                nominal_coverage=0.80,
                quantiles={"0.1": [9.0, 11.0, 10.0, 12.0], "0.9": [11.0, 13.0, 12.0, 14.0]},
            ),
        ],
        baseline_name="seasonal",
        minimum_relative_mae_improvement=0.10,
        coverage_tolerance=0.25,
    )
    result = evaluate_forecast_candidates(request)
    assert result["selectedForReview"] == "chronos"
    assert result["promotion"]["approved"] is False
    item = next(item for item in result["candidateEvaluations"] if item["name"] == "chronos")
    assert item["passesPredeclaredGate"] is True
    assert item["metrics"]["intervalCoverage"] == 1.0


def test_forecast_qualification_rejects_inverted_intervals():
    request = ForecastQualificationRequest(
        actual=[1.0, 2.0, 3.0, 4.0],
        candidates=[
            ForecastCandidate(name="baseline", kind="baseline", point=[1.0, 2.0, 3.0, 4.0]),
            ForecastCandidate(
                name="candidate",
                kind="model",
                point=[1.0, 2.0, 3.0, 4.0],
                lower=[2.0, 2.0, 3.0, 4.0],
                upper=[1.0, 3.0, 4.0, 5.0],
            ),
        ],
        baseline_name="baseline",
    )
    with pytest.raises(ValueError, match="inverted interval"):
        evaluate_forecast_candidates(request)


def test_forecast_qualification_reports_zero_actuals_without_dividing_by_zero():
    request = ForecastQualificationRequest(
        actual=[0.0, 2.0, 0.0, 4.0],
        candidates=[
            ForecastCandidate(name="baseline", kind="baseline", point=[0.0, 1.0, 0.0, 3.0]),
            ForecastCandidate(name="candidate", kind="model", point=[0.0, 2.0, 0.0, 4.0]),
        ],
        baseline_name="baseline",
    )
    result = evaluate_forecast_candidates(request)
    item = next(item for item in result["candidateEvaluations"] if item["name"] == "candidate")
    assert item["metrics"]["zeroActualCount"] == 2
    assert item["metrics"]["mapeNonZeroOnly"] == 0.0
