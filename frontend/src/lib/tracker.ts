type AceTrackPayload = {
  event: string
  customerId?: string
  email?: string
  phone?: string
  value?: number
  currency?: string
  properties?: Record<string, unknown>
}

const readClickIds = () => {
  const params = new URLSearchParams(window.location.search)
  return {
    gclid: params.get('gclid') || localStorage.getItem('ace:gclid'),
    fbclid: params.get('fbclid') || localStorage.getItem('ace:fbclid'),
  }
}

export const persistClickIds = () => {
  const params = new URLSearchParams(window.location.search)
  const gclid = params.get('gclid')
  const fbclid = params.get('fbclid')
  if (gclid) localStorage.setItem('ace:gclid', gclid)
  if (fbclid) localStorage.setItem('ace:fbclid', fbclid)
}

export const track = async (payload: AceTrackPayload) => {
  const clickIds = readClickIds()
  const body = {
    ...payload,
    ...clickIds,
    pageUrl: window.location.href,
    referrer: document.referrer || null,
    occurredAt: new Date().toISOString(),
  }
  try {
    await fetch('/api/track', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify(body),
      keepalive: true,
    })
  } catch {
    // Tracking must never break the user experience.
  }
}

export const installAceTracking = () => {
  persistClickIds()
  track({event:'page_view'})
}
