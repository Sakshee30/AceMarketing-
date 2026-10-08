#!/usr/bin/env python3
"""AceMarketing continuous synthetic data feed and feature-wise verifier.

Standard library only. Sends realistic synthetic customer journeys to the real
local APIs (no database inserts, no invented provider responses), runs forever
by default, and records a pass/fail/blocked result for every product feature.

  python scripts/live/ace_feed.py                      continuous feed + dashboard on :5174
  python scripts/live/ace_feed.py --verify --cycles=2  full end-to-end pass, writes a report
  python scripts/live/ace_feed.py --report-only        rebuild the report from saved results
"""
import hashlib, hmac, html, json, math, os, random, signal, sys, threading, time, uuid
import urllib.error, urllib.parse, urllib.request
from datetime import datetime, timedelta, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
os.chdir(ROOT)


def load_env(path):
    env = dict(os.environ)
    try:
        raw = Path(path).read_text(encoding='utf-8')
    except FileNotFoundError:
        return env
    for line in raw.splitlines():
        line = line.strip()
        if not line or line.startswith('#') or '=' not in line:
            continue
        key, value = line.split('=', 1)
        key, value = key.strip(), value.strip()
        if len(value) >= 2 and value[0] == value[-1] and value[0] in '"\'':
            value = value[1:-1]
        if not os.environ.get(key):
            env[key] = value
    return env


ENV = load_env('.env.live.local')
OPTIONS = {}
for arg in sys.argv[1:]:
    key, _, value = arg.lstrip('-').partition('=')
    OPTIONS[key] = value or 'true'
BASE = ENV.get('ACE_LOCAL_API', 'http://127.0.0.1:3001/api')
if urllib.parse.urlparse(BASE).hostname not in ('localhost', '127.0.0.1', '::1') or ENV.get('NODE_ENV') == 'production':
    sys.exit('The live generator only targets a local development API.')
VERIFY = 'verify' in OPTIONS
INTERVAL = float(OPTIONS.get('interval') or ENV.get('ACE_LIVE_INTERVAL_MS') or 3000) / 1000
CYCLES = int(OPTIONS.get('cycles') or 0)
AI_INTERVAL = float(ENV.get('ACE_LIVE_AI_INTERVAL_MS') or 60000) / 1000
WORKSPACE = ENV.get('DEFAULT_WORKSPACE_ID', 'ws_default')
RUN_ID = '%s_%s' % (format(int(time.time() * 1000), 'x'), uuid.uuid4().hex[:6])
DIRECTORY = Path('.tmp-tools/live/verification' if VERIFY else '.tmp-tools/live')
REPORT_DIR = Path(OPTIONS.get('report-dir') or DIRECTORY)
SITE_DOMAIN = '127.0.0.1'  # the Sites API requires a dotted host; tracked events carry the same value
RNG = random.Random(int(OPTIONS.get('seed') or ENV.get('ACE_LIVE_SEED') or time.time() * 1000))

# ---------------------------------------------------------------- reference data
FIRST = ('Aarav Vivaan Aditya Arjun Sai Reyansh Krishna Ishaan Rohan Kabir Vihaan Dhruv Karthik Rahul Nikhil Siddharth '
         'Varun Manish Sandeep Amit Pranav Tarun Harsh Yash Dev Ananya Diya Isha Meera Priya Kavya Riya Sneha Pooja Neha '
         'Aditi Shreya Tanvi Nandini Lakshmi Divya Anjali Swati Ritika Simran Zoya Farah Aisha Irfan Imran Joseph Maria '
         'Gurpreet Harleen Jasmeet Debjani Sourav Ipsita Tenzin Lalit').split()
LAST = ('Sharma Verma Gupta Mehta Shah Patel Desai Joshi Kulkarni Deshpande Iyer Nair Menon Pillai Rao Reddy Naidu Shetty '
        'Hegde Gowda Kapoor Khanna Malhotra Chopra Singh Gill Sandhu Bhatia Agarwal Bansal Jain Mittal Das Ghosh Banerjee '
        'Mukherjee Chatterjee Sen Bose Khan Sheikh Ansari Fernandes DSouza Thomas Mathew Yadav Chauhan Rathore Mishra').split()
CITIES = [('Mumbai', 'Maharashtra', '400001'), ('Pune', 'Maharashtra', '411001'), ('Delhi', 'Delhi', '110001'),
          ('Gurugram', 'Haryana', '122001'), ('Noida', 'Uttar Pradesh', '201301'), ('Bengaluru', 'Karnataka', '560001'),
          ('Hyderabad', 'Telangana', '500001'), ('Chennai', 'Tamil Nadu', '600001'), ('Kolkata', 'West Bengal', '700001'),
          ('Ahmedabad', 'Gujarat', '380001'), ('Jaipur', 'Rajasthan', '302001'), ('Lucknow', 'Uttar Pradesh', '226001'),
          ('Kochi', 'Kerala', '682001'), ('Indore', 'Madhya Pradesh', '452001'), ('Chandigarh', 'Chandigarh', '160017')]
PRODUCTS = [
    ('Education', 'Data Analytics certification', 24000, '/courses/data-analytics'),
    ('Education', 'Full-stack development bootcamp', 68000, '/courses/full-stack'),
    ('Education', 'Digital marketing diploma', 18500, '/courses/digital-marketing'),
    ('Home Services', 'Home interior consultation', 4500, '/services/interiors'),
    ('Home Services', 'Modular kitchen installation', 145000, '/services/modular-kitchen'),
    ('Retail', 'Premium leather accessory', 12900, '/shop/leather-accessories'),
    ('Retail', 'Smart home starter kit', 21999, '/shop/smart-home'),
    ('Healthcare', 'Executive health check-up', 7999, '/care/health-checkup'),
    ('Healthcare', 'Dental alignment plan', 54000, '/care/dental-aligners'),
    ('Real Estate', 'Site visit booking token', 51000, '/projects/skyline-residences'),
    ('Financial Services', 'Term insurance plan (annual)', 16800, '/insurance/term-plan'),
]
# (source, medium, weight, objective labels)
CHANNELS = [('google', 'cpc', 30, ('search_brand', 'search_generic', 'pmax')), ('meta', 'cpc', 26, ('leadgen', 'retargeting', 'lookalike')),
            ('organic', 'organic', 14, ('seo',)), ('email', 'email', 9, ('newsletter', 'winback')),
            ('direct', 'none', 9, ('direct',)), ('whatsapp', 'social', 6, ('ctwa',)), ('referral', 'referral', 6, ('partner',))]
DEVICES = [('mobile', 'Android', 'Chrome Mobile', 46), ('mobile', 'iOS', 'Safari Mobile', 22), ('desktop', 'Windows', 'Chrome', 20),
           ('desktop', 'macOS', 'Safari', 7), ('tablet', 'iPadOS', 'Safari Mobile', 5)]
# Lead-quality mix. Grades are still computed by the backend from the evidence below.
INTENT_BANDS = [((0.02, 0.24), 30), ((0.25, 0.49), 30), ((0.50, 0.74), 22), ((0.75, 0.98), 18)]
BAND_GRADE = {0: 'D', 1: 'C', 2: 'B', 3: 'A'}

SECTIONS = [
    ('Workspace', [('Overview', ['/dashboard-summary', '/live-sync', '/workspace/overview']), ('Launchpad', ['/launchpad']), ('Boards', ['/boards'])]),
    ('Tracking & Data', [
        ('AdSync', ['/events', '/signal-deliveries']), ('ChatGPT Ads', ['/chatgpt-ads']), ('Funnel', ['/funnel']),
        ('Leak Monitor', ['/leak-monitor']), ('Events', ['/events', '/event-templates']), ('Adjustments', ['/adjustments']),
        ('Diagnostics', ['/diagnostics']), ('Match Quality', ['/match-quality']), ('Reconciliation', ['/reconciliation']),
        ('Fraud', ['/fraud']), ('Deep Links', ['/deep-links']), ('Sites', ['/sites', '/sites/debug?domain=127.0.0.1']),
        ('Fingerprinting', ['/fingerprinting', '/fingerprinting/matches']), ('Live Sync', ['/live-sync', '/monitoring-rules']),
        ('Data Hub', ['/data-hub']), ('Customer 360', ['/customer-360']),
        ('Offline Attribution', ['/offline-attribution', '/ctwa-attribution']), ('Matchback', ['/matchback', '/matchback/unmatched']),
        ('POS & Stores', ['/pos-stores'])]),
    ('Measurement & Intelligence', [
        ('Journeys', ['/journeys']), ('Identity', ['/identity']), ('Models', ['/models', '/models/validation']),
        ('AI Intelligence', ['/ai/registry', '/ai/ml/capabilities', '/ai/monitoring', '/ai/results', '/ai/evaluations', '/ai/forecast-records',
                             '/ai/anomalies', '/ai/segments', '/ai/rankings', '/ai/task-policies', '/ai/metrics/catalog', '/ai/datasets',
                             '/ai/knowledge', '/ai/transcripts', '/ai/creative-assets', '/ai/activation-proposals', '/ai/deployment-controls',
                             '/ai/causal-records', '/ai/marketing-mix-records', '/ai/evaluation-policy?task=lead_qualification', '/ai/analyst/tools', '/ai-action']),
        ('Attribution', ['/attribution', '/attribution-identity/stats']), ('Planner', ['/planner']),
        ('Reports', ['/reports', '/cohorts?months=6', '/report-schedules']),
        ('Grouped Performance', ['/grouped-performance?dimension=category&months=6', '/grouped-performance?dimension=source&months=6']),
        ('Executive Briefs', ['/cohorts?months=6', '/report-schedules'])]),
    ('Lead & Conversion', [
        ('Enrich', ['/enrich']), ('Lead Grading', ['/lead-grading']), ('Behavior', ['/behavior']), ('Feed', ['/feed']),
        ('Agents', ['/agents', '/agent-runs']), ('Routing', ['/routing']),
        ('Follow-ups', ['/follow-ups', '/lead-reactivation?dormantDays=30&recentDays=7']),
        ('Calls', ['/call-events', '/qualification-calls']), ('Meetings', ['/meetings', '/voice-scheduler']),
        ('Feedback', ['/feedback']), ('Approvals', ['/approvals']), ('Ask Ace', [])]),
    ('Activation & Integrations', [
        ('Integrations', ['/integrations', '/custom-integrations', '/integrations/sync-schedules', '/integrations/sync-runs',
                          '/integrations/data-summary', '/webhook-subscriptions', '/webhook-deliveries', '/whatsapp/messages']),
        ('Data Flows', ['/integration-flows']), ('Real-Time Activation', ['/activation-rules', '/activation-runs']),
        ('Personalization', ['/personalization-rules']), ('Exclusions', ['/exclusions']),
        ('Audiences', ['/audiences', '/audience-schedules']), ('Delivery', ['/connector-health', '/signal-deliveries', '/signal-console'])]),
    ('Operations & Developer', [
        ('Monitoring', ['/monitoring', '/monitoring-rules']), ('Alerts', ['/alerts']),
        ('Compliance', ['/compliance-center', '/consent/stats', '/privacy/requests', '/security-posture']),
        ('Developers', ['/api-keys', '/webhooks/endpoints', '/webhooks/deliveries', '/audit-log']),
        ('Settings', ['/settings', '/members', '/billing/usage', '/billing/subscription', '/workspaces', '/auth/me'])]),
    ('Platform (no dedicated tab)', [
        ('Public website', ['/public/navigation', '/public/industries', '/public/agents', '/public/integrations', '/public/challenges',
                            '/public/case-studies', '/public/resources', '/public/resource-center', '/solutions', '/resources',
                            '/case-studies', '/source-notes']),
        ('Forms & custom objects', ['/forms', '/custom-objects', '/files', '/search?q=analytics']),
        ('Policies & workflows', ['/policy-rules', '/workflows', '/workflows/actions', '/workflows/executions', '/workflows/approvals']),
        ('Authentication & security', ['/health', '/ready']), ('Local ML pipelines', [])]),
]
# Capabilities that need real third-party test accounts. They are reported, never faked.
BLOCKED = {
    'AdSync': ('External ad-platform delivery', 'Google/Meta test credentials and destination IDs required; local event rules and tracking are exercised.'),
    'ChatGPT Ads': ('Send to ChatGPT Ads', 'Provider credentials required; local payload validation is exercised.'),
    'Delivery': ('Signal dispatch to destinations', 'Connected ad/CRM destination required; delivery queue reads are exercised.'),
    'Audiences': ('Audience sync to ad platforms', 'Connected Google/Meta account required; local materialization is exercised.'),
    'Exclusions': ('Exclusion sync to ad platforms', 'Connected Google/Meta account required; local exclusion audiences are created.'),
    'Integrations': ('OAuth connector connections', 'Real provider OAuth apps and test accounts required.'),
    'Calls': ('Outbound and live voice calls', 'Telephony/voice provider credentials required; signed inbound call webhooks are exercised.'),
    'Meetings': ('Calendar synchronisation', 'Calendar provider credentials required; local meeting records are exercised.'),
    'Reports': ('Scheduled report e-mail', 'SMTP test credentials required; report reads and schedules are exercised.'),
    'Executive Briefs': ('Brief e-mail delivery', 'SMTP test credentials required.'),
    'Settings': ('Billing checkout and portal', 'Stripe test credentials and signed webhooks required; usage and subscription reads are exercised.'),
    'Boards': ('Board card ingestion', 'Boards can be created and read; the backend has no public card-creation API.'),
    'Policies & workflows': ('Workflow step processing', 'Publish/start/cancel are exercised; the worker does not advance durable workflow steps.'),
    'Forms & custom objects': ('File upload and document extraction', 'Object-store credentials and scanner required.'),
    'AI Intelligence': ('Hosted AI routes other than the analyst (reviewer, extraction, embeddings, reranking, transcription, live voice, creative image)',
                        'Anthropic, Google and Voyage API keys are required; the analyst and local ML routes are exercised.'),
    'Enrich': ('CRM writeback delivery', 'Connected CRM required; the writeback request is queued and reported, not delivered.'),
}


