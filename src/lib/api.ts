export type DemoRequest = Record<string, FormDataEntryValue>

const request = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(`/api${path}`, {
    headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
    ...init,
  })
  if (!response.ok) throw new Error(`API request failed: ${response.status}`)
  return response.json()
}

export const api = {
  health: () => request<{ ok: boolean; service: string }>('/health'),
  login: (email: string, password: string) =>
    request<{ token: string; user: { email: string; role: string } }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  submitDemo: (payload: DemoRequest) =>
    request<{ id: string; status: string }>('/demo-requests', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  overview: () => request('/workspace/overview'),
  integrations: () => request('/integrations'),
  events: () => request('/events'),
  funnel: () => request('/funnel'),
  liveSync: () => request('/live-sync'),
  offlineAttribution: () => request('/offline-attribution'),
  track: (payload: Record<string, unknown>) => request('/track', { method: 'POST', body: JSON.stringify(payload) }),
  journeys: () => request('/journeys'),
  attribution: () => request('/attribution'),
  agents: () => request('/agents'),
  audiences: () => request('/audiences'),
  behavior: () => request('/behavior'),
  feed: () => request('/feed'),
  solutions: () => request('/solutions'),
  monitoring: () => request('/monitoring'),
  signalConsole: () => request('/signal-console'),
  securityPosture: () => request('/security-posture'),
  resources: () => request('/resources'),
  caseStudies: () => request('/case-studies'),
  aiAction: () => request('/ai-action'),
  sourceNotes: () => request('/source-notes'),
  eventTemplates: () => request('/event-templates'),
  monitoringRules: () => request('/monitoring-rules'),
  saveConsent: (prefs: Record<string, boolean>) => request('/consent-preferences', { method: 'POST', body: JSON.stringify(prefs) }),
}
