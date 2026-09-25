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
  journeys: () => request('/journeys'),
  attribution: () => request('/attribution'),
  agents: () => request('/agents'),
  audiences: () => request('/audiences'),
  monitoring: () => request('/monitoring'),
}