def iso(offset_ms=0):
    return (datetime.now(timezone.utc) + timedelta(milliseconds=offset_ms)).isoformat(timespec='milliseconds').replace('+00:00', 'Z')


def sha(value):
    return hashlib.sha256(str(value).encode()).hexdigest()


def weighted(items, weights):
    return RNG.choices(items, weights=weights, k=1)[0]


# ---------------------------------------------------------------- synthetic people
def customer(index, band=None):
    source, medium, _, objectives = weighted(CHANNELS, [c[2] for c in CHANNELS])
    category, product, price, landing = RNG.choice(PRODUCTS)
    if band is None:
        band = weighted(range(4), [b[1] for b in INTENT_BANDS])
    low, high = INTENT_BANDS[band][0]
    city, region, pin = RNG.choice(CITIES)
    device, platform, browser, _ = weighted(DEVICES, [d[3] for d in DEVICES])
    first, last = RNG.choice(FIRST), RNG.choice(LAST)
    cid = 'live_%s_%d' % (RUN_ID, index)
    slug = category.lower().replace(' ', '_')
    # Fictional 555 numbers and reserved example domains: never a real person.
    digits = (int(sha(RUN_ID)[:8], 16) + index) % 10_000_000
    person = {
        'id': cid, 'name': first + ' ' + last, 'email': '%s.%s.%s@example.com' % (first.lower(), last.lower(), format(digits, 'x')),
        'phone': '+1555%07d' % digits, 'visitorId': 'visitor_' + cid, 'deviceId': 'device_' + cid,
        'source': source, 'medium': medium,
        'campaign': '%s_%s_%s_%s' % (source, slug, RNG.choice(objectives), datetime.now().strftime('%b%y').lower()),
        'term': product.lower() if source == 'google' else None, 'content': 'creative_%02d' % RNG.randint(1, 12) if medium == 'cpc' else None,
        'category': category, 'product': product, 'landing': landing,
        'value': int(round(price * RNG.uniform(0.9, 1.15), -1)), 'intent': round(RNG.uniform(low, high), 4), 'band': band,
        'city': city, 'region': region, 'postalCode': pin, 'deviceType': device, 'platform': platform, 'browser': browser,
        'phase': 0, 'createdAt': int(time.time() * 1000), 'converted': False,
    }
    if source == 'google':
        person['gclid'] = 'synthetic_gclid_' + cid
    if source == 'meta':
        person['fbclid'] = 'synthetic_fbclid_' + cid
    return person


def lead_input(p, stage='lead'):
    high, strong, nurture = p['intent'] >= .75, p['intent'] >= .5, p['intent'] >= .25
    phase = p['phase']
    depth = 2 + phase * 2 if high else min(6, 2 + phase * 2) if strong else min(4, 2 + phase) if nurture else 2
    return {
        'externalLeadId': p['id'], 'customerId': p['id'], 'name': p['name'], 'email': p['email'], 'phone': p['phone'],
        'deviceId': p['deviceId'], 'devicePlatform': 'web', 'source': p['source'], 'campaign': p['campaign'],
        'crmStage': 'lead' if stage == 'lead' else stage if high else 'qualified' if strong else 'contacted' if nurture else 'lead',
        'journeyDepth': depth, 'pricingPageViews': 2 if high else 1 if nurture else 0,
        'conversionPropensity': math.floor(p['intent'] * 100),
        'whatsappEngaged': phase >= 2 and (high or (not strong and nurture)),
        'callOutcome': ('qualified' if high else 'connected' if strong else 'no_answer') if phase >= 2 else 'unreached',
        'meetingStatus': 'scheduled' if phase >= 3 and high else None, 'lastActivity': iso(),
        'ltvTier': 'high' if p['value'] >= 50000 else 'mid' if p['value'] >= 15000 else 'low',
        'attributes': {'synthetic': True, 'generator': 'ace-feed.py', 'category': p['category'], 'product': p['product'],
                       'city': p['city'], 'region': p['region'], 'postalCode': p['postalCode'],
                       'deviceType': p['deviceType'], 'browser': p['browser'], 'os': p['platform']},
    }


def event_input(p, event, page=None):
    evidence = lead_input(p, 'converted' if event == 'purchase' else 'qualified' if p['phase'] >= 2 else 'lead')
    page = page or {'page_view': p['landing'], 'lead': '/enquiry/thank-you', 'purchase': '/checkout/confirmation'}.get(event, '/')
    body = {
        'id': 'evt_' + str(uuid.uuid4()), 'event': event, 'eventCategory': 'analytics', 'occurredAt': iso(), 'customerId': p['id'],
        'visitorId': p['visitorId'], 'deviceId': p['deviceId'], 'emailSha256': sha(p['email'].strip().lower()),
        'phoneSha256': sha(''.join(c for c in p['phone'] if c.isdigit())),
        'source': p['source'], 'utm_source': p['source'], 'utm_medium': p['medium'], 'campaign': p['campaign'], 'utm_campaign': p['campaign'],
        'url': 'http://%s:5173%s' % (SITE_DOMAIN, page), 'domain': SITE_DOMAIN, 'title': p['product'],
        'referrer': {'google': 'https://www.google.com/', 'meta': 'https://m.facebook.com/', 'organic': 'https://www.google.com/'}.get(p['source'], ''),
        'crmStage': evidence['crmStage'], 'journeyDepth': evidence['journeyDepth'], 'pricingPageViews': evidence['pricingPageViews'],
        'conversionPropensity': evidence['conversionPropensity'], 'category': p['category'], 'product': p['product'],
        'city': p['city'], 'region': p['region'], 'deviceType': p['deviceType'], 'platform': 'web', 'browser': p['browser'],
        'synthetic': True, 'generator': 'ace-feed.py', 'value': p['value'] if event == 'purchase' else 0, 'currency': 'INR',
    }
    for key, field in (('term', 'utm_term'), ('content', 'utm_content'), ('gclid', 'gclid'), ('fbclid', 'fbclid')):
        if p.get(key):
            body[field] = p[key]
    return body


def supervised_rows(task, count=240):
    """Mature historical labels fall strictly after the prediction cutoff; the target never appears in the features."""
    regression, rows, now = task == 'future_customer_value', [], time.time() * 1000
    for index in range(count):
        depth, pricing, recency, engaged = RNG.randint(1, 12), RNG.randint(0, 3), RNG.randint(0, 49), int(RNG.random() > .5)
        probability = max(.04, min(.96, .02 + depth * .045 + pricing * .12 + engaged * .22 - recency * .004))
        if regression:
            label = round((400 + depth * 300 + pricing * 900 + engaged * 1800) * (0.7 + RNG.random() * .6))
        else:
            label = int(RNG.random() < (1 - probability if task == 'customer_churn' else probability))
        cutoff = now - 300 * 86400000 * (1 - index / count)
        observed = cutoff + (90 if regression else 7) * 86400000
        if observed < now:
            rows.append({'entity_id': 'synthetic_history_%s_%d' % (task, index),
                         'features': {'journey_depth': depth, 'pricing_views': pricing, 'recency_days': recency, 'engaged': engaged}, 'label': label,
                         'feature_available_at': iso(cutoff - 3600000 - now), 'prediction_cutoff': iso(cutoff - now), 'label_observed_at': iso(observed - now)})
    return rows


def causal_rows(count=400):
    """Remarketing exposure with a known uplift, confounded by lead score, for the incrementality estimator."""
    rows = []
    for i in range(count):
        visits, score = RNG.randint(1, 12), RNG.uniform(20, 95)
        treated = int(RNG.random() < max(.2, min(.8, .3 + score / 300)))
        outcome = max(0.0, 800 + visits * 120 + score * 15 + treated * 900 + RNG.gauss(0, 400))
        rows.append({'entity_id': 'synthetic_exposure_%d' % i, 'treatment': treated, 'outcome': round(outcome, 2),
                     'covariates': {'prior_visits': visits, 'lead_score': round(score, 1), 'days_since_lead': RNG.randint(0, 45)},
                     'group_id': RNG.choice(CITIES)[0], 'observed_at': iso(-(count - i) * 3 * 3600000)})
    return rows


def matrix_rows(count=80):
    return [{'entity_id': 'synthetic_segment_%d' % i, 'features': {
        'visits': round(2 + RNG.random() * 10 + (i % 3) * 15), 'spend': round(200 + RNG.random() * 500 + (i % 3) * 2000),
        'recency_days': round(RNG.random() * 30), 'conversion_rate': .98 if i == count - 1 else round(RNG.random() * 20) / 100}} for i in range(count)]


def forecast_input():
    return {'series_id': 'synthetic_daily_conversions', 'horizon': 7, 'season_length': 7, 'frequency': 'D', 'timezone': 'Asia/Kolkata',
            'history': [{'timestamp': iso(-(70 - i) * 86400000), 'value': round(30 + i * .2 + 8 * math.sin(i * 2 * math.pi / 7) + RNG.random() * 4)} for i in range(70)]}


# ---------------------------------------------------------------- state and recording
STATE = {'runId': RUN_ID, 'generator': 'ace_feed.py', 'mode': 'verify' if VERIFY else 'continuous', 'workspaceId': WORKSPACE,
         'startedAt': iso(), 'updatedAt': iso(), 'intervalMs': int(INTERVAL * 1000),
         'counters': {'cycles': 0, 'customers': 0, 'events': 0, 'purchases': 0, 'requests': 0, 'errors': 0, 'jobsSucceeded': 0},
         'coverage': {}, 'requests': [], 'jobs': [], 'ai': [], 'checks': {}, 'samples': {}, 'features': {}, 'grades': {}}
LOCK = threading.RLock()
FEATURE_SECTION = {name: section for section, items in SECTIONS for name, _ in items}
for _section, _items in SECTIONS:
    for _name, _ in _items:
        STATE['features'][_name] = {'section': _section, 'checks': {}}
people, resources, artifacts, training, pending = [], {}, {}, set(), {}
token, stopping, index, last_ai = '', False, 0, 0.0


class ApiError(Exception):
    def __init__(self, message, status=0, payload=None):
        super().__init__(message)
        self.status, self.payload = status, payload


class CheckFailed(Exception):
    pass


def record(feature, name, status, detail='', kind='write'):
    """status: pass | fail | blocked | pending"""
    with LOCK:
        bucket = STATE['features'].setdefault(feature, {'section': FEATURE_SECTION.get(feature, 'Other'), 'checks': {}})['checks']
        entry = bucket.setdefault(name, {'kind': kind, 'count': 0, 'failures': 0})
        entry.update(status=status, detail=str(detail or '')[:700], at=iso(), kind=kind)
        entry['count'] += 1
        if status == 'fail':
            entry['failures'] += 1
            entry['lastFailure'] = {'detail': str(detail or '')[:700], 'at': iso()}
        label = feature + ' · ' + name
        previous = STATE['coverage'].get(label, {})
        STATE['coverage'][label] = {'state': {'pass': 'exercised' if kind != 'read' else 'readable', 'fail': 'failed'}.get(status, status),
                                    'detail': str(detail or '')[:700], 'count': previous.get('count', 0) + 1, 'at': iso()}


def check(feature, name, value, detail=''):
    with LOCK:
        STATE['checks'][feature + ' · ' + name] = {'passed': bool(value), 'detail': str(detail)[:400], 'at': iso()}
    record(feature, name, 'pass' if value else 'fail', detail if not value else (detail or 'Assertion held on the live API response'), 'assert')
    if not value:
        raise CheckFailed('%s · %s %s' % (feature, name, detail))


def step(feature, name, action, kind='write', detail=None):
    """Run one feature action; record the outcome without aborting the rest of the journey."""
    try:
        result = action()
        record(feature, name, 'pass', detail or 'Real API request succeeded', kind)
        return result
    except CheckFailed as error:
        print('[feed] ' + str(error), file=sys.stderr)
    except Exception as error:  # noqa: BLE001 - every failure belongs in the report
        record(feature, name, 'fail', str(error), kind)
        print('[feed] %s · %s: %s' % (feature, name, error), file=sys.stderr)
    return None


