// src/feedEngine.js
// ═══════════════════════════════════════════════════════════
// Security Feed Live — Core Engine
// Fetches RSS directly (like your existing useFeedData),
// adds intelligent merge, dedup, validation, polling, offline mode
// ═══════════════════════════════════════════════════════════

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import {
  POLLING_INTERVAL, RECONNECT_INTERVAL, MAX_NEWS,
  MERGE_TIME_WINDOW, SEV_ORDER, SFL_CACHE_KEY, FEED_SOURCES
} from './feedConfig.js'

// ─────────────────────────────────────────
// ID generation (same pattern as your genId)
// ─────────────────────────────────────────
function feedId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

// ─────────────────────────────────────────
// Severity detection (enhanced from your existing SEV_KW)
// ─────────────────────────────────────────
const SEV_KW = {
  critical: [
    'critical', 'rce', 'remote code execution', 'zero-day', '0-day',
    'actively exploited', 'emergency', 'cvss 9', 'cvss 10',
    'supply chain attack', 'wormable', 'unauthenticated', 'pre-auth',
    'nation-state', 'apt'
  ],
  high: [
    'high', 'vulnerability', 'exploit', 'cve-', 'patch', 'flaw',
    'breach', 'ransomware', 'malware', 'attack', 'backdoor', 'trojan',
    'privilege escalation', 'data leak', 'compromised', 'botnet',
    'rootkit', 'spyware', 'data breach', 'hack'
  ],
  medium: [
    'medium', 'update', 'advisory', 'warning', 'phishing', 'scam',
    'suspicious', 'campaign', 'threat', 'risk', 'credential',
    'social engineering'
  ]
}

const CAT_KW = {
  malware: ['malware', 'ransomware', 'trojan', 'worm', 'virus', 'botnet', 'rootkit', 'spyware', 'keylogger', 'cryptominer', 'infostealer', 'loader'],
  breach: ['breach', 'leak', 'exposed', 'stolen', 'compromised', 'data dump', 'database', 'credentials', 'records', 'unauthorized access', 'data exposure'],
  vulnerability: ['vulnerability', 'cve-', 'exploit', 'patch', 'zero-day', '0-day', 'flaw', 'bug', 'buffer overflow', 'injection', 'xss', 'rce', 'privilege escalation', 'security update', 'advisory'],
  phishing: ['phishing', 'social engineering', 'scam', 'fake', 'impersonation', 'credential harvesting', 'spear-phishing', 'bec', 'smishing']
}

function detectSeverity(title, desc) {
  const x = ((title || '') + ' ' + (desc || '')).toLowerCase()
  if (SEV_KW.critical.some(k => x.includes(k))) return 'critical'
  if (SEV_KW.high.some(k => x.includes(k))) return 'high'
  if (SEV_KW.medium.some(k => x.includes(k))) return 'medium'
  return 'low'
}

function detectCategory(title, desc) {
  const x = ((title || '') + ' ' + (desc || '')).toLowerCase()
  for (const [cat, kws] of Object.entries(CAT_KW)) {
    if (kws.some(k => x.includes(k))) return cat
  }
  return 'other'
}

// ─────────────────────────────────────────
// Validation
// ─────────────────────────────────────────
const VALID_CATS = ['malware', 'breach', 'vulnerability', 'phishing', 'other']
const VALID_SEVS = ['low', 'medium', 'high', 'critical']

function cleanText(s) {
  if (!s || typeof s !== 'string') return ''
  return s.replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#039;/g, "'")
    .replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim()
}

function validateItem(item) {
  if (!item || !item.id || !item.title || !item.date) return null
  const d = new Date(item.date)
  if (isNaN(d.getTime())) return null
  return {
    id: String(item.id).trim(),
    title: cleanText(item.title).slice(0, 300) || 'Untitled',
    description: cleanText(item.description).slice(0, 500) || '',
    source: cleanText(item.source).slice(0, 100) || 'Unknown',
    date: d.toISOString(),
    category: VALID_CATS.includes(item.category) ? item.category : 'other',
    severity: VALID_SEVS.includes(item.severity) ? item.severity : 'low',
    link: typeof item.link === 'string' ? item.link.trim() : '',
    fetchedAt: item.fetchedAt || new Date().toISOString(),
  }
}

