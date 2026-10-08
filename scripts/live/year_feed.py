#!/usr/bin/env python3
"""Three calendar months of historical journeys, followed by continuous daily activity.

Standard library only. Run against the local live stack; use --help for replay mode.
Business timestamps can be historical; HTTP signatures and operational logs stay real.
"""
import argparse
import calendar
import hashlib
import json
import math
import os
import random
import signal
import threading
import time
import uuid
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from types import SimpleNamespace
from http.server import ThreadingHTTPServer

import ace_feed as feed

IST = timezone(timedelta(hours=5, minutes=30))


class YearDashboard(feed.Dashboard):
    def do_GET(self):
        route = self.path.split('?')[0]
        if route not in ('/', '/calendar'):
            return super().do_GET()
        body = (feed.ROOT / 'scripts/live/year-status.html').read_bytes() if route == '/' else json.dumps(feed.STATE['calendar']).encode()
        self.send_response(200)
        self.send_header('Content-Type', 'text/html; charset=utf-8' if route == '/' else 'application/json')
        self.send_header('Cache-Control', 'no-store')
        self.end_headers()
        self.wfile.write(body)


def shift_months(day, months):
    month = day.year * 12 + day.month - 1 + months
    year, month = divmod(month, 12)
    return date(year, month + 1, min(day.day, calendar.monthrange(year, month + 1)[1]))


def date_range(start, end):
    while start < end:
        yield start
        start += timedelta(days=1)


def volume(day, base):
    """Weekends, seasonal demand and deterministic variation; at least all four grades."""
    factor = (0.75 if day.weekday() >= 5 else 1.0) * (1 + .18 * math.sin(day.timetuple().tm_yday * 2 * math.pi / 365.25))
    return max(4, round(base * factor * random.Random(day.isoformat()).uniform(.9, 1.1)))


def atomic_json(path, value):
    temporary = path.with_suffix('.tmp')
    temporary.write_text(json.dumps(value, ensure_ascii=False, indent=1), encoding='utf-8')
    temporary.replace(path)