def log(entry):
    with LOCK:
        STATE['requests'].append(entry)
        del STATE['requests'][:-100]
        STATE['counters']['requests'] += 1
        if not entry['ok']:
            STATE['counters']['errors'] += 1
        if entry.get('body') is not None:
            STATE['samples'][entry['path']] = {'method': entry['method'], 'path': entry['path'], 'body': entry['body']}
    path = DIRECTORY / 'requests.jsonl'
    try:
        if path.exists() and path.stat().st_size > 5_000_000:
            path.replace(DIRECTORY / 'requests.previous.jsonl')
        with path.open('a', encoding='utf-8') as handle:
            handle.write(json.dumps(entry, ensure_ascii=False) + '\n')
    except OSError:
        pass


REQUEST_TIMEOUT = 60


def http(method, path, raw=None, headers=None, timeout=None):
    timeout = timeout or REQUEST_TIMEOUT
    request = urllib.request.Request(BASE + path, data=raw, method=method, headers=headers or {})
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            return response.status, response.read().decode('utf-8', 'replace')
    except urllib.error.HTTPError as error:
        return error.code, error.read().decode('utf-8', 'replace')


def login():
    global token
    raw = json.dumps({'email': ENV.get('ADMIN_EMAIL', 'owner@example.com'),
                      'password': ENV.get('ACE_LOCAL_PASSWORD') or ENV.get('ADMIN_PASSWORD') or 'demo123'}).encode()
    status, text = http('POST', '/auth/login', raw, {'content-type': 'application/json', 'x-workspace-id': WORKSPACE})
    payload = json.loads(text) if text[:1] == '{' else {}
    if status != 200 or not payload.get('token'):
        raise ApiError('Local login failed: %s %s' % (status, payload.get('error', '')), status)
    token = payload['token']


def api(path, body=None, extra=None, allow=(), auth=True, method=None):
    """Call the real API. Statuses listed in `allow` are expected outcomes, not errors."""
    method = method or ('GET' if body is None else 'POST')
    raw = None if body is None else json.dumps(body, separators=(',', ':'), ensure_ascii=False).encode('utf-8')
    started = time.perf_counter()
    status, text, payload = 0, '', None

    def send():
        supplied_key = (extra or {}).get('idempotency-key')
        headers = {'content-type': 'application/json', 'x-workspace-id': WORKSPACE,
                   'idempotency-key': supplied_key or (str((body or {}).get('run_id') or (body or {}).get('id') or uuid.uuid4()) if isinstance(body, dict) else str(uuid.uuid4()))}
        if auth:
            headers['authorization'] = 'Bearer ' + token
        headers.update(extra or {})
        return http(method, path, raw, headers)
    try:
        status, text = send()
        if status == 401 and auth and 401 not in allow and not path.startswith('/webhooks/'):
            login()
            status, text = send()
    except Exception as error:  # noqa: BLE001
        log({'at': iso(), 'method': method, 'path': path, 'body': body, 'status': 0, 'ok': False, 'error': str(error),
             'elapsedMs': round((time.perf_counter() - started) * 1000)})
        raise ApiError('%s %s: %s' % (method, path, error))
    try:
        payload = json.loads(text) if text else {}
    except ValueError:
        payload = {'text': text[:1000]}
    ok = 200 <= status < 300 or status in allow
    log({'at': iso(), 'method': method, 'path': path, 'body': body, 'status': status, 'ok': ok,
         'elapsedMs': round((time.perf_counter() - started) * 1000),
         'response': {'truncated': True, 'preview': text[:12000]} if len(text) > 12000 else payload})
    api.last_status = status
    if not ok:
        raise ApiError('%s %s: HTTP %s %s' % (method, path, status, text[:500]), status, payload)
    return payload


api.last_status = 0


def items_of(value, *keys):
    if isinstance(value, list):
        return value
    for key in keys + ('items', 'rules', 'audiences', 'agents', 'data'):
        if isinstance(value, dict) and isinstance(value.get(key), list):
            return value[key]
    return []


def reuse(path, name, create, *keys, field='name'):
    """Find a previously created resource by name in any list of the response, else create it."""
    value = api(path)
    lists = [value] if isinstance(value, list) else [v for v in value.values() if isinstance(v, list)] if isinstance(value, dict) else []
    existing = next((item for rows in lists for item in rows if isinstance(item, dict) and item.get(field) == name), None)
    return existing or create()


def unwrap(value):
    return value.get('item', value) if isinstance(value, dict) else value


# ---------------------------------------------------------------- one-time resources
def setup():
    def event_rule():
        rule = reuse('/events', 'Live test qualified purchase', lambda: unwrap(api('/events/rules', {
            'name': 'Live test qualified purchase', 'sourceEvent': 'purchase', 'outputEvent': 'live_qualified_purchase',
            'conditions': [{'field': 'value', 'operator': 'gte', 'value': 1000}], 'destinations': [], 'valueMode': 'copy', 'currency': 'INR'})), 'rules')
        resources['eventRule'] = rule['id']
    step('Events', 'Create event transformation rule', event_rule)

    def activation_rule():
        resources['activationRule'] = reuse('/activation-rules', 'Live test lead follow-up', lambda: unwrap(api('/activation-rules', {
            'name': 'Live test lead follow-up', 'triggerEvent': 'lead', 'actionType': 'follow_up', 'channel': 'email', 'owner': 'Local test team',
            'delayMinutes': 10, 'reason': 'New inbound lead', 'conditions': [], 'requiresMarketingConsent': True})))['id']
    step('Real-Time Activation', 'Create activation rule', activation_rule)
    step('Personalization', 'Create personalization rule', lambda: resources.update(personalization=reuse('/personalization-rules', 'Live test pricing visitor', lambda: unwrap(api('/personalization-rules', {
        'name': 'Live test pricing visitor', 'surface': 'website', 'variant': 'consultation', 'message': 'Book a product consultation',
        'cta': 'Choose a time', 'conditions': [], 'requiresPersonalizationConsent': True})))))
    audience = {'name': 'Live test quality audience', 'condition': 'Lead grade', 'operator': 'is one of', 'value': 'A,B',
                'destination': 'Google Ads', 'mode': 'Activate', 'identityMode': 'auto'}
    step('Audiences', 'Create audience', lambda: resources.update(audience=reuse('/audiences', audience['name'], lambda: api('/audiences', audience))))
    step('Models', 'Create weighted model', lambda: resources.update(model=reuse('/models', 'Live test weighted intent', lambda: unwrap(api('/models', {
        'name': 'Live test weighted intent', 'weights': {'lead_score': 70, 'journey_depth': 20, 'pricing_views': 10}})), 'models')))

    def form():
        resources['form'] = reuse('/forms', 'Live test enquiry', lambda: api('/forms', {'name': 'Live test enquiry', 'slug': 'live-test-enquiry', 'schema': {'fields': [
            {'key': 'customerId', 'type': 'string', 'required': True}, {'key': 'name', 'type': 'string', 'required': True},
            {'key': 'email', 'type': 'email', 'required': True}, {'key': 'product', 'type': 'string'}]}}))
        api('/forms/%s/publish' % resources['form']['id'], {})
    step('Forms & custom objects', 'Create and publish form', form)

    def custom_object():
        resources['object'] = reuse('/custom-objects', 'Live test opportunity', lambda: api('/custom-objects', {
            'name': 'Live test opportunity', 'objectKey': 'live_test_opportunity', 'schema': {'fields': [
                {'key': 'customerId', 'type': 'string', 'required': True}, {'key': 'value', 'type': 'number', 'required': True},
                {'key': 'stage', 'type': 'string', 'required': True}]}}))
        api('/custom-objects/%s/publish' % resources['object']['id'], {})
    step('Forms & custom objects', 'Create and publish custom object', custom_object)

    def policy():
        resources['policy'] = reuse('/policy-rules', 'Live test intent policy', lambda: api('/policy-rules', {
            'name': 'Live test intent policy', 'expression': {'op': 'gte', 'path': 'score', 'value': 70}}))
        api('/policy-rules/%s/publish' % resources['policy']['id'], {})
    step('Policies & workflows', 'Create and publish policy rule', policy)

    def workflow():
        resources['workflow'] = reuse('/workflows', 'Live test intake', lambda: api('/workflows', {'name': 'Live test intake', 'definition': {
            'trigger': 'manual', 'nodes': [{'id': 'start', 'type': 'start'}, {'id': 'end', 'type': 'end'}], 'edges': [{'from': 'start', 'to': 'end'}]}}))
        api('/workflows/%s/publish' % resources['workflow']['id'], {})
    step('Policies & workflows', 'Create and publish workflow', workflow)
    step('Boards', 'Create board', lambda: resources.update(board=reuse('/boards', 'Live test sales board', lambda: unwrap(api('/boards', {'name': 'Live test sales board'})))))

    def deep_link():
        resources['deepLink'] = reuse('/deep-links', 'Live test product link', lambda: api('/deep-links', {
            'name': 'Live test product link', 'slug': 'live-test-product', 'target': 'ace://product/analytics', 'fallback': 'http://localhost:5173'}), 'links')
        api('/deep-links/activate', {'slug': resources['deepLink']['slug'], 'id': resources['deepLink']['id']})
    step('Deep Links', 'Create and activate deep link', deep_link)
    step('Sites', 'Register site', lambda: api('/sites', {'domain': SITE_DOMAIN, 'environment': 'development'}))
    step('Feed', 'Register feed attribute', lambda: api('/feed/attributes', {'key': 'product_interest', 'source': 'custom', 'sample': 'Data Analytics certification'}))

    def feed_mapping():
        current = api('/feed')
        if 'custom_label_0' not in json.dumps(current.get('mappings', current)):
            api('/feed/mappings', {'sourceKey': 'product_interest', 'destination': 'Google Ads', 'targetKey': 'custom_label_0', 'transform': 'copy'})
    step('Feed', 'Create feed mapping', feed_mapping)

    def agent():
        resources['agent'] = reuse('/agents', 'Live test sales routing', lambda: api('/agents/custom', {
            'name': 'Live test sales routing', 'trigger': 'manual', 'action': 'Route to sales queue', 'description': 'Local sales routing exercise',
            'requiresApproval': True}), 'custom', 'customAgents')
        for approval in items_of(api('/approvals')):
            if approval.get('agentId') == resources['agent'].get('id') and approval.get('status') == 'pending':
                api('/approvals/decision', {'id': approval['id'], 'decision': 'approved'})
                record('Approvals', 'Approve pending custom agent', 'pass', 'Approval decision persisted')
    step('Agents', 'Create custom agent', agent)

    def matchback():
        value = api('/matchback')
        resources['matchback'] = next((x for x in items_of(value) if x.get('name') == 'Live test CRM matchback'), None) or unwrap(api('/matchback/rules', {
            'name': 'Live test CRM matchback', 'source': 'crm', 'eventType': 'purchase', 'destination': 'Google Ads', 'identityMethod': 'customer_id'}))
    step('Matchback', 'Create matchback rule', matchback)

    def offline():
        value = api('/offline-attribution')
        resources['offline'] = next((x for x in items_of(value) if x.get('conversion') == 'Live test purchase'), None) or unwrap(api('/offline-attribution/rules', {
            'conversion': 'Live test purchase', 'source': 'crm', 'match': 'first-party identity', 'identifier': 'customerId', 'destination': ['Google Ads']}))
    step('Offline Attribution', 'Create offline attribution rule', offline)
    step('Exclusions', 'Create converted-customer exclusion', lambda: resources.update(exclusion=unwrap(api('/exclusions/create', {
        'preset': 'converted_customers', 'name': 'Live test converted exclusions', 'destination': 'Google Ads'}))))
    step('Monitoring', 'Create monitoring rule', lambda: reuse('/monitoring-rules', 'Live test API error rate', lambda: api('/monitoring-rules', {
        'name': 'Live test API error rate', 'metric': 'api_error_rate', 'operator': 'gt', 'threshold': 5, 'severity': 'warning', 'windowMinutes': 10, 'enabled': True})))
    step('Reports', 'Create report schedule', lambda: resources.update(schedule=reuse('/report-schedules', 'Live test weekly cohort', lambda: api('/report-schedules', {
        'name': 'Live test weekly cohort', 'reportType': 'cohort', 'recipients': ['owner@example.com'], 'cadence': 'weekly', 'enabled': False, 'lookbackMonths': 6}))))
    step('Routing', 'Create routing rule', lambda: reuse('/routing', 'Live test high-intent routing', lambda: api('/routing/rules', {
        'name': 'Live test high-intent routing', 'when': 'score >= 85', 'destination': 'Senior counsellor pool', 'slaSeconds': 120})))
    step('Data Flows', 'Create integration flow', lambda: resources.update(flow=reuse('/integration-flows', 'Live test CRM to Ads flow', lambda: unwrap(api('/integration-flows', {
        'name': 'Live test CRM to Ads flow', 'source': 'CRM', 'destination': 'Google Ads', 'object': 'Lead / customer event',
        'trigger': 'On record change', 'identityField': 'email / phone / click id'})), 'flows')))
    for task, thresholds in GOVERNED.items():
        step('AI Intelligence', 'Declare evaluation policy for ' + task, lambda task=task, thresholds=thresholds: api('/ai/evaluation-policy', {
            'task': task, 'version': POLICY_VERSION, 'thresholds': thresholds, 'notes': 'Predeclared gate for the local live stack (synthetic data).'}))
    step('AI Intelligence', 'Verify, evaluate, approve and deploy the hosted analyst', activate_analyst, 'ml',
         'Provider access verified; grounding evaluation met its predeclared gate; analyst route deployed')
    for feature, (name, reason) in BLOCKED.items():
        record(feature, name, 'blocked', reason, 'external')
    resources['ready'] = True


