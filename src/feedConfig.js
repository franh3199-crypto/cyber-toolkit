// src/feedConfig.js
// ═══════════════════════════════════════════
// Security Feed Live — Central Configuration
// ═══════════════════════════════════════════

// Polling
export const POLLING_INTERVAL = 15000
export const RECONNECT_INTERVAL = 20000
export const MIN_POLLING = 10000
export const MAX_POLLING = 60000

// Data limits
export const MAX_NEWS = 250
export const MERGE_TIME_WINDOW = 5 * 60 * 1000

// Severity
export const SEV_ORDER = { critical: 0, high: 1, medium: 2, low: 3 }

export const SEV_CONFIG = {
  critical: { order: 0, color: '#FF4444', bg: 'rgba(255,68,68,0.10)', border: 'rgba(255,68,68,0.25)', emoji: '🔴', pulse: true },
  high:     { order: 1, color: '#FF8C00', bg: 'rgba(255,140,0,0.10)', border: 'rgba(255,140,0,0.25)', emoji: '🟠', pulse: false },
  medium:   { order: 2, color: '#FFD700', bg: 'rgba(255,215,0,0.10)', border: 'rgba(255,215,0,0.25)', emoji: '🟡', pulse: false },
  low:      { order: 3, color: '#58A6FF', bg: 'rgba(88,166,255,0.10)', border: 'rgba(88,166,255,0.25)', emoji: '🔵', pulse: false },
}

// Categories
export const FEED_CATEGORIES = [
  { key: 'all',           emoji: '📡' },
  { key: 'malware',       emoji: '🦠' },
  { key: 'breach',        emoji: '💥' },
  { key: 'vulnerability', emoji: '🔓' },
  { key: 'phishing',      emoji: '🎣' },
  { key: 'other',         emoji: '📋' },
]

// RSS Sources — uses allorigins proxy (same pattern your project already uses)
export const FEED_SOURCES = [
  { url: 'https://api.allorigins.win/raw?url=' + encodeURIComponent('https://feeds.feedburner.com/TheHackersNews'), source: 'The Hacker News' },
  { url: 'https://api.allorigins.win/raw?url=' + encodeURIComponent('https://www.bleepingcomputer.com/feed/'), source: 'BleepingComputer' },
  { url: 'https://api.allorigins.win/raw?url=' + encodeURIComponent('https://nvd.nist.gov/feeds/xml/cve/misc/nvd-rss.xml'), source: 'NVD / CVE' },
  { url: 'https://api.allorigins.win/raw?url=' + encodeURIComponent('https://securelist.com/feed/'), source: 'Securelist' },
  { url: 'https://api.allorigins.win/raw?url=' + encodeURIComponent('https://www.darkreading.com/rss.xml'), source: 'Dark Reading' },
  { url: 'https://api.allorigins.win/raw?url=' + encodeURIComponent('https://threatpost.com/feed/'), source: 'Threatpost' },
]

// LocalStorage keys (prefixed to avoid collision with existing cybertoolkit-* keys)
export const SFL_CACHE_KEY = 'sfl-feed-cache'