def checkpoint_lock(directory):
    """OS lock releases even after a killed process; different ports cannot share state."""
    handle = (directory / 'runner.lock').open('a+b')
    if handle.tell() == 0:
        handle.write(b'0')
        handle.flush()
    handle.seek(0)
    try:
        if os.name == 'nt':
            import msvcrt
            msvcrt.locking(handle.fileno(), msvcrt.LK_NBLCK, 1)
        else:
            import fcntl
            fcntl.flock(handle.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
    except OSError:
        handle.close()
        raise RuntimeError('Another daily feed owns this checkpoint directory. Stop it or choose another --output.')
    return handle


class YearFeed:
    def __init__(self, args):
        self.args = args
        self.directory = Path(args.output).resolve()
        self.directory.mkdir(parents=True, exist_ok=True)
        self.path = self.directory / 'calendar.json'
        today = datetime.now(IST).date()
        start = date.fromisoformat(args.start_date) if args.start_date else shift_months(today, -12)
        saved = feed.load_json(self.path)
        if saved and saved.get('workspaceId') != feed.WORKSPACE:
            raise ValueError('Checkpoint belongs to a different workspace; choose another --output directory.')
        if saved and args.start_date and saved['startDate'] != args.start_date:
            raise ValueError('Start date differs from checkpoint; choose another --output directory.')
        self.calendar = saved or {
            'workspaceId': feed.WORKSPACE, 'runId': 'year_' + uuid.uuid4().hex[:12],
            'startDate': start.isoformat(), 'seedEndExclusive': min(shift_months(start, args.history_months), today).isoformat(),
            'anniversary': shift_months(start, 12).isoformat(), 'nextDay': start.isoformat(),
            'slot': 0, 'daysCompleted': 0, 'customersCompleted': 0, 'days': [], 'phase': 'bootstrap',
        }
        self.business_time = None
        self.current_journal = None
        self.original_api = feed.api
        self.original_iso = feed.iso
        self.original_customer = feed.customer
        self.original_log = feed.log
        self.original_uuid = feed.uuid
        feed.DIRECTORY = feed.REPORT_DIR = self.directory
        feed.RUN_ID = self.calendar['runId']
        feed.STATE.update(generator='year_feed.py', mode='daily', runId=feed.RUN_ID, calendar=self.calendar, intervalMs=int(args.interval * 1000))
        previous = feed.load_json(self.directory / 'status.json')
        if previous and previous.get('generator') == 'year_feed.py' and previous.get('workspaceId') == feed.WORKSPACE:
            feed.STATE['counters'].update(previous.get('counters', {}))
            feed.STATE['grades'].update(previous.get('grades', {}))
            for name, feature in previous.get('features', {}).items():
                if name in feed.STATE['features']:
                    feed.STATE['features'][name] = feature
            feed.artifacts.update(previous.get('artifacts', []))
            feed.STATE['jobs'] = previous.get('jobs', [])
            for job in feed.STATE['jobs']:
                if job.get('status') in ('pending', 'leased', 'retry', 'queued', 'running'):
                    feed.pending[job['id']] = dict(job)
        feed.iso = self.iso
        feed.customer = self.customer
        def api_proxy(*args, **kwargs):
            return self.api(*args, **kwargs)
        api_proxy.last_status = 0
        feed.api = api_proxy
        feed.log = self.log
        self.last_features = self.last_ai = self.last_save = 0

    def iso(self, offset_ms=0):
        now = self.business_time or datetime.now(timezone.utc)
        return (now + timedelta(milliseconds=offset_ms)).isoformat(timespec='milliseconds').replace('+00:00', 'Z')

    def customer(self, index, band=None):
        person = self.original_customer(index, band)
        now = self.business_time or datetime.now(timezone.utc)
        person['createdAt'] = int(now.timestamp() * 1000)
        person['campaign'] = person['campaign'].rsplit('_', 1)[0] + '_' + now.strftime('%b%y').lower()
        return person

    def log(self, entry):
        def redact(value):
            if isinstance(value, dict):
                return {key: '[redacted]' if key.lower().replace('_', '') in ('password','secret','token','accesstoken','refreshtoken','apikey','authorization','signingsecret') or (key == 'key' and isinstance(item, str)) else redact(item) for key, item in value.items()}
            if isinstance(value, list):
                return [redact(item) for item in value]
            return value
        entry = redact(entry)
        entry['at'] = self.original_iso()
        entry['businessDate'] = (self.business_time or datetime.now(IST)).astimezone(IST).date().isoformat()
        self.original_log(entry)
        if time.monotonic() - self.last_save > 2:
            self.last_save = time.monotonic()
            self.save()

    def api(self, path, body=None, extra=None, **kwargs):
        # Successful journey calls are journaled before advancing the checkpoint.
        # A restart replays the same identities/payloads and skips confirmed writes.
        if self.current_journal is None:
            return self.original_api(path, body, extra, **kwargs)
        key = hashlib.sha256(json.dumps([path, body, kwargs], sort_keys=True).encode()).hexdigest()
        if key in self.current_journal:
            return self.current_journal[key]
        result = self.original_api(path, body, {**(extra or {}), 'idempotency-key': 'year_' + key}, **kwargs)
        self.current_journal[key] = result
        atomic_json(self.directory / 'journey.json', self.current_journal)
        return result

    def save(self):
        feed.STATE['featureActivity'] = {
            name: {
                'successfulWrites': sum(max(0, check.get('count', 0) - check.get('failures', 0)) for check in feature['checks'].values() if check.get('kind') == 'write'),
                'successfulReads': sum(max(0, check.get('count', 0) - check.get('failures', 0)) for check in feature['checks'].values() if check.get('kind') == 'read'),
                'failedChecks': sum(check.get('status') == 'fail' for check in feature['checks'].values()),
                'lastCheckedAt': max((check.get('at', '') for check in feature['checks'].values()), default=None),
            } for name, feature in feed.STATE['features'].items()
        }
        atomic_json(self.path, self.calendar)
        clock = self.business_time
        self.business_time = None
        try:
            feed.persist()
        finally:
            self.business_time = clock

    def journey(self, day, slot, live=False):
        reference = '%s_%s_%d' % (self.calendar['runId'], day.isoformat(), slot)
        journal_path = self.directory / 'journey.json'
        self.current_journal = feed.load_json(journal_path) or {}
        # Stable randomness and UUIDs make an interrupted customer's retry reproducible.
        counter = 0
        def stable_uuid():
            nonlocal counter
            counter += 1
            return uuid.uuid5(uuid.NAMESPACE_URL, reference + ':' + str(counter))
        feed.uuid = SimpleNamespace(uuid4=stable_uuid)
        feed.RNG = random.Random(reference)
        feed.index = int(day.strftime('%Y%m%d')) * 100000 + slot
        active = self.calendar.get('activeJourney', {})
        start = datetime.fromisoformat(active['start']) if active.get('reference') == reference else datetime.now(timezone.utc) if live else datetime.combine(day, datetime.min.time(), IST).astimezone(timezone.utc) + timedelta(hours=9, seconds=(slot * 13) % 36000)
        business_keys = ('customers', 'events', 'purchases')
        if active.get('reference') == reference and active.get('businessCounters'):
            feed.STATE['counters'].update(active['businessCounters'])
            feed.STATE['grades'].clear()
            feed.STATE['grades'].update(active.get('grades', {}))
        self.calendar['activeJourney'] = {'reference': reference, 'start': start.isoformat(),
            'businessCounters': {key: feed.STATE['counters'][key] for key in business_keys}, 'grades': dict(feed.STATE['grades'])}
        atomic_json(self.path, self.calendar)
        self.business_time = start
        before_errors = feed.STATE['counters']['errors']
        try:
            person = feed.start_customer(slot % 4 if slot < 4 else None)
            for phase in range(4):
                self.business_time = start + (timedelta(minutes=(phase + 1) * 12) if not live else timedelta(milliseconds=phase + 1))
                feed.advance(person, True)
            if feed.STATE['counters']['errors'] > before_errors:
                raise RuntimeError('A journey API failed; retaining its journal for retry.')
            self.calendar['slot'] += 1
            self.calendar['customersCompleted'] += 1
            self.calendar['latestCustomerId'] = person['id']
            self.calendar.pop('activeJourney', None)
            atomic_json(self.path, self.calendar)
            journal_path.unlink(missing_ok=True)
            self.last_person = person
            return person
        finally:
            self.current_journal = None
            self.business_time = None
            feed.uuid = self.original_uuid
            del feed.people[:-100]

    def day(self, day):
        target = volume(day, self.args.customers_per_day)
        self.calendar.update(phase='bootstrap' if day < date.fromisoformat(self.calendar['seedEndExclusive']) else 'replay', currentDay=day.isoformat(), targetCustomers=target)
        while self.calendar['slot'] < target and not feed.stopping:
            self.journey(day, self.calendar['slot'])
            self.save()
        if feed.stopping:
            return
        self.calendar['days'].append({'date': day.isoformat(), 'customers': self.calendar['slot']})
        self.calendar['days'] = self.calendar['days'][-400:]
        self.calendar['daysCompleted'] += 1
        self.calendar.update(nextDay=(day + timedelta(days=1)).isoformat(), slot=0)
        self.save()
        print('[year feed] %s complete: %d customers; %d days persisted' % (day, target, self.calendar['daysCompleted']), flush=True)
        # Keep all operational panels moving during the historical replay too.
        if getattr(self, 'last_person', None):
            self.operations(self.last_person)

    def full_sweep_due(self):
        last = self.calendar.get('fullFeatureSweepAt')
        if not last:
            return True
        return time.time() - datetime.fromisoformat(last.replace('Z', '+00:00')).timestamp() >= self.args.feature_interval

    def operations(self, person, full=False):
        # Configuration, jobs and provider authentication use actual wall time.
        full = full or self.full_sweep_due()
        feed.STATE['counters']['cycles'] += 1
        feed.feature_writes(person, full=full)
        feed.step('Follow-ups', 'Work the follow-up queue', feed.work_follow_up_queue)
        if full:
            feed.step('Approvals', 'Raise and decide agent approvals', feed.approvals_flow)
            self.verify_output(person)
        feed.poll_jobs()
        if time.monotonic() - self.last_ai >= self.args.ai_interval:
            feed.ai_cycle()
            self.last_ai = time.monotonic()
        feed.read_sweep(len(feed.READS) if full else 8)
        if full:
            self.calendar['fullFeatureSweepAt'] = self.original_iso()
            self.calendar['fullFeatureSweeps'] = self.calendar.get('fullFeatureSweeps', 0) + 1
        self.save()

    def verify_output(self, person):
        """Confirm the actual customer is retrievable; aggregate reads alone do not prove this."""
        def verify():
            import urllib.parse
            path = '/customer-360?id=' + urllib.parse.quote(person['id'])
            output = feed.api(path)
            found = person['id'] in json.dumps(output)
            feed.check('Customer 360', 'Recurring customer input reaches persisted output', found, 'Customer %s retrieved from %s' % (person['id'], path))
            feed.STATE['latestPipelineProof'] = {'checkedAt': self.original_iso(), 'customerId': person['id'], 'outputEndpoint': path, 'passed': found}
        feed.step('Customer 360', 'Recurring customer input reaches persisted output', verify, 'assert')

    def run(self):
        seed_end = date.fromisoformat(self.calendar['seedEndExclusive'])
        while not feed.stopping:
            day = date.fromisoformat(self.calendar['nextDay'])
            today = datetime.now(IST).date()
            if day < seed_end or day < today:
                self.day(day)
                if day >= seed_end and self.args.day_seconds:
                    feed.sleep(self.args.day_seconds)
                continue
            self.calendar.update(phase='live', currentDay=today.isoformat())
            if day != today:
                self.calendar.update(nextDay=today.isoformat(), slot=0)
            person = self.journey(today, self.calendar['slot'], live=True)
            self.operations(person)
            self.save()
            print('[year feed] LIVE %s customer=%s total=%d' % (today, person['id'], self.calendar['customersCompleted']), flush=True)
            if self.args.live_cycles:
                self.args.live_cycles -= 1
                if not self.args.live_cycles:
                    break
            feed.sleep(self.args.interval)


def parse_args(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--history-months', type=int, default=3)
    parser.add_argument('--start-date', help='Past YYYY-MM-DD; default is one calendar year ago. Seed first 3 months, replay daily up to today, then stay live.')
    parser.add_argument('--customers-per-day', type=int, default=8, help='Historical daily baseline (minimum 4 to cover grades A-D).')
    parser.add_argument('--day-seconds', type=float, default=0, help='Delay between replay days after the initial seed; never writes future events.')
    parser.add_argument('--interval', type=float, default=5, help='Seconds between live journeys after processing finishes.')
    parser.add_argument('--ai-interval', type=float, default=300)
    parser.add_argument('--feature-interval', type=float, default=300, help='Seconds between complete feature write/read sweeps; smaller scenario batches still run every cycle.')
    parser.add_argument('--live-cycles', type=int, default=0, help='0 runs continuously; positive number is a bounded smoke run.')
    parser.add_argument('--port', type=int, default=5174)
    parser.add_argument('--output', default='.tmp-tools/year-feed')
    args = parser.parse_args(argv)
    if not all(math.isfinite(value) for value in (args.interval, args.day_seconds, args.ai_interval, args.feature_interval)) or not 1 <= args.history_months <= 12 or args.customers_per_day < 4 or args.customers_per_day > 10000 or args.interval < .1 or args.day_seconds < 0 or args.ai_interval < 1 or args.feature_interval < 1 or args.live_cycles < 0 or not 1 <= args.port <= 65535:
        parser.error('Use 1-12 history months, 4-10000 customers/day, interval >=0.1, nonnegative replay delay/cycles, positive AI interval and a valid port.')
    if args.start_date:
        try:
            start = date.fromisoformat(args.start_date)
        except ValueError:
            parser.error('--start-date must be YYYY-MM-DD')
        if start > datetime.now(IST).date():
            parser.error('--start-date must not be in the future')
    return args


def main(argv=None):
    args = parse_args(argv)
    runner = YearFeed(args)
    lock = checkpoint_lock(runner.directory)
    # Fail before making writes if another feed already owns the dashboard port.
    try:
        server = ThreadingHTTPServer(('127.0.0.1', args.port), YearDashboard)
    except OSError:
        lock.close()
        raise RuntimeError('Dashboard port %d is already occupied; stop the other feed or choose --port.' % args.port)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    signal.signal(signal.SIGINT, feed.halt)
    signal.signal(signal.SIGTERM, feed.halt)
    runner.save()
    print('[year feed] Dashboard http://127.0.0.1:%d | application http://127.0.0.1:5173 | seed %s to %s (exclusive)' % (args.port, runner.calendar['startDate'], runner.calendar['seedEndExclusive']), flush=True)
    try:
        while not feed.stopping:
            try:
                feed.login()
                feed.setup()
                break
            except Exception as error:
                runner.calendar['lastError'] = {'at': runner.original_iso(), 'message': str(error)}
                runner.save()
                print('[year feed] Waiting for application: %s' % error, flush=True)
                feed.sleep(5)
        feed.read_sweep(len(feed.READS))
        while not feed.stopping:
            try:
                runner.run()
                break
            except Exception as error:
                runner.calendar['lastError'] = {'at': runner.original_iso(), 'message': str(error)}
                runner.save()
                print('[year feed] Retrying from checkpoint: %s' % error, flush=True)
                feed.sleep(5)
                try:
                    feed.login()
                except Exception as login_error:
                    print('[year feed] API still unavailable: %s' % login_error, flush=True)
                    feed.sleep(5)
    finally:
        runner.save()
        server.shutdown()
        lock.close()


if __name__ == '__main__':
    main()