# ---------------------------------------------------------------- customer journey
def signed_call(p):
    connected = p['intent'] >= .5
    body = {'eventId': 'call_' + p['id'], 'customerId': p['id'], 'provider': 'local_test_telephony', 'from': p['phone'], 'to': '+15550109999',
            'status': 'completed' if connected else 'no_answer', 'durationSeconds': 120 + math.floor(p['intent'] * 300) if connected else 0,
            'startedAt': iso(-240000), 'endedAt': iso(), 'disposition': lead_input(p, 'qualified')['callOutcome'], 'campaign': p['campaign'], 'source': 'call'}
    if p.get('gclid'):
        body['gclid'] = p['gclid']
    return body


def post_signed(path, body, secret, scheme):
    raw = json.dumps(body, separators=(',', ':'), ensure_ascii=False)
    if scheme == 'call':
        stamp = str(int(time.time()))
        extra = {'x-ace-timestamp': stamp, 'x-ace-signature': 'sha256=' + hmac.new(secret.encode(), (stamp + '.' + raw).encode(), hashlib.sha256).hexdigest()}
    else:
        extra = {'x-hub-signature-256': 'sha256=' + hmac.new(secret.encode(), raw.encode(), hashlib.sha256).hexdigest()}
    return api(path, body, extra)


def start_customer(band=None):
    global index
    index += 1
    p = customer(index, band)
    api('/consent', {'subjectType': 'customer', 'subjectId': p['id'], 'analytics': True, 'marketing': True, 'personalization': True, 'source': 'local_test_generator'})
    record('Compliance', 'Record customer consent', 'pass', 'Consent stored through POST /consent')
    event = api('/track', event_input(p, 'page_view'))
    check('Live Sync', 'Tracking persists profile and click session', event.get('accepted') and event.get('leadProfileId') and event.get('clickSessionId'))
    # A realistic visit has several page views before the enquiry.
    for page in RNG.sample(['/', '/pricing', '/about', '/reviews', p['landing'] + '/syllabus'], RNG.randint(1, 3) if p['intent'] >= .25 else 1):
        api('/track', event_input(p, 'page_view', page))
        STATE['counters']['events'] += 1
    api('/enrich/upsert', lead_input(p))
    record('Enrich', 'Upsert lead profile', 'pass', 'Lead persisted and scored through POST /enrich/upsert')
    if resources.get('deepLink'):
        step('Deep Links', 'Record deep-link click', lambda: api('/deep-links/event', {'slug': resources['deepLink']['slug'], 'kind': 'click', 'customerId': p['id'], 'source': p['source']}))
    STATE['counters']['events'] += 1
    STATE['counters']['customers'] += 1
    people.append(p)
    return p


def advance(p, force=False):
    p['phase'] += 1
    phase, high = p['phase'], p['intent'] >= .75
    if phase == 1:
        tracked = api('/track', event_input(p, 'lead'))
        STATE['counters']['events'] += 1
        step('Real-Time Activation', 'Lead triggers automatic follow-up', lambda: check(
            'Real-Time Activation', 'Lead triggers automatic follow-up',
            any(run.get('ruleId') == resources.get('activationRule') and run.get('status') == 'succeeded' for run in tracked.get('activationRuns') or []),
            json.dumps(tracked.get('activationRuns'))[:300]))
        if resources.get('form'):
            step('Forms & custom objects', 'Submit published form', lambda: api('/forms/%s/submissions' % resources['form']['id'], {
                'submissionId': 'submission_' + p['id'], 'data': {'customerId': p['id'], 'name': p['name'], 'email': p['email'], 'product': p['product']}}))
    elif phase == 2:
        score = api('/lead-grading/score', lead_input(p, 'qualified'))
        check('Lead Grading', 'Score has explainable drivers', isinstance(score.get('score'), (int, float)) and isinstance(score.get('drivers'), list)
              and (score['drivers'] or score['score'] == 20), json.dumps(score)[:200])
        api('/enrich/upsert', lead_input(p, 'qualified'))
        if p['intent'] >= .5:
            step('Reports', 'Record CRM qualification milestone', lambda: api('/assisted-events', {
                'event': 'qualified_lead', 'eventId': 'qual_' + p['id'], 'customerId': p['id'], 'value': 0, 'currency': 'INR', 'source': 'crm', 'occurredAt': iso()}))
        step('Routing', 'Route qualified lead', lambda: api('/routing/test', {'leadRef': p['id'], 'score': score['score'], 'source': p['source'], 'identityConfidence': .95}))
        if ENV.get('CALL_WEBHOOK_SECRET'):
            step('Calls', 'Ingest signed call webhook', lambda: post_signed('/webhooks/calls', signed_call(p), ENV['CALL_WEBHOOK_SECRET'], 'call'))
        if ENV.get('WHATSAPP_APP_SECRET') and lead_input(p, 'qualified')['whatsappEngaged']:
            sender = ''.join(c for c in p['phone'] if c.isdigit())
            body = {'object': 'whatsapp_business_account', 'entry': [{'id': 'local_test_business', 'changes': [{'field': 'messages', 'value': {
                'messaging_product': 'whatsapp', 'metadata': {'phone_number_id': 'local_test_phone'}, 'contacts': [{'wa_id': sender, 'profile': {'name': p['name']}}],
                'messages': [{'from': sender, 'id': 'wamid_' + p['id'], 'timestamp': str(int(datetime.fromisoformat(iso().replace('Z', '+00:00')).timestamp())), 'type': 'text',
                              'text': {'body': 'Hi, please share details and pricing for ' + p['product']},
                              'referral': {'source_url': 'https://example.com/ad', 'source_type': 'ad', 'source_id': 'synthetic_ad', 'headline': p['product'],
                                           'ctwa_clid': 'synthetic_ctwa_' + p['id']}}]}}]}]}
            step('Offline Attribution', 'Ingest signed WhatsApp click-to-chat webhook', lambda: post_signed('/webhooks/whatsapp', body, ENV['WHATSAPP_APP_SECRET'], 'whatsapp'))
    elif phase == 3:
        if high:
            def meeting():
                item = unwrap(api('/meetings', {'leadRef': p['id'], 'lead': p['name'], 'startsAt': iso(86400000), 'syncCalendar': False,
                                                'attendeeEmail': p['email'], 'attendeePhone': p['phone']}))
                p['meetingId'] = item.get('id')
            step('Meetings', 'Schedule consultation', meeting)
            step('Reports', 'Record CRM consultation milestone', lambda: api('/assisted-events', {
                'event': 'consultation_booked', 'eventId': 'consult_' + p['id'], 'customerId': p['id'], 'value': 0, 'currency': 'INR', 'source': 'crm', 'occurredAt': iso()}))
            api('/enrich/upsert', lead_input(p, 'consultation'))

        def personalize():
            decided = api('/personalization/decide', {'customerId': p['id'], 'surface': 'website', 'source': p['source']})
            if (decided.get('decision') or {}).get('id'):
                api('/personalization/feedback', {'decisionId': decided['decision']['id'], 'kind': 'impression'})
        step('Personalization', 'Decide and record impression', personalize)
    elif phase == 4:
        if high:
            purchase = event_input(p, 'purchase')
            p['purchaseEventId'] = purchase['id']
            tracked = api('/track', purchase)
            STATE['counters']['events'] += 1
            STATE['counters']['purchases'] += 1
            p['converted'] = True
            step('Events', 'Purchase transforms into qualified event', lambda: check(
                'Events', 'Purchase transforms into qualified event',
                any(item.get('ruleId') == resources.get('eventRule') for item in tracked.get('derivedEvents') or []), json.dumps(tracked.get('derivedEvents'))[:300]))
            final = api('/enrich/upsert', lead_input(p, 'converted'))

            def attribute():
                result = api('/assisted-events', {'event': 'purchase', 'eventId': 'sale_' + p['id'], 'customerId': p['id'], 'value': p['value'], 'currency': 'INR',
                                                  'source': 'crm', 'occurredAt': iso(), 'data': {'synthetic': True, 'product': p['product']}})
                check('Attribution', 'Conversion matches acquired customer', result.get('status') == 'matched', str(result.get('matchMethod') or result.get('status')))
            step('Attribution', 'Conversion matches acquired customer', attribute)
            step('Feedback', 'Record customer feedback', lambda: api('/feedback', {
                'leadRef': p['id'], 'lead': p['name'], 'score': 3 + math.floor(p['intent'] * 3), 'theme': 'Product consultation',
                'reason': RNG.choice(['Counsellor explained the fee structure clearly', 'Quick callback and helpful demo', 'Smooth checkout, wanted more EMI options'])}))
            if resources.get('object'):
                step('Forms & custom objects', 'Create custom-object record', lambda: api('/custom-objects/%s/records' % resources['object']['id'], {
                    'recordId': 'opportunity_' + p['id'], 'data': {'customerId': p['id'], 'value': p['value'], 'stage': 'closed_won'}}))
            if resources.get('deepLink'):
                step('Deep Links', 'Record deep-link conversion', lambda: api('/deep-links/event', {
                    'slug': resources['deepLink']['slug'], 'kind': 'conversion', 'customerId': p['id'], 'value': p['value'], 'source': p['source']}))
        else:
            step('Follow-ups', 'Create abandonment follow-up', lambda: api('/follow-ups', {
                'leadRef': p['id'], 'lead': p['name'], 'channel': 'whatsapp' if p['source'] == 'whatsapp' else 'email', 'dueAt': iso(3600000),
                'reason': 'Checkout abandoned; needs consultation'}))
            final = api('/enrich/upsert', lead_input(p, 'contacted'))
        grade = final.get('grade')
        with LOCK:
            STATE['grades'][grade] = STATE['grades'].get(grade, 0) + 1
        if force:
            check('Lead Grading', 'Completed %s journey is graded %s by the backend' % (
                ['low-quality', 'nurture', 'strong-fit', 'high-intent'][p['band']], BAND_GRADE[p['band']]),
                grade == BAND_GRADE[p['band']], 'score %s grade %s for %s' % (final.get('score'), grade, p['id']))


