import contextlib
import io
import json
import tempfile
import unittest
import uuid
from datetime import date, datetime, timezone
from pathlib import Path
from unittest.mock import Mock, patch
from types import SimpleNamespace
import ace_feed as feed
from verify_year_continuity import compare
from year_feed import YearFeed, shift_months, date_range, volume, atomic_json, parse_args, checkpoint_lock


class CalendarTests(unittest.TestCase):
    def test_calendar_months_preserve_end_of_month_and_leap_years(self):
        self.assertEqual(shift_months(date(2024, 5, 31), -3), date(2024, 2, 29))
        self.assertEqual(shift_months(date(2025, 5, 31), -3), date(2025, 2, 28))
        self.assertEqual(shift_months(date(2024, 2, 29), 12), date(2025, 2, 28))

    def test_full_year_contains_every_day_including_february_29(self):
        days = list(date_range(date(2024, 1, 1), date(2025, 1, 1)))
        self.assertEqual(len(days), 366)
        self.assertIn(date(2024, 2, 29), days)
        self.assertEqual(len(set(days)), len(days))

    def test_daily_volume_is_reproducible_and_covers_four_grades(self):
        for day in date_range(date(2025, 1, 1), date(2026, 1, 1)):
            self.assertGreaterEqual(volume(day, 4), 4)
            self.assertEqual(volume(day, 30), volume(day, 30))

    def test_completed_api_calls_are_not_sent_again_after_restart(self):
        with tempfile.TemporaryDirectory() as directory:
            runner = YearFeed.__new__(YearFeed)
            runner.directory = Path(directory)
            runner.current_journal = {}
            runner.original_api = Mock(return_value={'accepted': True, 'id': 'persisted_event'})
            body = {'id': 'event1', 'occurredAt': '2026-07-08T04:00:00Z'}
            first = runner.api('/track', body)
            runner.current_journal = json.loads((runner.directory / 'journey.json').read_text())
            self.assertEqual(runner.api('/track', body), first)
            runner.original_api.assert_called_once()
            self.assertTrue(runner.original_api.call_args.args[2]['idempotency-key'].startswith('year_'))

    def test_failed_call_is_not_marked_completed(self):
        with tempfile.TemporaryDirectory() as directory:
            runner = YearFeed.__new__(YearFeed)
            runner.directory = Path(directory)
            runner.current_journal = {}
            runner.original_api = Mock(side_effect=RuntimeError('connection lost'))
            with self.assertRaises(RuntimeError):
                runner.api('/track', {'id': 'event1'})
            self.assertEqual(runner.current_journal, {})

    def test_business_clock_does_not_change_real_clock(self):
        runner = YearFeed.__new__(YearFeed)
        runner.business_time = datetime(2025, 7, 8, 4, 0, tzinfo=timezone.utc)
        self.assertEqual(runner.iso(60000), '2025-07-08T04:01:00.000Z')
        runner.business_time = None
        observed = datetime.fromisoformat(runner.iso().replace('Z', '+00:00'))
        self.assertLess(abs((datetime.now(timezone.utc) - observed).total_seconds()), 1)

    def test_atomic_checkpoint_can_be_replaced_and_read(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'calendar.json'
            atomic_json(path, {'slot': 0})
            atomic_json(path, {'slot': 4})
            self.assertEqual(json.loads(path.read_text()), {'slot': 4})

    def test_invalid_volume_and_future_date_are_rejected(self):
        with contextlib.redirect_stderr(io.StringIO()), self.assertRaises(SystemExit):
            parse_args(['--customers-per-day', '0'])
        with contextlib.redirect_stderr(io.StringIO()), self.assertRaises(SystemExit):
            parse_args(['--start-date', '9999-01-01'])

    def test_checkpoint_directory_rejects_second_writer(self):
        with tempfile.TemporaryDirectory() as directory:
            first = checkpoint_lock(Path(directory))
            try:
                with self.assertRaises(RuntimeError):
                    checkpoint_lock(Path(directory))
            finally:
                first.close()
            checkpoint_lock(Path(directory)).close()

    def test_complete_feature_sweep_repeats_after_interval(self):
        runner = YearFeed.__new__(YearFeed)
        runner.args = SimpleNamespace(feature_interval=300)
        runner.calendar = {}
        self.assertTrue(runner.full_sweep_due())
        with patch('year_feed.time.time', return_value=1800000000):
            runner.calendar['fullFeatureSweepAt'] = datetime.fromtimestamp(1800000000-100, timezone.utc).isoformat()
            self.assertFalse(runner.full_sweep_due())
            runner.calendar['fullFeatureSweepAt'] = datetime.fromtimestamp(1800000000-301, timezone.utc).isoformat()
            self.assertTrue(runner.full_sweep_due())

    def test_default_live_loop_continues_until_stop_signal(self):
        runner = YearFeed.__new__(YearFeed)
        runner.args = SimpleNamespace(live_cycles=0, interval=.1, day_seconds=0)
        from year_feed import IST
        today = datetime.now(IST).date().isoformat()
        runner.calendar = {'seedEndExclusive':today,'nextDay':today,'slot':0,'customersCompleted':0,'anniversary':'2000-01-01'}
        def journey(*args, **kwargs):
            runner.calendar['slot'] += 1
            runner.calendar['customersCompleted'] += 1
            if runner.calendar['slot'] == 3:
                feed.stopping = True
            return {'id':'live_test_%d' % runner.calendar['slot']}
        runner.journey = Mock(side_effect=journey)
        runner.operations = Mock()
        runner.save = Mock()
        with patch.object(feed, 'stopping', False), patch.object(feed, 'sleep'), contextlib.redirect_stdout(io.StringIO()):
            runner.run()
        self.assertEqual(runner.journey.call_count, 3)
        self.assertEqual(runner.operations.call_count, 3)

    def test_nonfinite_timing_cannot_disable_continuous_processing(self):
        for option in ('--interval','--ai-interval','--feature-interval','--day-seconds'):
            with contextlib.redirect_stderr(io.StringIO()), self.assertRaises(SystemExit):
                parse_args([option,'nan'])

    def test_journey_retry_restores_business_counters(self):
        with tempfile.TemporaryDirectory() as directory:
            runner = YearFeed.__new__(YearFeed)
            runner.directory = Path(directory)
            runner.path = runner.directory / 'calendar.json'
            runner.calendar = {'runId':'test_retry','slot':0,'customersCompleted':0}
            runner.original_uuid = uuid
            state = {'counters':{'customers':0,'events':0,'purchases':0,'errors':0},'grades':{}}
            fail = [True]
            def start(*args):
                state['counters']['customers'] += 1
                return {'id':'customer_retry'}
            def advance(*args):
                state['counters']['events'] += 1
                if fail[0]:
                    fail[0] = False
                    raise RuntimeError('temporary API interruption')
            with patch.object(feed, 'STATE', state), patch.object(feed, 'people', []), patch.object(feed, 'RNG'), patch.object(feed, 'index', 0), patch.object(feed, 'start_customer', start), patch.object(feed, 'advance', advance):
                with self.assertRaises(RuntimeError):
                    runner.journey(date(2026, 1, 1), 0)
                runner.journey(date(2026, 1, 1), 0)
            self.assertEqual(state['counters']['customers'], 1)
            self.assertEqual(state['counters']['events'], 4)
            self.assertEqual(runner.calendar['customersCompleted'], 1)

    def test_continuity_requires_new_writes_sweep_and_verified_output(self):
        before = {'runId':'run1','updatedAt':'2026-10-08T00:00:00Z',
                  'counters':{'requests':10,'events':4},'calendar':{'customersCompleted':1,'fullFeatureSweeps':1},'features':{}}
        after = {'runId':'run1','updatedAt':'2026-10-08T00:01:00Z',
                 'counters':{'requests':20,'events':8},'calendar':{'customersCompleted':2,'fullFeatureSweeps':2},'features':{},
                 'latestPipelineProof':{'passed':True,'checkedAt':'2026-10-08T00:00:30Z'}}
        self.assertTrue(compare(before, after)['passed'])
        self.assertFalse(compare(before, before)['passed'])
        after['latestPipelineProof']['checkedAt'] = '2026-10-07T23:00:00Z'
        self.assertFalse(compare(before, after)['passed'])

    def test_continuity_does_not_treat_a_provider_block_as_success_or_failure(self):
        state = {'runId':'run1','updatedAt':'2026-10-08T00:00:00Z','counters':{},
                 'calendar':{'customersCompleted':1},'features':{'Delivery':{'checks':{'External provider':{'status':'blocked','detail':'Missing test credentials'}}}}}
        result = compare(state, state)
        self.assertEqual(len(result['blocked']), 1)
        self.assertEqual(result['failures'], [])
        self.assertFalse(result['passed'])


if __name__ == '__main__':
    unittest.main()