// ─────────────────────────────────────────
// Deduplication
// ─────────────────────────────────────────
function fuzzyKey(item) {
  const t = (item.title || '').toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim()
  return `${t}|${(item.source || '').toLowerCase().trim()}`
}

function datesClose(a, b) {
  const ta = new Date(a).getTime(), tb = new Date(b).getTime()
  return !isNaN(ta) && !isNaN(tb) && Math.abs(ta - tb) <= MERGE_TIME_WINDOW
}

// ─────────────────────────────────────────
// CORE: Merge without replacement
// ─────────────────────────────────────────
function mergeFeeds(existing, incoming) {
  const byId = new Map()
  const byFuzzy = new Map()

  for (const item of existing) {
    byId.set(item.id, item)
    const fk = fuzzyKey(item)
    const prev = byFuzzy.get(fk)
    if (!prev || new Date(item.date) > new Date(prev.date)) {
      byFuzzy.set(fk, { item, date: item.date })
    }
  }

  for (const newItem of incoming) {
    if (byId.has(newItem.id)) {
      const old = byId.get(newItem.id)
      byId.set(newItem.id, { ...old, ...newItem, fetchedAt: old.fetchedAt || newItem.fetchedAt })
      continue
    }
    const fk = fuzzyKey(newItem)
    const match = byFuzzy.get(fk)
    if (match && datesClose(match.date, newItem.date)) continue
    byId.set(newItem.id, newItem)
    byFuzzy.set(fk, { item: newItem, date: newItem.date })
  }

  let result = Array.from(byId.values())
  result.sort((a, b) => {
    const sa = SEV_ORDER[a.severity] ?? 9, sb = SEV_ORDER[b.severity] ?? 9
    if (sa !== sb) return sa - sb
    return new Date(b.date) - new Date(a.date)
  })

  if (result.length > MAX_NEWS) result = result.slice(0, MAX_NEWS)
  return result
}

// ─────────────────────────────────────────
// RSS Fetcher (direct, like your existing code)
// ─────────────────────────────────────────
async function fetchAllFeeds() {
  const allItems = []

  const results = await Promise.allSettled(
    FEED_SOURCES.map(async (feed) => {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), 12000)
      try {
        const res = await fetch(feed.url, { signal: controller.signal })
        clearTimeout(timer)
        const text = await res.text()
        const xml = new DOMParser().parseFromString(text, 'text/xml')
        const entries = xml.querySelectorAll('item, entry')
        const items = []
        entries.forEach(entry => {
          const title = entry.querySelector('title')?.textContent?.trim() || ''
          const link = entry.querySelector('link')?.textContent?.trim()
            || entry.querySelector('link')?.getAttribute('href') || ''
          const pubDate = entry.querySelector('pubDate, published, date, updated')?.textContent?.trim() || ''
          const desc = entry.querySelector('description, summary, content')?.textContent?.trim() || ''
          if (!title) return
          const cleanTitle = cleanText(title)
          const cleanDesc = cleanText(desc)
          const date = pubDate ? new Date(pubDate).toISOString() : new Date().toISOString()
          if (isNaN(new Date(date).getTime())) return
          items.push({
            id: feedId(),
            title: cleanTitle.slice(0, 300),
            description: cleanDesc.slice(0, 500),
            source: feed.source,
            date,
            category: detectCategory(cleanTitle, cleanDesc),
            severity: detectSeverity(cleanTitle, cleanDesc),
            link: cleanText(link),
            fetchedAt: new Date().toISOString(),
          })
        })
        return items
      } catch (err) {
        clearTimeout(timer)
        console.warn(`[FeedEngine] ${feed.source}: ${err.message}`)
        return []
      }
    })
  )

  let successCount = 0
  for (const r of results) {
    if (r.status === 'fulfilled' && r.value.length > 0) {
      successCount++
      allItems.push(...r.value)
    }
  }

  return { items: allItems, successCount, totalSources: FEED_SOURCES.length }
}