# ---------------------------------------------------------------- per-feature write scenarios
def feature_writes(p, full=False):
    name, rid = p['name'], RUN_ID

    def workflow_cycle():
        execution = api('/workflows/%s/executions' % resources['workflow']['id'], {'triggerType': 'manual', 'triggerRef': p['id']})
        check('Policies & workflows', 'Workflow start creates a running execution', execution.get('status') == 'running' and execution.get('id'), str(execution.get('status')))
        api('/workflows/executions/%s/cancel' % execution['id'], {})

    def follow_up_cycle():
        before = api('/follow-ups').get('stats') or {}
        item = api('/follow-ups', {'leadRef': p['id'], 'lead': name, 'channel': 'email', 'dueAt': iso(1800000), 'reason': 'Consultation follow-up'})
        api('/follow-ups/complete', {'id': item['id']})
        # Counsellors work the most overdue tasks first; without this the open queue would grow forever.
        queue = api('/follow-ups')
        for task in [x for x in items_of(queue) if x.get('status') == 'open'][:6]:
            api('/follow-ups/complete', {'id': task['id']})
        after = api('/follow-ups').get('stats') or {}
        check('Follow-ups', 'Queue totals reflect completed work', after.get('completedTotal', 0) > before.get('completedTotal', 0)
              and after.get('completedToday', 0) >= 1, 'before %s after %s' % (json.dumps(before), json.dumps(after)))

    def agent_routing():
        result = api('/agents/custom/test', {'id': resources['agent']['id'], 'leadRef': p['id'], 'context': {'score': 85, 'source': p['source'], 'destination': 'Local sales test queue'}})
        check('Agents', 'Custom agent executes persisted routing', ((result.get('output') or {}).get('operation') or {}).get('kind') == 'routing'
              and (result.get('run') or {}).get('status') == 'succeeded', json.dumps(result)[:300])

    def adjustment():
        item = unwrap(api('/adjustments', {'event': 'purchase', 'source': 'crm', 'destination': 'Google Ads', 'fromValue': p['value'],
                                           'toValue': round(p['value'] * .9), 'currency': 'INR', 'reason': 'Partial refund; preview only'}))
        api('/adjustments/preview', {'id': item['id']})

    def grade_activation():
        result = api('/lead-grading/activate', {'lead': p['id']})
        check('Lead Grading', 'Grade activation creates a downstream action', bool(result.get('action') or result.get('activation') or result.get('status')), json.dumps(result)[:300])

    def meeting_cycle():
        item = unwrap(api('/meetings', {'leadRef': p['id'], 'lead': name, 'startsAt': iso(2 * 86400000), 'syncCalendar': False,
                                        'attendeeEmail': p['email'], 'attendeePhone': p['phone']}))
        api('/meetings/reschedule', {'id': item['id'], 'startsAt': iso(3 * 86400000), 'syncCalendar': False})
        api('/meetings/remind', {'id': item['id']})

    def feedback_cycle():
        item = unwrap(api('/feedback', {'leadRef': p['id'], 'lead': name, 'score': 2, 'theme': 'Response time', 'reason': 'Callback took longer than promised'}))
        api('/feedback/request', {'lead': name, 'leadRef': p['id'], 'channel': 'email'})
        if item.get('id'):
            api('/feedback/route', {'id': item['id']})

    def audience_cycle():
        api('/audiences/preview', {'name': 'Preview', 'condition': 'Lead grade', 'operator': 'is one of', 'value': 'A,B', 'destination': 'Google Ads', 'mode': 'Activate', 'identityMode': 'auto'})
        result = api('/audiences/materialize', {'id': resources['audience']['id']})
        check('Audiences', 'Materialization returns matched members', isinstance(result.get('matchedSize'), int), json.dumps(result)[:200])
        api('/audience-schedules', {'id': resources['audience']['id'], 'cadence': 'daily', 'enabled': True})

    def api_key_cycle():
        created = api('/api-keys', {'name': 'Live test key ' + rid})
        key_id = created.get('id') or (created.get('item') or {}).get('id') or (created.get('key') or {}).get('id')
        check('Developers', 'API key is issued with an id', bool(key_id), json.dumps({k: v for k, v in created.items() if k not in ('secret', 'key', 'token')})[:200])
        api('/api-keys/revoke', {'id': key_id})

    def knowledge():
        api('/ai/knowledge', {'name': 'Live test refund policy ' + rid, 'text': 'Refunds are available within 7 days of purchase. Consultations are free. EMI is available on courses above INR 20000.',
                              'documentVersion': 'v1'}, allow=(409,))
        api('/ai/knowledge/search', {'query': 'refund policy', 'limit': 5})

    def anomaly_triage():
        flagged = [x for x in items_of(api('/ai/anomalies')) if x.get('anomaly') and x.get('triage_status') == 'open'][:2]
        for item in flagged:
            api('/ai/anomalies/%s/%s/review' % (urllib.parse.quote(item['result_id']), urllib.parse.quote(item['entity_id'])), {
                'status': RNG.choice(['investigating', 'resolved', 'false_positive']), 'feedback': 'Reviewed against the campaign calendar'})

    def public_site():
        api('/pricing/recommend', {'challenges': ['lead quality', 'attribution']}, auth=False)
        api('/pricing/quote', {'leads': RNG.choice([500, 2000, 10000]), 'channels': ['google', 'meta'], 'agents': ['qualification'], 'challenges': ['lead quality']}, auth=False)

    def reactivation():
        candidates = items_of(api('/lead-reactivation?dormantDays=30&recentDays=7'), 'candidates', 'leads')
        if not candidates:
            return record('Follow-ups', 'Lead reactivation run', 'pass', 'No dormant leads are eligible yet (feed data is younger than 30 days); read succeeded', 'write')
        ref = candidates[0].get('leadRef') or candidates[0].get('externalLeadId') or candidates[0].get('id')
        api('/lead-reactivation/run', {'leadRef': ref, 'dormantDays': 30, 'recentDays': 7}, allow=(409,))

    def privacy_export():
        counts = api('/privacy/export', {'selectorType': 'customer', 'selector': p['id']}).get('counts') or {}
        check('Compliance', 'Privacy export returns the customer data', counts.get('clickSessions', 0) >= 1 and counts.get('leadProfiles', 0) >= 1
              and counts.get('consentRecords', 0) >= 1, json.dumps(counts))

    def privacy_delete():
        # A dedicated throwaway subject: consent, visit and lead capture, then a full erasure request.
        subject = customer(900000 + STATE['counters']['cycles'])
        subject['id'] = 'erase_%s_%d' % (rid, STATE['counters']['cycles'])
        subject['visitorId'], subject['deviceId'] = 'visitor_' + subject['id'], 'device_' + subject['id']
        api('/consent', {'subjectType': 'customer', 'subjectId': subject['id'], 'analytics': True, 'marketing': True, 'personalization': True, 'source': 'local_test_generator'})
        api('/track', event_input(subject, 'page_view'))
        api('/enrich/upsert', lead_input(subject))
        summary = api('/privacy/delete', {'selectorType': 'customer', 'selector': subject['id'], 'confirm': 'DELETE'}).get('summary') or {}
        check('Compliance', 'Privacy deletion removes all subject data', summary.get('clickSessions', 0) >= 1 and summary.get('leadProfiles', 0) >= 1
              and summary.get('consentRecords', 0) >= 1, json.dumps(summary))
        left = api('/privacy/export', {'selectorType': 'customer', 'selector': subject['id']}).get('counts') or {}
        check('Compliance', 'Nothing remains after deletion', not any(left.values()), json.dumps(left))

    def cohort_report():
        totals = api('/cohorts?months=6').get('totals') or {}
        check('Reports', 'Cohort report contains acquired customers', totals.get('acquired', 0) > 0 and totals.get('conversions', 0) > 0 and totals.get('revenue', 0) > 0, json.dumps(totals))

    tasks = [
        ('Audiences', 'Preview and materialize audience', audience_cycle),
        ('Models', 'Run weighted model', lambda: api('/models/run', {'name': resources['model']['name']})),
        ('POS & Stores', 'Import POS transaction', lambda: api('/pos-stores/import', {
            'location': 'live_' + p['city'].lower(), 'locationName': p['city'] + ' experience centre', 'currency': 'INR',
            'transactions': [{'transactionId': 'txn_' + str(uuid.uuid4()), 'customerId': p['id'], 'value': p['value'], 'currency': 'INR', 'occurredAt': iso()}]})),
        ('Planner', 'Save media-plan scenario', lambda: api('/planner/scenarios', {
            'name': 'Q%d growth plan %s' % ((datetime.now().month - 1) // 3 + 1, rid), 'budget': 100000 + RNG.randrange(50000),
            'allocations': [{'source': 'google', 'share': 50}, {'source': 'meta', 'share': 35}, {'source': 'email', 'share': 15}]})),
        ('Grouped Performance', 'Record channel cost', lambda: api('/grouped-performance/costs', {'dimension': 'source', 'key': p['source'], 'cost': 10000 + RNG.randrange(3000)})),
        ('Sites', 'Validate site installation', lambda: api('/sites/test', {'domain': SITE_DOMAIN})),
        ('Feed', 'Preview destination feed', lambda: api('/feed/preview', {'destination': 'Google Ads', 'leadRef': p['id']})),
        ('Policies & workflows', 'Simulate policy rule', lambda: api('/policy-rules/simulate', {'expression': {'op': 'gte', 'path': 'score', 'value': 70}, 'input': {'score': round(p['intent'] * 100)}})),
        ('Policies & workflows', 'Start and cancel workflow', workflow_cycle),
        ('Policies & workflows', 'Simulate workflow definition', lambda: api('/workflows/simulate', {'definition': {
            'trigger': 'manual', 'nodes': [{'id': 'start', 'type': 'start'}, {'id': 'end', 'type': 'end'}], 'edges': [{'from': 'start', 'to': 'end'}]}})),
        ('Follow-ups', 'Create and complete follow-up', follow_up_cycle),
        ('Follow-ups', 'Lead reactivation run', reactivation),
        ('Compliance', 'Privacy export returns the customer data', privacy_export),
        ('Compliance', 'Privacy deletion removes all subject data', privacy_delete),
        ('Reports', 'Cohort report contains acquired customers', cohort_report),
        ('Compliance', 'Save consent preferences', lambda: api('/consent-preferences', {'analytics': True, 'advertising': True, 'functionality': True})),
        ('Ask Ace', 'Grounded analyst tool', lambda: api('/ai/analyst/tools/customer_aggregates', {'limit': 25})),
        ('Ask Ace', 'Ask a grounded question', lambda: api('/ask-ace', {'question': RNG.choice([
            'Which source is sending the highest quality leads?', 'How many leads converted this week?', 'Which campaign has the best lead grade mix?'])})),
        ('Diagnostics', 'Run diagnostics scan', lambda: api('/diagnostics/scan', {})),
        ('Diagnostics', 'Queue diagnostics replay', lambda: api('/diagnostics/replay', {'issue': 'missing_click_id'})),
        ('Reconciliation', 'Run identity reconciliation', lambda: api('/reconciliation/action', {'issue': 'unmatched_attribution', 'limit': 250})),
        ('Matchback', 'Reconcile matchback rule', lambda: api('/matchback/reconcile', {'ruleId': resources['matchback']['id'], 'limit': 100})),
        ('Offline Attribution', 'Test offline conversion', lambda: api('/offline-attribution/test', {
            'ruleId': resources['offline']['id'], 'customerId': p['id'], 'value': p['value'], 'currency': 'INR', 'event': 'purchase'})),
        ('Agents', 'Custom agent routing', agent_routing),
        ('Adjustments', 'Create and preview adjustment', adjustment),
        ('Fingerprinting', 'Record fingerprint evidence', lambda: api('/fingerprinting/test', {'scenario': 'device identity'})),
        ('Fraud', 'Queue fraud review', lambda: api('/fraud/review', {'pattern': 'repeated_device_' + p['deviceId']})),
        ('Leak Monitor', 'Recover funnel leak', lambda: api('/leak-monitor/recover', {'leadRef': p['id'], 'channel': 'email', 'reason': 'Checkout abandonment'})),
        ('Lead Grading', 'Activate grade downstream', grade_activation),
        ('Meetings', 'Schedule, reschedule and remind', meeting_cycle),
        ('Meetings', 'Request voice scheduling', lambda: api('/voice-scheduler', {
            'leadRef': p['id'], 'lead': name, 'phone': p['phone'], 'attendeeEmail': p['email'], 'preferredWindow': 'Weekday evenings', 'proposedStartsAt': iso(86400000)})),
        ('Calls', 'Queue qualification call', lambda: api('/qualification-calls', {'lead': name, 'leadRef': p['id'], 'source': p['source'], 'intent': round(p['intent'] * 100)})),
        ('Feedback', 'Record, request and route feedback', feedback_cycle),
        ('Real-Time Activation', 'Test activation rule', lambda: api('/activation-rules/test', {'id': resources['activationRule']})),
        ('Data Flows', 'Test integration flow', lambda: api('/integration-flows/test', {'id': resources['flow']['id']})),
        ('Data Hub', 'Rebuild data hub', lambda: api('/data-hub/rebuild', {})),
        ('ChatGPT Ads', 'Validate conversion payload', lambda: api('/chatgpt-ads/validate', {
            'event': 'lead_created', 'eventId': 'evt_' + str(uuid.uuid4()), 'customerId': p['id'], 'emailSha256': sha(p['email']), 'value': p['value'],
            'currency': 'INR', 'occurredAt': iso(), 'actionSource': 'web', 'eventSourceUrl': 'https://www.example.com' + p['landing'], 'clickId': 'synthetic_oaiclid_' + p['id']})),
        ('Reports', 'Send test report', lambda: api('/reports/send-test', {'report': 'cohort'})),
        ('Developers', 'Issue and revoke API key', api_key_cycle),
        ('Developers', 'Export audit log', lambda: api('/audit-log/export', {})),
        ('AI Intelligence', 'Add and search knowledge', knowledge),
        ('AI Intelligence', 'Triage detected anomalies', anomaly_triage),
        ('Public website', 'Pricing recommendation and quote', public_site),
    ]
    if VERIFY or full:
        for feature, title, action in tasks:
            step(feature, title, action)
    else:
        offset = (STATE['counters']['cycles'] * 3) % len(tasks)
        for n in range(3):
            feature, title, action = tasks[(offset + n) % len(tasks)]
            step(feature, title, action)


def work_follow_up_queue():
    """Counsellors clear the most overdue tasks first. Without this the open queue only ever grows,
    and the page (which lists the 200 most overdue) would never show anything new."""
    queue = api('/follow-ups')
    backlog = (queue.get('stats') or {}).get('open', 0)
    quota = 40 if backlog > 300 else 6 if backlog > 60 else 0
    done = 0
    for task in [x for x in items_of(queue) if x.get('status') == 'open'][:quota]:
        api('/follow-ups/complete', {'id': task['id']})
        done += 1
    return 'Completed %d of %d open follow-ups' % (done, backlog)


AGENT_IDEAS = [('Weekend lead re-engagement', 'lead_idle_48h', 'Send WhatsApp nudge and create follow-up'),
               ('High-value cart rescue', 'checkout_abandoned', 'Route to senior counsellor'),
               ('No-show recovery', 'meeting_no_show', 'Offer two new consultation slots'),
               ('Low-quality source guard', 'grade_d_spike', 'Flag source for suppression review'),
               ('Renewal reminder', 'renewal_due_30d', 'Create renewal follow-up task')]


def approvals_flow():
    """A new agent proposal waits for human approval; earlier proposals get decided."""
    pending = [x for x in items_of(api('/approvals')) if x.get('status') == 'pending' and x.get('kind') == 'custom_agent_activation']
    for approval in pending[1:4]:
        api('/approvals/decision', {'id': approval['id'], 'decision': 'approved' if RNG.random() < .7 else 'rejected'})
    name, trigger, action = RNG.choice(AGENT_IDEAS)
    api('/agents/custom', {'name': '%s · %s %s' % (name, RNG.choice(CITIES)[0], datetime.now().strftime('%d %b %H:%M')), 'trigger': trigger, 'action': action,
                           'description': 'Proposed by the operations team; requires approval before activation.', 'requiresApproval': True,
                           'risk': RNG.choice(['low', 'medium', 'medium', 'high'])})


def negative_checks():
    """The API must refuse bad input; an accepted bad request is a defect."""
    def expect(feature, title, expected, call):
        def run():
            call()
            check(feature, title, api.last_status in expected, 'expected HTTP %s, received %s' % ('/'.join(map(str, expected)), api.last_status))
        step(feature, title, run, 'security')
    anonymous = 'visitor_no_consent_' + RUN_ID
    if ENV.get('AUTH_REQUIRED') == 'true':
        expect('Authentication & security', 'Unauthenticated read is rejected', (401,), lambda: api('/enrich', auth=False, allow=(401,)))
        expect('Authentication & security', 'Wrong password is rejected', (400, 401, 403, 429), lambda: api('/auth/login', {'email': ENV.get('ADMIN_EMAIL', 'owner@example.com'), 'password': 'wrong-' + RUN_ID}, auth=False, allow=(400, 401, 403, 429)))
    else:
        record('Authentication & security', 'Authentication enforcement', 'blocked', 'Development mode: the API serves unauthenticated reads and accepts any password for a member without a stored hash. '
               'Enforcement applies when AUTH_REQUIRED=true or NODE_ENV=production; set AUTH_REQUIRED=true before exposing this stack.', 'external')
    expect('Authentication & security', 'Unknown account cannot log in', (401,), lambda: api('/auth/login', {'email': 'nobody-%s@example.com' % RUN_ID, 'password': 'not-a-member'}, auth=False, allow=(401,)))
    expect('Authentication & security', 'Malformed login is rejected', (400,), lambda: api('/auth/login', {'email': 'not-an-email', 'password': 'x'}, auth=False, allow=(400,)))
    expect('Compliance', 'Tracking without consent is refused', (403,), lambda: api('/track', {'event': 'page_view', 'visitorId': anonymous, 'eventCategory': 'marketing'}, allow=(403,)))
    expect('Live Sync', 'Invalid event timestamp is rejected', (400,), lambda: api('/track', {'event': 'page_view', 'visitorId': anonymous, 'occurredAt': 'not-a-date'}, allow=(400,)))
    expect('Lead Grading', 'Invalid grade override is rejected', (400,), lambda: api('/lead-grading/override', {'lead': 'nobody', 'grade': 'Z'}, allow=(400,)))
    expect('Calls', 'Unsigned call webhook is rejected', (400, 401, 403), lambda: api('/webhooks/calls', {'eventId': 'forged_' + RUN_ID, 'status': 'completed'}, {'x-ace-timestamp': str(int(time.time())), 'x-ace-signature': 'sha256=' + '0' * 64}, allow=(400, 401, 403), auth=False))
    expect('Offline Attribution', 'Unsigned WhatsApp webhook is rejected', (400, 401, 403), lambda: api('/webhooks/whatsapp', {'object': 'whatsapp_business_account', 'entry': []}, {'x-hub-signature-256': 'sha256=' + '0' * 64}, allow=(400, 401, 403), auth=False))
    expect('Audiences', 'Unsupported audience condition is rejected', (400,), lambda: api('/audiences/preview', {'condition': 'Not a field', 'operator': 'is', 'value': 'x'}, allow=(400,)))


def visibility_checks(journey):
    """After complete journeys, each product page's API must actually show the generated customer."""
    buyer, nurture = journey.get(3), journey.get(1)

    def shows(feature, title, path, needle, kind='assert'):
        def run():
            text = json.dumps(api(path))
            check(feature, title, needle in text, '%s not found in GET %s (%d bytes)' % (needle, path, len(text)))
        step(feature, title, run, kind)
    if buyer:
        cid = buyer['id']
        shows('Enrich', 'New lead is visible in enrichment', '/enrich', cid)

        def acquisition():
            lead = next((x for x in items_of(api('/enrich')) if cid in json.dumps(x)), None) or {}
            check('Enrich', 'Acquisition source survives later calls', lead.get('source') == buyer['source'], 'expected %s, lead shows %s' % (buyer['source'], lead.get('source')))
        step('Enrich', 'Acquisition source survives later calls', acquisition, 'assert')
        shows('Customer 360', 'Customer profile is retrievable by id', '/customer-360?id=' + urllib.parse.quote(cid), cid)
        shows('Journeys', 'Journey timeline contains the customer', '/journeys', buyer['name'])
        shows('Meetings', 'Scheduled consultation is listed', '/meetings', cid)
        shows('Feedback', 'Submitted feedback is listed', '/feedback', cid)
        shows('Calls', 'Inbound call is listed', '/call-events', 'call_' + cid)
        shows('Offline Attribution', 'Click-to-WhatsApp message is attributed', '/ctwa-attribution', cid)
        shows('Routing', 'Routing decision is listed', '/routing', cid)
        shows('Live Sync', 'Latest purchase appears in the live event stream', '/live-sync', buyer.get('purchaseEventId', 'missing-purchase-event'))
        shows('POS & Stores', 'Imported store is listed', '/pos-stores', 'experience centre')

        def grading():
            data = api('/lead-grading')
            stats = data.get('stats') or {}
            check('Lead Grading', 'Grade distribution accounts for every lead', stats.get('aGrade', 0) + (stats.get('abQuality', 0) - stats.get('aGrade', 0))
                  + stats.get('cGrade', 0) + stats.get('dGrade', 0) == stats.get('total'), json.dumps(stats))
            lead = next((x for x in items_of(data, 'leads') if cid in json.dumps(x)), None)
            check('Lead Grading', 'Converted customer is listed as grade A', lead is not None and lead.get('grade') == 'A', json.dumps(lead)[:200] if lead else 'lead not in recent list')
        step('Lead Grading', 'Grade distribution accounts for every lead', grading, 'assert')

        def funnel():
            text = json.dumps(api('/funnel'))
            check('Funnel', 'Funnel reports non-zero stages', any(ch.isdigit() and ch != '0' for ch in text), text[:200])
        step('Funnel', 'Funnel reports non-zero stages', funnel, 'assert')
    if nurture:
        shows('Journeys', 'Nurture lead has a journey', '/journeys', nurture['name'])


# ---------------------------------------------------------------- local ML
# Predeclared evaluation gates. A model becomes an active route only when its own
# evaluation meets these thresholds and is then approved and deployed.
POLICY_VERSION = 'live-feed.v1'
CLASSIFIER_GATE = {'brier': {'max': 0.25}, 'liftAtCapacity': {'min': 1.0}, 'testRows': {'min': 100}}
GOVERNED = {
    'lead_qualification': CLASSIFIER_GATE, 'paid_conversion': CLASSIFIER_GATE, 'customer_churn': CLASSIFIER_GATE,
    'future_customer_value': {'mae': {'max': 1500}, 'testRows': {'min': 100}},
    'forecast_challenger': {'mae': {'max': 8}},
    'offer_ranking': {'meanNdcg': {'min': 0.7}},
}
ai_runs = 0
regoverned = set()
# Predeclared gate for the hosted grounded analyst: it must answer, cite the supplied evidence,
# recall the supplied figures, and decline questions the evidence cannot answer.
ANALYST_GATE = {'responseRate': {'min': 1}, 'evidenceCitationRate': {'min': 0.66}, 'expectedFactRate': {'min': 0.66}, 'abstentionRate': {'min': 1}}
ANALYST_QUESTIONS = ['Why did the lead quality change this month?', 'Which acquisition source is producing the best lead quality, and what is the evidence?',
                     'Summarise attribution coverage and the main data-quality risks.', 'Which anomalies or forecast signals need attention this week?']


def analyst_entry():
    return next((x for x in api('/ai/registry').get('tenantItems') or [] if x.get('task') == 'analyst'), {})


def analyst_active(entry=None):
    entry = entry or analyst_entry()
    return entry.get('evaluationStatus') == 'qualified' and entry.get('approvalStatus') == 'approved' and entry.get('deploymentStatus') == 'deployed' and entry.get('accessVerified')


def activate_analyst():
    """Hosted analyst lifecycle: verify provider access, evaluate grounding, qualify against the gate, approve, deploy."""
    global REQUEST_TIMEOUT
    entry = analyst_entry()
    if entry.get('provider') != 'nvidia':
        return record('AI Intelligence', 'Grounded analyst', 'blocked', 'No analyst provider is configured (AI_ANALYST_PROVIDER, NVIDIA_API_KEY, NVIDIA_MODEL).', 'external')
    api('/ai/evaluation-policy', {'task': 'analyst', 'version': POLICY_VERSION, 'thresholds': ANALYST_GATE,
                                  'notes': 'Grounding gate: answers, cites evidence, recalls supplied figures, abstains when evidence is missing.'})
    if analyst_active(entry):
        return
    if not entry.get('accessVerified'):
        api('/ai/providers/analyst/verify', {})
    REQUEST_TIMEOUT = 300  # five real model calls run inside this request
    try:
        evaluation = unwrap(api('/ai/evaluations/run', {'task': 'analyst'}))
    finally:
        REQUEST_TIMEOUT = 60
    govern('analyst', evaluation['id'])


def ask_analyst():
    if any(job['task'] == 'analyst' for job in pending.values()):
        return
    response = api('/ai/analysis', {'question': RNG.choice(ANALYST_QUESTIONS)})
    check('AI Intelligence', 'Analyst question accepted as durable job', bool(response.get('jobId')), json.dumps(response)[:200])
    job = {'id': response['jobId'], 'task': 'analyst', 'status': response.get('status'), 'path': '/ai/analysis', 'submittedAt': iso(), 'training': False,
           'feature': 'AI Intelligence', 'label': 'Grounded analyst answers from workspace evidence'}
    pending[job['id']] = job
    STATE['jobs'].insert(0, dict(job))
    del STATE['jobs'][40:]


def govern(task, evaluation_id):
    """Qualify an evaluation against its predeclared policy, then approve and deploy the model."""
    item = unwrap(api('/ai/evaluations/%s/qualify' % urllib.parse.quote(evaluation_id), {}))
    if not item.get('qualified'):
        failing = {key: value.get('actual') for key, value in (item.get('qualification_details') or {}).items() if not value.get('pass')}
        raise ApiError('evaluation did not meet the predeclared thresholds: ' + json.dumps(failing))
    entry = next((x for x in api('/ai/registry').get('tenantItems') or [] if x.get('task') == task), {})
    if entry.get('approvalStatus') != 'approved':
        api('/ai/models/%s/promote' % task, {'evaluationId': evaluation_id})
        entry = dict(entry, deploymentStatus='not_deployed')
    if entry.get('deploymentStatus') != 'deployed':
        try:
            api('/ai/models/%s/deploy' % task, {})
        except ApiError as error:
            if 'documentation verification' not in str(error):
                raise
            record('AI Intelligence', 'Deploy ' + task, 'blocked', 'Qualified and approved, but deployment of local models is gated: set AI_LOCAL_ML_CAPABILITY_VERIFIED=true.', 'external')


def submit_ml(task, path, body, training=None):
    if any(job['task'] == task for job in pending.values()):
        return
    body = dict(body, run_id='live_%s_%s' % (task, uuid.uuid4().hex))
    response = api(path, body)
    check('Local ML pipelines', 'ML request accepted as durable job', bool(response.get('jobId')), json.dumps(response)[:200])
    job = {'id': response['jobId'], 'task': task, 'status': response.get('status'), 'path': path, 'submittedAt': iso(),
           'training': ('/train/' in path or path.endswith('/rank')) if training is None else training}
    pending[job['id']] = job
    STATE['jobs'].insert(0, dict(job))
    del STATE['jobs'][40:]
    record('Local ML pipelines', task, 'pending', 'Durable job %s accepted; awaiting worker' % job['id'], 'ml')


def poll_jobs():
    for job_id, entry in list(pending.items()):
        job = api('/ai/jobs/' + job_id).get('job') or {}
        visible = next((item for item in STATE['jobs'] if item['id'] == job_id), None)
        if visible:
            visible.update(status=job.get('status'), attempts=job.get('attempts'), error=job.get('last_error'))
        if job.get('status') == 'succeeded':
            pending.pop(job_id)
            STATE['counters']['jobsSucceeded'] += 1
            result = job.get('result') or {}
            payload = result.get('result') or result.get('payload') or result
            artifact = payload.get('artifact') or result.get('artifact')
            if entry['training'] and artifact:
                artifacts[entry['task']] = artifact
                training.discard(entry['task'])
            lifecycle = result.get('lifecycle') or {}
            ok = bool(lifecycle.get('resultId') or result.get('resultId'))
            detail = 'Worker completed job %s; result persisted' % job_id
            if entry['path'] == '/ai/analysis':
                answer = str(result.get('text') or payload.get('text') or '')
                ok = ok and len(answer) > 40
                detail = '%s answered in %d characters: %s' % (result.get('resolvedModel') or 'model', len(answer), ' '.join(answer[:160].split()))
            if entry['path'] == '/ai/ml/score':
                ok = ok and payload.get('status') == 'served_from_verified_artifact' and bool(payload.get('items'))
                detail = 'Scored %d new customers from the trained artifact' % len(payload.get('items') or [])
            if entry['path'] == '/ai/ml/rank/score':
                ok = ok and any(group.get('items') for group in payload.get('groups') or [])
            record(entry.get('feature', 'Local ML pipelines'), entry.get('label', entry['task']), 'pass' if ok else 'fail',
                   detail if ok else 'Job succeeded without a persisted/served result: ' + json.dumps(payload)[:300], 'ml')
            if lifecycle.get('evaluationId') and entry['task'] in GOVERNED:
                step('AI Intelligence', 'Qualify, approve and deploy ' + entry['task'],
                     lambda task=entry['task'], evaluation=lifecycle['evaluationId']: govern(task, evaluation), 'ml',
                     'Evaluation met its predeclared thresholds; model is approved and deployed')
        elif job.get('status') in ('dead_letter', 'cancelled', 'unknown_outcome'):
            pending.pop(job_id)
            training.discard(entry['task'])
            if not entry['training']:
                # A scoring job that cannot find its artifact would fail forever; retrain on the next AI cycle.
                artifacts.pop(entry['task'], None)
            record(entry.get('feature', 'Local ML pipelines'), entry.get('label', entry['task']), 'fail', job.get('last_error') or job.get('status'), 'ml')


def ai_cycle():
    global ai_runs
    ai_runs += 1
    capabilities, registry = api('/ai/ml/capabilities'), api('/ai/registry')
    available = {item['task']: item.get('dependencyAvailable') for item in items_of(capabilities)}
    STATE['ai'] = [{'task': item['task'], 'available': item.get('dependencyAvailable'),
                    'detail': 'Dependency installed; job outcomes shown above' if item.get('dependencyAvailable') else item.get('reason')} for item in items_of(capabilities)]
    for item in items_of(registry):
        if item.get('provider') not in ('local_ml', 'deterministic'):
            STATE['ai'].append({'task': item.get('task'), 'available': item.get('readiness') == 'active',
                                'detail': ' · '.join([str(item.get('provider')), str(item.get('readiness'))] + list(item.get('warnings') or []))})
    # A trained model that never passed the governed lifecycle is retrained once through it.
    tenant = {item.get('task'): item for item in registry.get('tenantItems') or []}
    for task in ('lead_qualification', 'paid_conversion', 'customer_churn', 'future_customer_value', 'offer_ranking'):
        entry = tenant.get(task) or {}
        active = entry.get('evaluationStatus') == 'qualified' and entry.get('approvalStatus') == 'approved' and entry.get('deploymentStatus') == 'deployed'
        if task in artifacts and task not in regoverned and not active:
            regoverned.add(task)
            artifacts.pop(task)
    recent = people[-20:]
    for task in ('lead_qualification', 'paid_conversion', 'customer_churn', 'future_customer_value'):
        if not available.get(task):
            continue
        extra = {'horizon': '90d'} if task == 'future_customer_value' else {}

        def run(task=task, extra=extra):
            artifact = artifacts.get(task)
            if not artifact:
                if task in training:
                    return
                training.add(task)
                try:
                    # Governed path: an immutable point-in-time dataset snapshot, then training from that snapshot.
                    rows = supervised_rows(task, 1600)
                    dataset = unwrap(api('/ai/datasets', {'task': task, 'rows': rows, 'labelObservationCutoff': iso(),
                                                          'sourceSnapshot': {'generator': 'ace_feed.py', 'synthetic': True, 'rows': len(rows)}}))
                    record('AI Intelligence', 'Create point-in-time dataset', 'pass', '%s: %d rows, dataset %s' % (task, len(rows), dataset.get('id')))
                    submit_ml(task, '/ai/datasets/%s/train' % dataset['id'], dict(randomSeed=42, categoricalFeatures=[], **extra), training=True)
                except Exception:
                    training.discard(task)
                    raise
            elif recent:
                submit_ml(task, '/ai/ml/score', dict(task=task, artifact_id=artifact['artifactId'], artifact_sha256=artifact['sha256'], prediction_cutoff=iso(), rows=[
                    {'entity_id': p['id'], 'features': {'journey_depth': 2 + p['phase'] * 2, 'pricing_views': 2 if p['intent'] > .55 else 1, 'recency_days': 0,
                                                        'engaged': 1 if p['phase'] >= 2 else 0}} for p in recent], **extra))
        step('Local ML pipelines', 'Submit ' + task, run, 'ml')
    ranking = artifacts.get('offer_ranking')
    jobs = [('forecast_baseline', '/ai/ml/forecast/seasonal-naive', forecast_input()),
            ('anomaly_detection', '/ai/ml/anomalies', {'rows': matrix_rows(), 'contamination': .05, 'minimum_volume': 30}),
            ('behavioral_segments', '/ai/ml/segments', {'rows': matrix_rows(), 'min_cluster_size': 5})]
    if ranking and people:
        jobs.append(('offer_ranking', '/ai/ml/rank/score', {'artifact_id': ranking['artifactId'], 'artifact_sha256': ranking['sha256'], 'prediction_cutoff': iso(), 'groups': [
            {'group_id': p['id'], 'candidates': [{'candidate_id': 'offer_%d' % k, 'features': {'price': 500 + k * 1000, 'interest': p['intent']}, 'eligible': True} for k in range(3)]}
            for p in people[-10:]]}))
    else:
        jobs.append(('offer_ranking', '/ai/ml/rank', {'groups': [{'group_id': 'synthetic_group_%d' % n, 'observed_at': iso(-(20 - n) * 86400000), 'candidates': [
            {'candidate_id': 'offer_%d' % k, 'features': {'price': 500 + k * 1000, 'interest': RNG.random()}, 'relevance': (n + k) % 3, 'exposed': True, 'position': k + 1}
            for k in range(3)]} for n in range(20)]}))
    # The specialist estimators are CPU-heavy, so the continuous feed runs them on every tenth AI cycle.
    # The challenger refit also resets its route to unqualified until it is re-qualified, so it is not refitted every minute.
    if VERIFY or ai_runs % 10 == 1:
        jobs.append(('forecast_challenger', '/ai/ml/forecast/catboost-challenger', dict(forecast_input(), lags=[1, 7], holdout_points=14)))
        jobs.append(('forecast_primary', '/ai/ml/forecast/chronos-2', forecast_input()))
        jobs.append(('incrementality', '/ai/ml/incrementality', {
            'rows': causal_rows(), 'treatment_name': 'remarketing_exposure', 'outcome_name': 'revenue_30d',
            'estimand': 'Average effect of remarketing exposure on 30-day revenue', 'minimum_overlap': .05}))
    for task, path, body in jobs:
        if available.get(task):
            step('Local ML pipelines', 'Submit ' + task, lambda task=task, path=path, body=body: submit_ml(task, path, body), 'ml')
    # Each analyst question is a real provider call, so the continuous feed asks one about every fifteen minutes.
    if (VERIFY or ai_runs % 15 == 2) and analyst_active():
        step('AI Intelligence', 'Ask the grounded analyst', ask_analyst, 'ml')
    for task in ('forecast_primary', 'incrementality', 'marketing_mix'):
        if not available.get(task):
            record('Local ML pipelines', task, 'blocked', next((a['detail'] for a in STATE['ai'] if a['task'] == task), None) or 'Optional specialist dependency/checkpoint missing', 'external')


# ---------------------------------------------------------------- reads
READS = []
for _section, _items in SECTIONS:
    for _name, _paths in _items:
        READS.extend((_name, path) for path in _paths)
try:
    _mapped = {path for _, path in READS}
    READS.extend(('Public website', path) for path in json.loads(Path('qa/feature-read-paths.json').read_text(encoding='utf-8')) if path not in _mapped)
except (OSError, ValueError):
    pass
read_index = 0


def describe(payload):
    if isinstance(payload, list):
        return '%d rows' % len(payload)
    if not isinstance(payload, dict):
        return 'scalar'
    lists = {key: len(value) for key, value in payload.items() if isinstance(value, list)}
    biggest = max(lists.items(), key=lambda item: item[1]) if lists else None
    return '%d fields%s' % (len(payload), '; %s: %d rows' % biggest if biggest else '')


def read_sweep(count):
    global read_index
    for _ in range(count):
        feature, path = READS[read_index % len(READS)]
        read_index += 1
        public = path.startswith('/public/') or path in ('/health', '/ready')
        try:
            payload = api(path, auth=not public)
            record(feature, 'GET ' + path, 'pass', 'HTTP 200 · ' + describe(payload), 'read')
        except Exception as error:  # noqa: BLE001
            record(feature, 'GET ' + path, 'fail', str(error), 'read')


# ---------------------------------------------------------------- report
def feature_status(checks):
    statuses = [entry['status'] for entry in checks.values()]
    functional = [s for s in statuses if s != 'blocked']
    if 'fail' in statuses:
        return 'fail'
    if 'pending' in functional:
        return 'pending'
    if functional:
        return 'pass'
    return 'blocked' if statuses else 'not run'


def load_json(path):
    try:
        return json.loads(Path(path).read_text(encoding='utf-8'))
    except (OSError, ValueError):
        return None


def build_report(state, directory):
    """Feature-wise JSON + HTML. Merges browser results and fixed findings when those files exist."""
    directory = Path(directory)
    directory.mkdir(parents=True, exist_ok=True)
    ui = (load_json(directory / 'ui-results.json') or {}).get('features', {})
    findings = load_json(directory / 'findings.json') or []
    open_items = load_json(directory / 'open-items.json') or []
    rows, totals = [], {'pass': 0, 'fail': 0, 'blocked': 0, 'pending': 0, 'not run': 0}
    for section, items in SECTIONS:
        for name, _ in items:
            checks = state['features'].get(name, {}).get('checks', {})
            status = feature_status(checks)
            page = ui.get(name)
            if page and not page.get('ok') and status != 'fail':
                status = 'fail'
            totals[status] += 1
            rows.append({'section': section, 'feature': name, 'status': status, 'ui': page,
                         'passed': sum(1 for c in checks.values() if c['status'] == 'pass'), 'failed': sum(1 for c in checks.values() if c['status'] == 'fail'),
                         'blocked': [dict(name=k, **v) for k, v in checks.items() if v['status'] == 'blocked'],
                         'checks': [dict(name=k, **v) for k, v in checks.items()]})
    summary = {'generatedAt': iso(), 'runId': state['runId'], 'mode': state.get('mode'), 'workspaceId': state['workspaceId'], 'startedAt': state['startedAt'],
               'counters': state['counters'], 'gradeMix': state.get('grades', {}), 'featureTotals': totals, 'findings': findings, 'openItems': open_items,
               'jobs': state.get('jobs', [])[:40], 'features': rows}
    (directory / 'feature-report.json').write_text(json.dumps(summary, indent=1, ensure_ascii=False), encoding='utf-8')
    e = lambda value: html.escape(str(value if value is not None else ''))
    pill = lambda status: '<span class="pill %s">%s</span>' % (e(str(status).replace(' ', '-')), e(str(status).upper()))
    out = ['<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">',
           '<title>AceMarketing feature test report</title><style>',
           ':root{--bg:#f6f7f9;--card:#fff;--ink:#17202e;--mute:#5b6779;--line:#dfe3ea;--pass:#17794a;--fail:#b3261e;--blocked:#8a5a00;--pending:#35548c}',
           '@media(prefers-color-scheme:dark){:root{--bg:#10151d;--card:#182030;--ink:#e8edf7;--mute:#a4b0c4;--line:#2a364a;--pass:#7fdcab;--fail:#ff9a92;--blocked:#ffcf80;--pending:#9dbcff}}',
           'body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.45 system-ui,sans-serif}main{max-width:1180px;margin:0 auto;padding:28px 16px 60px}',
           'h1{font-size:26px;margin:0 0 4px}h2{font-size:18px;margin:34px 0 10px}p,small{color:var(--mute)}',
           '.cards{display:flex;flex-wrap:wrap;gap:12px;margin:18px 0}.cards div{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:12px 16px;min-width:120px}',
           '.cards b{display:block;font-size:24px}.wrap{overflow-x:auto}table{width:100%;border-collapse:collapse;background:var(--card);border:1px solid var(--line);border-radius:10px}',
           'th,td{text-align:left;padding:9px 10px;border-bottom:1px solid var(--line);vertical-align:top}th{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--mute)}',
           '.pill{font-size:11px;font-weight:700;padding:2px 8px;border-radius:99px;border:1px solid currentColor;white-space:nowrap}',
           '.pass{color:var(--pass)}.fail{color:var(--fail)}.blocked{color:var(--blocked)}.pending,.not-run{color:var(--pending)}',
           'details{margin:2px 0}summary{cursor:pointer;color:var(--mute)}li{margin:3px 0}ul{margin:6px 0;padding-left:18px}code{font-size:12.5px;overflow-wrap:anywhere}',
           '</style><main><h1>AceMarketing · feature-wise end-to-end test report</h1>',
           '<p>Run %s · %s mode · workspace %s · generated %s</p>' % (e(state['runId']), e(state.get('mode')), e(state['workspaceId']), e(summary['generatedAt'])),
           '<p>Every row was produced by real HTTP requests against the running local application using synthetic customers. '
           '“Blocked” means the capability needs a real third-party test account; it was not faked.</p><div class="cards">']
    for label, value in [('Features passing', totals['pass']), ('Features failing', totals['fail']), ('Blocked only', totals['blocked']),
                         ('Not run', totals['not run'] + totals['pending']), ('API requests', state['counters']['requests']), ('Unexpected API errors', state['counters']['errors']),
                         ('Customers', state['counters']['customers']), ('Purchases', state['counters']['purchases']), ('ML jobs succeeded', state['counters']['jobsSucceeded'])]:
        out.append('<div><b>%s</b>%s</div>' % (e(value), e(label)))
    out.append('</div>')
    if state.get('grades'):
        out.append('<p>Lead grades assigned by the backend to completed journeys in this run: %s</p>' % e(', '.join('%s: %s' % kv for kv in sorted(state['grades'].items(), key=lambda kv: str(kv[0])))))
    if findings:
        out.append('<h2>Defects found and fixed during this run</h2><div class="wrap"><table><tr><th>#</th><th>Feature</th><th>Symptom</th><th>Root cause</th><th>Fix</th><th>Retest</th></tr>')
        for n, item in enumerate(findings, 1):
            out.append('<tr><td>%d</td><td>%s</td><td>%s</td><td>%s</td><td>%s</td><td>%s</td></tr>' % (
                n, e(item.get('feature')), e(item.get('symptom')), e(item.get('cause')), e(item.get('fix')), pill(item.get('retest', 'pass'))))
        out.append('</table></div>')
    if open_items:
        out.append('<h2>Open items (not changed in this run)</h2><div class="wrap"><table><tr><th>#</th><th>Area</th><th>Observation</th><th>Recommendation</th></tr>')
        for n, item in enumerate(open_items, 1):
            out.append('<tr><td>%d</td><td>%s</td><td>%s</td><td>%s</td></tr>' % (n, e(item.get('area')), e(item.get('observation')), e(item.get('recommendation'))))
        out.append('</table></div>')
    current = None
    for row in rows:
        if row['section'] != current:
            if current:
                out.append('</table></div>')
            current = row['section']
            out.append('<h2>%s</h2><div class="wrap"><table><tr><th>Feature</th><th>Result</th><th>Backend checks</th><th>Frontend page</th><th>Detail</th></tr>' % e(current))
        page = row['ui']
        page_cell = '<small>not tested</small>' if page is None else pill('pass' if page.get('ok') else 'fail') + '<br><small>%s</small>' % e(page.get('detail', ''))
        detail = ['<details><summary>%d checks</summary><ul>' % len(row['checks'])]
        for c in row['checks']:
            detail.append('<li>%s <b>%s</b> <small>(%s ×%s)</small><br><code>%s</code></li>' % (pill(c['status']), e(c['name']), e(c.get('kind')), e(c.get('count')), e(c.get('detail'))))
        detail.append('</ul></details>')
        failed = ''.join('<div class="fail"><b>%s</b>: <code>%s</code></div>' % (e(c['name']), e(c.get('detail'))) for c in row['checks'] if c['status'] == 'fail')
        blocked = ''.join('<div class="blocked"><small>Blocked: %s — %s</small></div>' % (e(b['name']), e(b.get('detail'))) for b in row['blocked'])
        out.append('<tr><td><b>%s</b></td><td>%s</td><td>%d passed · %d failed</td><td>%s</td><td>%s%s%s</td></tr>' % (
            e(row['feature']), pill(row['status']), row['passed'], row['failed'], page_cell, failed, blocked, ''.join(detail)))
    out.append('</table></div></main></html>')
    (directory / 'feature-report.html').write_text('\n'.join(out), encoding='utf-8')
    return summary


def persist():
    with LOCK:
        STATE['updatedAt'] = iso()
        STATE['activeCustomers'] = people[-300:]
        STATE['artifacts'] = list(artifacts.items())
        snapshot = json.dumps(STATE, indent=1, ensure_ascii=False)
        samples = json.dumps(STATE['samples'], indent=1, ensure_ascii=False)
    temporary = DIRECTORY / 'status.tmp'
    temporary.write_text(snapshot, encoding='utf-8')
    temporary.replace(DIRECTORY / 'status.json')
    (DIRECTORY / 'samples.json').write_text(samples, encoding='utf-8')
    build_report(json.loads(snapshot), REPORT_DIR)


# ---------------------------------------------------------------- dashboard
class Dashboard(BaseHTTPRequestHandler):
    def log_message(self, *_):
        pass

    def do_GET(self):  # noqa: N802
        route = self.path.split('?')[0]
        with LOCK:
            if route in ('/status', '/samples', '/features'):
                body, kind = json.dumps(STATE['samples'] if route == '/samples' else STATE['features'] if route == '/features' else STATE).encode(), 'application/json'
            elif route == '/health':
                body, kind = json.dumps({'ok': True, 'generator': STATE['generator'], 'cycles': STATE['counters']['cycles'], 'lastCycleAt': STATE['updatedAt']}).encode(), 'application/json'
            elif route == '/report':
                path = REPORT_DIR / 'feature-report.html'
                body, kind = (path.read_bytes() if path.exists() else b'Report not generated yet'), 'text/html; charset=utf-8'
            elif route == '/':
                page = (ROOT / 'scripts/live/status.html').read_text(encoding='utf-8')
                body, kind = page.replace('<a href="/status">', '<a href="/report">Feature-wise report</a> · <a href="/status">').encode(), 'text/html; charset=utf-8'
            else:
                self.send_error(404)
                return
        self.send_response(200)
        self.send_header('Content-Type', kind)
        self.send_header('Cache-Control', 'no-store')
        self.end_headers()
        self.wfile.write(body)


def sleep(seconds):
    deadline = time.time() + seconds
    while not stopping and time.time() < deadline:
        time.sleep(min(.25, max(0, deadline - time.time())))


def halt(*_):
    global stopping
    stopping = True


def restore():
    """Continuous restarts keep counters, customers in flight and trained artifacts."""
    saved = load_json(DIRECTORY / 'status.json')
    # Only this feed's own snapshot is resumed; another generator's counters and artifacts are not comparable.
    if not saved or saved.get('workspaceId') != WORKSPACE or saved.get('generator') != 'ace_feed.py':
        return
    STATE['counters'].update(saved.get('counters') or {})
    STATE['grades'].update(saved.get('grades') or {})
    people.extend(p for p in saved.get('activeCustomers') or [] if 'band' in p)
    for name, feature in (saved.get('features') or {}).items():
        if name in STATE['features']:
            STATE['features'][name]['checks'].update(feature.get('checks') or {})
    for task, artifact in saved.get('artifacts') or []:
        artifacts[task] = artifact


def main():
    global last_ai
    if 'report-only' in OPTIONS:
        saved = load_json(DIRECTORY / 'status.json')
        if not saved:
            sys.exit('No saved results in %s' % DIRECTORY)
        totals = build_report(saved, REPORT_DIR)['featureTotals']
        print('[feed] Report rebuilt in %s: %s' % (REPORT_DIR, totals))
        return
    DIRECTORY.mkdir(parents=True, exist_ok=True)
    signal.signal(signal.SIGINT, halt)
    signal.signal(signal.SIGTERM, halt)
    server = None
    if not VERIFY:
        if CYCLES == 0:
            restore()
        server = ThreadingHTTPServer(('127.0.0.1', int(ENV.get('ACE_LIVE_STATUS_PORT') or 5174)), Dashboard)
        threading.Thread(target=server.serve_forever, daemon=True).start()
    print('[live feed] ace_feed.py · workspace %s · %d ms interval · synthetic contacts, actual API writes.' % (WORKSPACE, INTERVAL * 1000), flush=True)
    try:
        deadline = time.time() + 120
        while not token and not stopping:
            try:
                login()
            except Exception as error:  # noqa: BLE001
                STATE['coverage']['API connection'] = {'state': 'pending', 'detail': str(error), 'count': 1, 'at': iso()}
                persist()
                if time.time() >= deadline:
                    raise
                sleep(1)
        STATE['coverage'].pop('API connection', None)
        record('Authentication & security', 'Owner login issues a session token', 'pass', 'POST /auth/login returned a bearer token', 'security')
        setup()
        if VERIFY:
            negative_checks()
        read_sweep(len(READS))
        while not stopping and (CYCLES == 0 or STATE['counters']['cycles'] < CYCLES):
            started = time.time()
            try:
                STATE['counters']['cycles'] += 1
                if VERIFY:
                    # One complete journey per lead-quality band, so every grade and both outcomes are proven each cycle.
                    journey = {}
                    for band in range(4):
                        person = step('Live Sync', 'Customer acquisition (consent, visit, lead capture)', lambda band=band: start_customer(band))
                        if person:
                            journey[band] = person
                            for _ in range(4):
                                step('Journeys', 'Funnel stage progression', lambda person=person: advance(person, True))
                    if journey:
                        feature_writes(journey.get(3) or next(iter(journey.values())))
                        visibility_checks(journey)
                else:
                    person = step('Live Sync', 'Customer acquisition (consent, visit, lead capture)', start_customer)
                    for item in [p for p in people if p['phase'] < 4][-12:]:
                        step('Journeys', 'Funnel stage progression', lambda item=item: advance(item))
                    if person:
                        feature_writes(person)
                step('Follow-ups', 'Work the follow-up queue', work_follow_up_queue)
                # One new approval request roughly every twenty minutes keeps the Approvals page active without flooding it.
                if VERIFY or STATE['counters']['cycles'] % 400 == 5:
                    step('Approvals', 'Raise and decide agent approvals', approvals_flow)
                poll_jobs()
                if time.time() - last_ai >= AI_INTERVAL:
                    ai_cycle()
                    last_ai = time.time()
                read_sweep(len(READS) if VERIFY else 8)
                del people[:-300]
                STATE['coverage'].pop('Feed cycle', None)
            except Exception as error:  # noqa: BLE001
                STATE['coverage']['Feed cycle'] = {'state': 'failed', 'detail': str(error), 'count': 1, 'at': iso()}
                print('[live feed] Reconnecting after %s' % error, file=sys.stderr, flush=True)
                try:
                    login()
                    if not resources.get('ready'):
                        setup()
                except Exception:  # noqa: BLE001
                    pass
            persist()
            c = STATE['counters']
            print('[live feed] cycle %d: customers=%d, events=%d, purchases=%d, completed ML jobs=%d, errors=%d' % (
                c['cycles'], c['customers'], c['events'], c['purchases'], c['jobsSucceeded'], c['errors']), flush=True)
            if not stopping and not VERIFY:
                sleep(max(.1, INTERVAL - (time.time() - started)))
        if VERIFY:
            for attempt in range(2):
                deadline = time.time() + 240
                while pending and time.time() < deadline and not stopping:
                    poll_jobs()
                    persist()
                    sleep(1)
                for job in pending.values():
                    record('Local ML pipelines', job['task'], 'fail', 'Job %s did not finish within 240 s' % job['id'], 'ml')
                pending.clear()
                if attempt == 0:
                    ai_cycle()  # second pass scores new customers from the artifacts trained above
            persist()
            summary = build_report(STATE, REPORT_DIR)
            failed = [(row['feature'], c['name'], c['detail']) for row in summary['features'] for c in row['checks'] if c['status'] == 'fail']
            print('[live verify] features: %s · requests %d · unexpected errors %d' % (summary['featureTotals'], STATE['counters']['requests'], STATE['counters']['errors']))
            for feature, name, detail in failed:
                print('  FAIL %s · %s: %s' % (feature, name, detail[:300]))
            print('[live verify] Report: %s' % (REPORT_DIR / 'feature-report.html'))
            if failed:
                return 1
    except Exception as error:  # noqa: BLE001
        STATE['fatal'] = str(error)
        persist()
        print('[live feed] fatal: %s' % error, file=sys.stderr)
        return 1
    finally:
        if server:
            server.shutdown()
    return 0


if __name__ == '__main__':
    sys.exit(main())
