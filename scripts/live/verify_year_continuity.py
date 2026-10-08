"""Observe the running daily feed and prove that processing continues across a full sweep."""
import argparse
import json
import math
import time
import urllib.request
from datetime import datetime, timezone
from pathlib import Path


def snapshot(base):
    deadline = time.monotonic() + 30
    while True:
        try:
            with urllib.request.urlopen(base + '/status', timeout=10) as response:
                return json.load(response)
        except (OSError, ValueError):
            if time.monotonic() >= deadline:
                raise
            time.sleep(1)


def compare(before, after):
    deltas = {key: after['counters'].get(key, 0) - value for key, value in before['counters'].items()}
    customers = after['calendar']['customersCompleted'] - before['calendar']['customersCompleted']
    sweeps = after['calendar'].get('fullFeatureSweeps', 0) - before['calendar'].get('fullFeatureSweeps', 0)
    activity = after.get('featureActivity', {})
    changed = {name: {key: values.get(key, 0) - before.get('featureActivity', {}).get(name, {}).get(key, 0)
                      for key in ('successfulWrites', 'successfulReads')}
               for name, values in activity.items()}
    proof = after.get('latestPipelineProof', {})
    checks = {
        'sameGeneratorRun': before['runId'] == after['runId'],
        'customersKeepIncreasing': customers > 0,
        'eventsKeepIncreasing': deltas.get('events', 0) > 0,
        'actualRequestsKeepIncreasing': deltas.get('requests', 0) > 0,
        'completeFeatureSweepRepeated': sweeps > 0,
        'newCustomerOutputVerified': proof.get('passed') is True and proof.get('checkedAt', '') > before['updatedAt'],
    }
    failures = [{'feature': name, 'check': title, 'detail': check.get('detail')}
                for name, feature in after['features'].items()
                for title, check in feature['checks'].items() if check.get('status') == 'fail']
    blocked = [{'feature': name, 'check': title, 'detail': check.get('detail')}
               for name, feature in after['features'].items()
               for title, check in feature['checks'].items() if check.get('status') == 'blocked']
    return {'passed': all(checks.values()) and not failures, 'checks': checks, 'counterDeltas': deltas,
            'completedCustomerDelta': customers, 'fullSweepDelta': sweeps, 'featureActivityDeltas': changed,
            'latestPipelineProof': proof, 'failures': failures, 'blocked': blocked}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--base', default='http://127.0.0.1:5174')
    parser.add_argument('--seconds', type=float, default=180, help='Maximum observation period; exits early once continuity is proven.')
    parser.add_argument('--output', default='artifacts/year-feed/continuity.json')
    args = parser.parse_args()
    if not math.isfinite(args.seconds) or args.seconds < 1 or args.seconds > 3600:
        parser.error('--seconds must be between 1 and 3600')
    before = snapshot(args.base)
    print('[continuity] Watching customers, events, feature sweeps and persisted output.', flush=True)
    deadline = time.monotonic() + args.seconds
    while True:
        time.sleep(2)
        after = snapshot(args.base)
        result = compare(before, after)
        if result['passed'] or time.monotonic() >= deadline:
            break
    result.update(startedAt=before['updatedAt'], finishedAt=after['updatedAt'], checkedAt=datetime.now(timezone.utc).isoformat(), runId=after['runId'])
    target = Path(args.output)
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps(result, indent=2), encoding='utf-8')
    print(json.dumps({key: result[key] for key in ('passed','checks','counterDeltas','completedCustomerDelta','fullSweepDelta')}, indent=2), flush=True)
    print('[continuity] Evidence: %s' % target)
    return 0 if result['passed'] else 1


if __name__ == '__main__':
    raise SystemExit(main())
