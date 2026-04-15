// src/feedApi.js
// ═══════════════════════════════════════════
// Security Feed Live — API Layer
// ❌ ALL fetch calls go through here
// ❌ NO direct fetch in components
// ═══════════════════════════════════════════

import { API_BASE_URL, REQUEST_TIMEOUT } from './feedConfig.js'

// ── Request helper with timeout ──
async function request(endpoint) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT)
  const url = `${API_BASE_URL}${endpoint}`

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'Accept': 'application/json' },
    })
    clearTimeout(timer)
    if (!res.ok) throw new FeedApiError(`HTTP ${res.status}`, res.status)
    const json = await res.json()
    if (json.success === false) throw new FeedApiError(json.error || 'API error', 0)
    return json
  } catch (err) {
    clearTimeout(timer)
    if (err instanceof FeedApiError) throw err
    if (err.name === 'AbortError') throw new FeedApiError('Request timeout', 408)
    throw new FeedApiError(err.message || 'Network error', 0)
  }
}

export class FeedApiError extends Error {
  constructor(message, status) {
    super(message)
    this.name = 'FeedApiError'
    this.status = status
  }
}

/** Fetch full feed (initial load / manual refresh) */
export async function fetchFullFeed() {
  const result = await request('/api/feed?limit=250')
  return { data: result.data || [], meta: result.meta || {} }
}

/** Fetch incremental updates since a timestamp */
export async function fetchFeedSince(sinceISO) {
  const result = await request(`/api/feed?since=${encodeURIComponent(sinceISO)}&limit=100`)
  return { data: result.data || [], meta: result.meta || {} }
}

/** Health check — also measures latency */
export async function checkHealth() {
  const start = Date.now()
  try {
    await request('/api/health')
    const latency = Date.now() - start
    return { ok: true, latency, status: latency < 2000 ? 'online' : 'slow' }
  } catch {
    return { ok: false, latency: -1, status: 'offline' }
  }
}