// ─────────────────────────────────────────
// LocalStorage cache
// ─────────────────────────────────────────
function loadCache() {
  try {
    const raw = localStorage.getItem(SFL_CACHE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.slice(0, MAX_NEWS) : []
  } catch { return [] }
}

function saveCache(items) {
  try {
    localStorage.setItem(SFL_CACHE_KEY, JSON.stringify(items.slice(0, MAX_NEWS)))
  } catch {
    try { localStorage.removeItem(SFL_CACHE_KEY) } catch {}
  }
}

// ═══════════════════════════════════════════
// MAIN HOOK
// ═══════════════════════════════════════════
export function useFeedEngine() {
  const [items, setItems] = useState(() => loadCache())
  const [newCount, setNewCount] = useState(0)
  const [pollMs, setPollMs] = useState(POLLING_INTERVAL)
  const [sys, setSys] = useState({
    status: 'offline',
    lastUpdated: null,
    isUpdating: false,
    totalNews: 0,
    errorCount: 0,
    lastError: null,
  })

  const itemsRef = useRef(items)
  const pollRef = useRef(null)
  const mountedRef = useRef(true)
  const errCntRef = useRef(0)

  useEffect(() => { itemsRef.current = items }, [items])

  const performUpdate = useCallback(async () => {
    if (!mountedRef.current) return
    setSys(p => ({ ...p, isUpdating: true }))

    try {
      const { items: rawItems, successCount, totalSources } = await fetchAllFeeds()
      if (!mountedRef.current) return

      const valid = rawItems.map(validateItem).filter(Boolean)

      if (valid.length === 0 && itemsRef.current.length > 0) {
        errCntRef.current = 0
        setSys(p => ({
          ...p, isUpdating: false, errorCount: 0, lastError: null,
          status: successCount > 0 ? 'online' : 'slow',
          lastUpdated: new Date().toISOString(),
          totalNews: itemsRef.current.length,
        }))
        return
      }

      const existingIds = new Set(itemsRef.current.map(i => i.id))
      // For fuzzy-based new count we just use the merge delta
      const beforeCount = itemsRef.current.length

      const merged = mergeFeeds(itemsRef.current, valid)
      const trulyNew = Math.max(0, merged.length - beforeCount)

      setItems(merged)
      saveCache(merged)
      if (trulyNew > 0) setNewCount(p => p + trulyNew)

      errCntRef.current = 0
      const apiStatus = successCount >= totalSources / 2 ? 'online' : 'slow'
      setSys({
        status: apiStatus,
        lastUpdated: new Date().toISOString(),
        isUpdating: false,
        totalNews: merged.length,
        errorCount: 0,
        lastError: null,
      })
    } catch (err) {
      if (!mountedRef.current) return
      errCntRef.current += 1
      setSys(p => ({
        ...p, status: 'offline', isUpdating: false,
        errorCount: errCntRef.current,
        lastError: err.message || 'Connection lost',
      }))
    }
  }, [])

  // Initial load
  useEffect(() => {
    mountedRef.current = true
    performUpdate()
    return () => { mountedRef.current = false }
  }, []) // eslint-disable-line

  // Polling
  useEffect(() => {
    if (pollRef.current) clearInterval(pollRef.current)
    const interval = sys.status === 'offline' ? RECONNECT_INTERVAL : pollMs
    pollRef.current = setInterval(performUpdate, interval)
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [pollMs, sys.status, performUpdate])

  const sevCounts = useMemo(() => ({
    critical: items.filter(i => i.severity === 'critical').length,
    high: items.filter(i => i.severity === 'high').length,
    medium: items.filter(i => i.severity === 'medium').length,
    low: items.filter(i => i.severity === 'low').length,
  }), [items])

  const catCounts = useMemo(() => ({
    all: items.length,
    malware: items.filter(i => i.category === 'malware').length,
    breach: items.filter(i => i.category === 'breach').length,
    vulnerability: items.filter(i => i.category === 'vulnerability').length,
    phishing: items.filter(i => i.category === 'phishing').length,
    other: items.filter(i => i.category === 'other').length,
  }), [items])

  return {
    items, newCount, sevCounts, catCounts,
    sys: { ...sys, totalNews: items.length },
    pollMs,
    refresh: useCallback(() => { setNewCount(0); performUpdate() }, [performUpdate]),
    setPollMs: useCallback((ms) => setPollMs(Math.max(10000, Math.min(60000, ms))), []),
    clearNew: useCallback(() => setNewCount(0), []),
  }
}