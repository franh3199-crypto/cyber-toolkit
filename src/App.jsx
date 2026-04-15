import { useState, useEffect, useRef, useMemo, useCallback, createContext, useContext } from 'react'
import './themes.css'
import { TRANSLATIONS, getSavedLang, saveLang } from './i18n.js'
import SecurityFeedLive from './SecurityFeedLive.jsx'

// ════════════════════════════════════════════════════
// LANGUAGE CONTEXT
// ════════════════════════════════════════════════════
const LangContext = createContext({ lang: 'es', t: TRANSLATIONS.es, setLang: () => {} })
export function useLang() { return useContext(LangContext) }

// ════════════════════════════════════════════════════
// STORAGE
// ════════════════════════════════════════════════════
const DB_KEY = 'cybertoolkit-db'
const SESSION_KEY = 'cybertoolkit-session'
const SETTINGS_KEY = 'cybertoolkit-settings'
const FAVS_KEY = 'cybertoolkit-favorites'
const ALERTS_KEY = 'cybertoolkit-seen-alerts'
const FEED_CACHE_KEY = 'cybertoolkit-feed-cache'
const COMMANDS_KEY = 'cybertoolkit-commands'
const THEME_KEY = 'cybertoolkit-theme'

function genId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8) }
function simpleHash(str) { let h = 0; for (let i = 0; i < str.length; i++) { h = ((h << 5) - h + str.charCodeAt(i)) | 0 }; return 'h$' + Math.abs(h).toString(16) + '$' + str.length }
function safeJSON(key, fb) { try { return JSON.parse(localStorage.getItem(key)) || fb } catch { return fb } }
function saveJSON(key, d) { localStorage.setItem(key, JSON.stringify(d)) }
function getDB() { return safeJSON(DB_KEY, {}) }
function saveDB(db) { saveJSON(DB_KEY, db) }
function getSession() { return safeJSON(SESSION_KEY, null) }
function saveSession(s) { saveJSON(SESSION_KEY, s) }
function clearSession() { localStorage.removeItem(SESSION_KEY) }
function getSettings(u) { const a = safeJSON(SETTINGS_KEY, {}); return a[u] || { theme: 'pro-dark' } }
function saveSettings(u, s) { const a = safeJSON(SETTINGS_KEY, {}); a[u] = s; saveJSON(SETTINGS_KEY, a) }
function getUserData(u) { const db = getDB(); if (!db[u] || !db[u].notes) { db[u] = { ...db[u], _hash: db[u]?._hash, notes: db[u]?.notes || [], folders: db[u]?.folders || ['General', 'Security', 'Recon', 'Tools'], tags: [] }; saveDB(db) }; return db[u] }
function saveUserData(u, d) { const db = getDB(); db[u] = d; saveDB(db) }
function getUserFavs(u) { const a = safeJSON(FAVS_KEY, {}); return a[u] || { feeds: [], notes: [], commands: [] } }
function saveUserFavs(u, f) { const a = safeJSON(FAVS_KEY, {}); a[u] = f; saveJSON(FAVS_KEY, a) }
function getUserCommands(u) { const a = safeJSON(COMMANDS_KEY, {}); return a[u] || [] }
function saveUserCommands(u, c) { const a = safeJSON(COMMANDS_KEY, {}); a[u] = c; saveJSON(COMMANDS_KEY, a) }
function getSeenAlerts() { return safeJSON(ALERTS_KEY, []) }
function saveSeenAlerts(ids) { saveJSON(ALERTS_KEY, ids) }
function getFeedCache() { return safeJSON(FEED_CACHE_KEY, { items: [], ts: 0 }) }
function saveFeedCache(items) { saveJSON(FEED_CACHE_KEY, { items, ts: Date.now() }) }

function applyTheme(key) {
  document.body.setAttribute('data-theme', key)
  document.documentElement.setAttribute('data-theme', key)
  localStorage.setItem(THEME_KEY, key)
}
function getSavedTheme() { return localStorage.getItem(THEME_KEY) || 'pro-dark' }

const THEMES_LIST = [
  { key: 'pro-dark', name: 'Pro Dark', emoji: '🌑', desc: 'VS Code inspired' },
  { key: 'cyber-terminal', name: 'Cyber Terminal', emoji: '🟢', desc: 'Hacker green' },
  { key: 'minimal-light', name: 'Minimal Light', emoji: '☀️', desc: 'Notion inspired' },
]

// ════════════════════════════════════════════════════
// TIME AGO
// ════════════════════════════════════════════════════
function useTimeAgo() {
  const { t } = useLang()
  return useCallback((dateStr) => {
    const now = Date.now()
    const d = new Date(dateStr).getTime()
    const diff = now - d
    const mins = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)
    if (mins < 1) return t.justNow
    if (mins < 60) return `${mins}${t.minsAgo}`
    if (hours < 24) return `${hours}${t.hoursAgo}`
    if (days === 0) return t.today
    if (days === 1) return t.yesterday
    if (days < 30) return `${days}${t.daysAgo}`
    return new Date(dateStr).toLocaleDateString()
  }, [t])
}

// ════════════════════════════════════════════════════
// MARKDOWN
// ════════════════════════════════════════════════════
function parseMD(text) {
  if (!text) return ''
  let h = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  h = h.replace(/```(\w*)\n([\s\S]*?)```/g, (_, l, c) => `<pre><code class="lang-${l||'text'}">${c.trim()}</code></pre>`)
  h = h.replace(/`([^`]+)`/g, '<code>$1</code>')
  h = h.replace(/^### (.+)$/gm, '<h3>$1</h3>')
  h = h.replace(/^## (.+)$/gm, '<h2>$1</h2>')
  h = h.replace(/^# (.+)$/gm, '<h1>$1</h1>')
  h = h.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  h = h.replace(/\*(.+?)\*/g, '<em>$1</em>')
  h = h.replace(/~~(.+?)~~/g, '<del>$1</del>')
  h = h.replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>')
  h = h.replace(/^---$/gm, '<hr/>')
  h = h.replace(/^- \[x\] (.+)$/gm, '<li><input type="checkbox" checked disabled/> <span style="text-decoration:line-through;opacity:0.5">$1</span></li>')
  h = h.replace(/^- \[ \] (.+)$/gm, '<li><input type="checkbox" disabled/> $1</li>')
  h = h.replace(/^- (.+)$/gm, '<li>$1</li>')
  h = h.replace(/^\d+\. (.+)$/gm, '<li>$1</li>')
  h = h.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
  h = h.replace(/\[\[([^\]]+)\]\]/g, '<span class="backlink" style="color:var(--ct-purple);cursor:pointer;border-bottom:1px dashed var(--ct-purple)">🔗 $1</span>')
  h = h.replace(/^(?!<[a-z/])((?!^\s*$).+)$/gm, (m) => /^</.test(m.trim()) ? m : `<p>${m}</p>`)
  return h
}

// ════════════════════════════════════════════════════
// ICONS
// ════════════════════════════════════════════════════
const I = {
  shield: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"/></svg>,
  note: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"/></svg>,
  folder: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z"/></svg>,
  search: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"/></svg>,
  plus: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15"/></svg>,
  trash: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"/></svg>,
  edit: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10"/></svg>,
  x: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>,
  check: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5"/></svg>,
  download: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"/></svg>,
  upload: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"/></svg>,
  eye: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"/><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>,
  eyeOff: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88"/></svg>,
  logout: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9"/></svg>,
  settings: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z"/><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>,
  terminal: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 7.5l3 2.25-3 2.25m4.5 0h3m-9 8.25h13.5A2.25 2.25 0 0021 18V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v12a2.25 2.25 0 002.25 2.25z"/></svg>,
  rss: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><circle cx="6" cy="18" r="2" fill="currentColor"/><path d="M4 4a14 14 0 0114 14"/><path d="M4 9a9 9 0 019 9"/></svg>,
  menu: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"/></svg>,
  clock: <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>,
  tag: <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z"/><path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z"/></svg>,
  copy: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9.75a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184"/></svg>,
  history: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182"/></svg>,
  move: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5"/></svg>,
  alert: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"/></svg>,
  refresh: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182"/></svg>,
  star: <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>,
  starO: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"/></svg>,
  link: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244"/></svg>,
  calendar: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"/></svg>,
  dashboard: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z"/></svg>,
  heart: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"/></svg>,
  code: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5"/></svg>,
  save: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z"/></svg>,
  globe: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418"/></svg>,
  live: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M9.348 14.651a3.75 3.75 0 010-5.303m5.304 0a3.75 3.75 0 010 5.303m-7.425 2.122a6.75 6.75 0 010-9.546m9.546 0a6.75 6.75 0 010 9.546M5.106 18.894c-3.808-3.808-3.808-9.98 0-13.789m13.788 0c3.808 3.808 3.808 9.981 0 13.79M12 12h.008v.007H12V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"/></svg>,
}

// ════════════════════════════════════════════════════
// SKELETON LOADER
// ════════════════════════════════════════════════════
function Skeleton({ lines = 3 }) {
  return (
    <div className="space-y-4 p-4">
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="space-y-2 ct-stagger" style={{ animationDelay: `${i * 80}ms` }}>
          <div className="ct-skeleton h-4 w-3/4" />
          <div className="ct-skeleton h-3 w-full" />
          <div className="ct-skeleton h-3 w-5/6" />
        </div>
      ))}
    </div>
  )
}

// ════════════════════════════════════════════════════
// TOAST
// ════════════════════════════════════════════════════
function Toast({ msg, type = 'success', onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 3000); return () => clearTimeout(t) }, [onClose])
  const icons = { success: I.check, error: I.x, info: I.shield, warning: I.alert }
  const cls = { success: 'ct-btn-green', error: 'ct-btn-danger', info: 'ct-btn-accent', warning: 'ct-btn-warning' }
  return (
    <div className={`fixed bottom-6 right-6 z-[100] ct-slide-down ct-glass rounded-xl px-5 py-3.5 shadow-2xl flex items-center gap-3`} style={{ borderColor: 'var(--ct-border)' }}>
      <span className={cls[type]} style={{ background: 'none', border: 'none', padding: 0 }}>{icons[type]}</span>
      <span className="text-sm font-medium" style={{ color: 'var(--ct-text)' }}>{msg}</span>
    </div>
  )
}

// ════════════════════════════════════════════════════
// AUTH SCREEN
// ════════════════════════════════════════════════════
function AuthScreen({ onLogin }) {
  const { t } = useLang()
  const [mode, setMode] = useState('login')
  const [user, setUser] = useState('')
  const [pass, setPass] = useState('')
  const [showP, setShowP] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  function handleSubmit(e) {
    e.preventDefault(); setError('')
    if (!user.trim() || !pass.trim()) { setError(t.fillAllFields); return }
    if (pass.length < 4) { setError(t.minPass); return }
    if (user.length < 3) { setError(t.minUser); return }
    setLoading(true)
    setTimeout(() => {
      const db = getDB(); const hashed = simpleHash(pass)
      if (mode === 'register') {
        if (db[user] && db[user]._hash) { setError(t.userExists); setLoading(false); return }
        db[user] = { _hash: hashed, notes: [], folders: ['General', 'Security', 'Recon', 'Tools'], tags: [] }
        saveDB(db); const s = { username: user }; saveSession(s); onLogin(s)
      } else {
        if (!db[user] || !db[user]._hash) { setError(t.userNotFound); setLoading(false); return }
        if (db[user]._hash !== hashed) { setError(t.wrongPass); setLoading(false); return }
        const s = { username: user }; saveSession(s); onLogin(s)
      }
      setLoading(false)
    }, 400)
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12" style={{ background: 'var(--ct-bg)' }}>
      <div className="w-full max-w-md space-y-8 ct-fade-in">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl ct-card mx-auto relative">
            <span style={{ color: 'var(--ct-accent)' }} className="scale-150">{I.terminal}</span>
            <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full animate-pulse" style={{ background: 'var(--ct-accent-alt)' }} />
          </div>
          <div>
            <h1 className="text-4xl font-extrabold font-display tracking-tight" style={{ color: 'var(--ct-text-heading)' }}>Cyber<span style={{ color: 'var(--ct-accent)' }}>Toolkit</span></h1>
            <p className="text-sm mt-2 font-mono" style={{ color: 'var(--ct-text-muted)' }}>// Security Dashboard v2.0</p>
          </div>
        </div>
        <div className="ct-card p-8 shadow-2xl">
          <div className="flex mb-6 rounded-xl p-1" style={{ background: 'var(--ct-bg)', border: '1px solid var(--ct-border)' }}>
            <button onClick={() => { setMode('login'); setError('') }} className="flex-1 py-2.5 rounded-lg text-sm font-bold transition-all" style={mode === 'login' ? { background: 'var(--ct-bg-card)', color: 'var(--ct-accent)' } : { color: 'var(--ct-text-muted)' }}>⚡ {t.login}</button>
            <button onClick={() => { setMode('register'); setError('') }} className="flex-1 py-2.5 rounded-lg text-sm font-bold transition-all" style={mode === 'register' ? { background: 'var(--ct-bg-card)', color: 'var(--ct-accent-alt)' } : { color: 'var(--ct-text-muted)' }}>🔧 {t.register}</button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest ml-1 font-mono" style={{ color: 'var(--ct-text-muted)' }}>{'>'} {t.username}</label>
              <input type="text" value={user} onChange={e => setUser(e.target.value)} placeholder="hacker_name" className="w-full ct-input px-4 py-3 text-sm font-mono" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest ml-1 font-mono" style={{ color: 'var(--ct-text-muted)' }}>{'>'} {t.password}</label>
              <div className="relative">
                <input type={showP ? 'text' : 'password'} value={pass} onChange={e => setPass(e.target.value)} placeholder="••••••••" className="w-full ct-input px-4 pr-12 py-3 text-sm font-mono" />
                <button type="button" onClick={() => setShowP(!showP)} className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors" style={{ color: 'var(--ct-text-muted)' }}>{showP ? I.eyeOff : I.eye}</button>
              </div>
            </div>
            {error && <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm ct-slide-down font-mono" style={{ background: 'var(--ct-danger-10)', border: '1px solid var(--ct-danger-25)', color: 'var(--ct-danger)' }}>{I.alert} {error}</div>}
            <button type="submit" disabled={loading} className="w-full ct-btn ct-btn-accent font-bold py-3.5 text-sm disabled:opacity-50 flex items-center justify-center gap-2">
              {loading ? <span className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" /> : <>{mode === 'login' ? t.accessTerminal : t.createAccount}</>}
            </button>
          </form>
        </div>
        <p className="text-center text-[11px] font-mono" style={{ color: 'var(--ct-text-muted)' }}>{t.localData}</p>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════
// FEED HOOK (original — kept for legacy "Security Feed" tab)
// ════════════════════════════════════════════════════
const FEED_URLS = [
  { url: 'https://api.allorigins.win/raw?url=' + encodeURIComponent('https://feeds.feedburner.com/TheHackersNews'), source: 'The Hacker News' },
  { url: 'https://api.allorigins.win/raw?url=' + encodeURIComponent('https://www.bleepingcomputer.com/feed/'), source: 'BleepingComputer' },
  { url: 'https://api.allorigins.win/raw?url=' + encodeURIComponent('https://nvd.nist.gov/feeds/xml/cve/misc/nvd-rss.xml'), source: 'NVD / CVE' },
]
const SEV_KW_LEGACY = { CRITICAL: ['critical','rce','remote code execution','zero-day','0-day','actively exploited','emergency','cvss 9','cvss 10'], HIGH: ['high','vulnerability','exploit','cve-','patch','flaw','breach','ransomware','malware','attack','backdoor','trojan'], MEDIUM: ['medium','update','advisory','warning','phishing','scam'] }
function detectSev(title, desc) { const x = ((title||'') + ' ' + (desc||'')).toLowerCase(); if (SEV_KW_LEGACY.CRITICAL.some(k => x.includes(k))) return 'CRITICAL'; if (SEV_KW_LEGACY.HIGH.some(k => x.includes(k))) return 'HIGH'; if (SEV_KW_LEGACY.MEDIUM.some(k => x.includes(k))) return 'MEDIUM'; return 'INFO' }

function useFeedData() {
  const [items, setItems] = useState(() => getFeedCache().items)
  const [loading, setLoading] = useState(false)
  const [lastUpdate, setLastUpdate] = useState(() => { const c = getFeedCache(); return c.ts ? new Date(c.ts) : null })
  const [newCriticals, setNewCriticals] = useState([])

  const fetchFeeds = useCallback(async (force = false) => {
    const cache = getFeedCache()
    if (!force && cache.items.length > 0 && Date.now() - cache.ts < 4 * 60 * 1000) {
      setItems(cache.items); setLastUpdate(new Date(cache.ts)); return
    }
    setLoading(true)
    const allItems = []
    for (const feed of FEED_URLS) {
      try {
        const res = await fetch(feed.url)
        const text = await res.text()
        const xml = new DOMParser().parseFromString(text, 'text/xml')
        xml.querySelectorAll('item, entry').forEach(entry => {
          const title = entry.querySelector('title')?.textContent?.trim() || ''
          const link = entry.querySelector('link')?.textContent?.trim() || entry.querySelector('link')?.getAttribute('href') || ''
          const pubDate = entry.querySelector('pubDate, published, date, updated')?.textContent?.trim() || ''
          const desc = entry.querySelector('description, summary, content')?.textContent?.trim() || ''
          if (title) allItems.push({ id: genId(), title: title.replace(/<[^>]*>/g, ''), link, date: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(), source: feed.source, severity: detectSev(title, desc), description: desc.replace(/<[^>]*>/g, '').slice(0, 200) })
        })
      } catch (e) { console.warn(`Feed error (${feed.source}):`, e) }
    }
    const sevOrd = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, INFO: 3 }
    allItems.sort((a, b) => sevOrd[a.severity] !== sevOrd[b.severity] ? sevOrd[a.severity] - sevOrd[b.severity] : new Date(b.date) - new Date(a.date))
    const sliced = allItems.slice(0, 50)
    saveFeedCache(sliced); setItems(sliced); setLastUpdate(new Date()); setLoading(false)
    const seen = getSeenAlerts()
    const crits = sliced.filter(i => i.severity === 'CRITICAL' && !seen.includes(i.title))
    if (crits.length > 0) { setNewCriticals(crits); saveSeenAlerts([...seen, ...crits.map(c => c.title)].slice(-100)) }
  }, [])

  useEffect(() => { fetchFeeds(); const iv = setInterval(() => fetchFeeds(), 5 * 60 * 1000); return () => clearInterval(iv) }, [fetchFeeds])
  return { items, loading, lastUpdate, fetchFeeds, newCriticals, clearAlerts: () => setNewCriticals([]) }
}

// ════════════════════════════════════════════════════
// SECURITY FEED (original tab — unchanged)
// ════════════════════════════════════════════════════
function SecurityFeed({ feedData, username }) {
  const { t } = useLang()
  const timeAgo = useTimeAgo()
  const { items, loading, lastUpdate, fetchFeeds } = feedData
  const [filterSev, setFilterSev] = useState('ALL')
  const [, fu] = useState(0)
  const filtered = filterSev === 'ALL' ? items : items.filter(i => i.severity === filterSev)
  const display = filtered.slice(0, 30)
  const counts = useMemo(() => ({ CRITICAL: items.filter(i => i.severity === 'CRITICAL').length, HIGH: items.filter(i => i.severity === 'HIGH').length, MEDIUM: items.filter(i => i.severity === 'MEDIUM').length, INFO: items.filter(i => i.severity === 'INFO').length }), [items])

  function toggleFav(item) { const f = getUserFavs(username); const idx = f.feeds.findIndex(fi => fi.title === item.title); if (idx >= 0) f.feeds.splice(idx, 1); else f.feeds.push({ title: item.title, link: item.link, source: item.source, severity: item.severity, date: item.date }); saveUserFavs(username, f); fu(x => x + 1) }
  function isFav(title) { return getUserFavs(username).feeds.some(f => f.title === title) }

  const badgeCls = { CRITICAL: 'ct-badge-critical', HIGH: 'ct-badge-high', MEDIUM: 'ct-badge-medium', INFO: 'ct-badge-info' }
  const sevLabels = { CRITICAL: t.critical, HIGH: t.high, MEDIUM: t.medium, INFO: t.info }

  return (
    <div className="space-y-5 ct-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2 font-display" style={{ color: 'var(--ct-text-heading)' }}><span style={{ color: 'var(--ct-danger)' }} className="animate-pulse">●</span> {t.feedTitle}</h2>
          <p className="text-xs font-mono mt-1" style={{ color: 'var(--ct-text-muted)' }}>{lastUpdate ? `${t.lastUpdate}: ${timeAgo(lastUpdate.toISOString())} • ${items.length} ${t.items} • ${t.autoRefresh}` : t.loadingFeeds}</p>
        </div>
        <button onClick={() => fetchFeeds(true)} disabled={loading} className="ct-btn ct-btn-accent disabled:opacity-50">
          <span className={loading ? 'animate-spin' : ''}>{I.refresh}</span>{loading ? t.scanning : t.refresh}
        </button>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {[['CRITICAL', t.critical, counts.CRITICAL], ['HIGH', t.high, counts.HIGH], ['MEDIUM', t.medium, counts.MEDIUM], ['INFO', t.info, counts.INFO]].map(([k, label, count]) => (
          <button key={k} onClick={() => setFilterSev(filterSev === k ? 'ALL' : k)} className={`ct-card p-3 text-left transition-all ${filterSev === k ? '!border-[var(--ct-accent)]' : ''}`}>
            <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--ct-text-muted)' }}>{label}</p>
            <p className="text-xl font-mono font-bold mt-1" style={{ color: k === 'CRITICAL' ? 'var(--ct-danger)' : k === 'HIGH' ? 'var(--ct-warning)' : k === 'MEDIUM' ? 'var(--ct-accent)' : 'var(--ct-text-muted)' }}>{count}</p>
          </button>
        ))}
      </div>
      {filterSev !== 'ALL' && <button onClick={() => setFilterSev('ALL')} className="text-xs hover:underline font-mono" style={{ color: 'var(--ct-accent)' }}>{t.showAll}</button>}
      {loading && items.length === 0 ? <Skeleton lines={5} /> : (
        <div className="space-y-3">
          {display.map((item, i) => {
            const fav = isFav(item.title)
            return (
              <div key={item.id} className="ct-card p-4 group ct-stagger" style={{ animationDelay: `${i * 30}ms` }}>
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1.5">
                      <span className={`ct-badge ${badgeCls[item.severity]}`}>{item.severity === 'CRITICAL' && '🔴 '}{sevLabels[item.severity]}</span>
                      <span className="text-[10px] font-mono" style={{ color: 'var(--ct-text-muted)' }}>{item.source}</span>
                      <span className="text-[10px] flex items-center gap-1" style={{ color: 'var(--ct-text-muted)' }}>{I.clock} {timeAgo(item.date)}</span>
                    </div>
                    <a href={item.link} target="_blank" rel="noopener noreferrer" className="text-sm font-bold hover:underline underline-offset-2 leading-snug block" style={{ color: item.severity === 'CRITICAL' ? 'var(--ct-danger)' : item.severity === 'HIGH' ? 'var(--ct-warning)' : 'var(--ct-accent)' }}>{item.title}</a>
                    {item.description && <p className="text-xs mt-1.5 line-clamp-2 leading-relaxed" style={{ color: 'var(--ct-text-muted)' }}>{item.description}</p>}
                  </div>
                  <div className="flex flex-col gap-1 flex-shrink-0">
                    <button onClick={() => toggleFav(item)} className={`p-1.5 rounded-lg transition-all ${fav ? '' : 'opacity-0 group-hover:opacity-100'}`} style={{ color: fav ? 'var(--ct-warning)' : 'var(--ct-text-muted)' }}>{fav ? I.star : I.starO}</button>
                    <a href={item.link} target="_blank" rel="noopener noreferrer" className="p-1.5 opacity-0 group-hover:opacity-100 transition-colors" style={{ color: 'var(--ct-text-muted)' }}>{I.link}</a>
                  </div>
                </div>
              </div>
            )
          })}
          {display.length === 0 && <div className="text-center py-12 font-mono text-sm" style={{ color: 'var(--ct-text-muted)' }}>{t.noMatchFilter}</div>}
        </div>
      )}
    </div>
  )
}

// ════════════════════════════════════════════════════
// COMMANDS
// ════════════════════════════════════════════════════
function CommandsPanel({ username, commandsDB }) {
  const { t } = useLang()
  const [search, setSearch] = useState('')
  const [activeCat, setActiveCat] = useState('All')
  const [copiedId, setCopiedId] = useState(null)
  const [toast, setToast] = useState(null)
  const [visibleCount, setVisibleCount] = useState(20)
  const [, fu] = useState(0)

  const availCats = useMemo(() => { const s = new Set(commandsDB.map(c => c.category)); return ['All', ...Array.from(s).sort()] }, [commandsDB])

  const filtered = useMemo(() => commandsDB.filter(c => {
    if (activeCat !== 'All' && c.category !== activeCat) return false
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return c.name.toLowerCase().includes(q) || c.command.toLowerCase().includes(q) || c.category.toLowerCase().includes(q) || c.description?.toLowerCase().includes(q)
  }), [search, activeCat, commandsDB])

  const display = filtered.slice(0, visibleCount)

  async function copyCmd(id, cmd) { try { await navigator.clipboard.writeText(cmd); setCopiedId(id); setTimeout(() => setCopiedId(null), 2000) } catch {} }

  function saveCmd(cmd) {
    const cmds = getUserCommands(username)
    if (cmds.find(c => c.name === cmd.name && c.cmd === cmd.command)) { setToast({ msg: t.alreadySaved, type: 'info' }); return }
    cmds.unshift({ id: genId(), name: cmd.name, cmd: cmd.command, cat: cmd.category, lang: 'bash', desc: cmd.description, savedAt: Date.now() })
    saveUserCommands(username, cmds); fu(x => x + 1); setToast({ msg: t.commandSaved, type: 'success' })
  }

  function isSaved(cmd) { return getUserCommands(username).some(c => c.name === cmd.name && c.cmd === cmd.command) }
  function searchGoogle() { window.open(`https://www.google.com/search?q=${encodeURIComponent('cybersecurity command ' + search)}`, '_blank') }

  return (
    <div className="space-y-5 ct-fade-in">
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
      <div>
        <h2 className="text-xl font-bold flex items-center gap-2 font-display" style={{ color: 'var(--ct-text-heading)' }}>{I.code} {t.commandArsenal}</h2>
        <p className="text-xs font-mono mt-1" style={{ color: 'var(--ct-text-muted)' }}>{commandsDB.length} {t.commandsLoaded}</p>
      </div>
      <div className="relative">
        <span className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--ct-text-muted)' }}>{I.search}</span>
        <input value={search} onChange={e => { setSearch(e.target.value); setVisibleCount(20) }} placeholder={t.searchCommands} className="w-full ct-input pl-10 pr-4 py-3 text-sm font-mono" />
      </div>
      <div className="flex flex-wrap gap-1.5">
        {availCats.map(c => (
          <button key={c} onClick={() => { setActiveCat(c); setVisibleCount(20) }} className="ct-btn capitalize" style={activeCat === c ? { background: 'var(--ct-accent-10)', borderColor: 'var(--ct-accent-25)', color: 'var(--ct-accent)' } : { borderColor: 'var(--ct-border)', color: 'var(--ct-text-muted)' }}>{c}</button>
        ))}
      </div>
      <div className="space-y-3">
        {display.map((cmd, i) => {
          const saved = isSaved(cmd)
          return (
            <div key={cmd.name + i} className="ct-card overflow-hidden group ct-stagger" style={{ animationDelay: `${i * 30}ms` }}>
              <div className="h-[2px] w-full" style={{ background: `linear-gradient(90deg, var(--ct-accent), transparent 70%)`, opacity: 0.6 }} />
              <div className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-bold" style={{ color: 'var(--ct-text-heading)' }}>{cmd.name}</h3>
                    <span className="ct-badge mt-1 capitalize" style={{ background: 'var(--ct-accent-10)', borderColor: 'var(--ct-border)', color: 'var(--ct-text-muted)' }}>{cmd.category}</span>
                  </div>
                  <button onClick={() => saveCmd(cmd)} className={`p-1.5 rounded-lg transition-all opacity-0 group-hover:opacity-100`} style={{ color: saved ? 'var(--ct-warning)' : 'var(--ct-text-muted)' }}>{saved ? I.star : I.starO}</button>
                </div>
                {cmd.description && <p className="text-xs" style={{ color: 'var(--ct-text-muted)' }}>{cmd.description}</p>}
                <div className="relative group/code">
                  <div className="ct-terminal-bar">
                    <span className="ct-terminal-dot" style={{ background: 'var(--ct-danger)' }} />
                    <span className="ct-terminal-dot" style={{ background: 'var(--ct-warning)' }} />
                    <span className="ct-terminal-dot" style={{ background: 'var(--ct-accent-alt)' }} />
                    <span className="ml-2 text-[10px] font-mono" style={{ color: 'var(--ct-text-muted)' }}>bash</span>
                  </div>
                  <div className="ct-terminal-body"><code>{cmd.command}</code></div>
                  <button onClick={() => copyCmd(cmd.name + i, cmd.command)} className={`absolute right-2 bottom-2 ct-btn text-[11px] transition-all ${copiedId === cmd.name + i ? 'ct-btn-green' : 'opacity-0 group-hover/code:opacity-100'}`} style={copiedId !== cmd.name + i ? { background: 'var(--ct-bg-card)', borderColor: 'var(--ct-border)', color: 'var(--ct-text-muted)' } : {}}>
                    {copiedId === cmd.name + i ? I.check : I.copy} {copiedId === cmd.name + i ? t.copied : t.copy}
                  </button>
                </div>
              </div>
            </div>
          )
        })}
        {filtered.length > visibleCount && <button onClick={() => setVisibleCount(v => v + 20)} className="w-full ct-btn ct-btn-accent py-3">{t.loadMore} ({filtered.length - visibleCount} {t.remaining})</button>}
        {filtered.length === 0 && search.trim() && (
          <div className="text-center py-16 space-y-4">
            <p className="font-mono text-sm" style={{ color: 'var(--ct-text-muted)' }}>{t.noCommandsFound} "{search}"</p>
            <button onClick={searchGoogle} className="ct-btn ct-btn-accent text-sm">{I.globe} {t.searchOnGoogle}</button>
          </div>
        )}
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════
// SAVED COMMANDS
// ════════════════════════════════════════════════════
function SavedCommandsPanel({ username }) {
  const { t } = useLang()
  const [cmds, setCmds] = useState(() => getUserCommands(username))
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', cmd: '', cat: 'Custom', lang: 'bash', desc: '' })
  const [copiedId, setCopiedId] = useState(null)
  const [toast, setToast] = useState(null)
  const [editId, setEditId] = useState(null)
  useEffect(() => { saveUserCommands(username, cmds) }, [cmds, username])

  function addCustom() {
    if (!form.name.trim() || !form.cmd.trim()) { setToast({ msg: t.nameAndCmdRequired, type: 'error' }); return }
    if (editId) { setCmds(p => p.map(c => c.id === editId ? { ...c, ...form } : c)); setEditId(null); setToast({ msg: t.commandUpdated, type: 'success' }) }
    else { setCmds(p => [{ id: genId(), ...form, savedAt: Date.now() }, ...p]); setToast({ msg: t.customAdded, type: 'success' }) }
    setForm({ name: '', cmd: '', cat: 'Custom', lang: 'bash', desc: '' }); setShowForm(false)
  }
  function startEdit(c) { setForm({ name: c.name, cmd: c.cmd, cat: c.cat, lang: c.lang || 'bash', desc: c.desc || '' }); setEditId(c.id); setShowForm(true) }
  function removeCmd(id) { setCmds(p => p.filter(c => c.id !== id)); setToast({ msg: t.removed, type: 'info' }) }
  async function copyCmd(id, cmd) { try { await navigator.clipboard.writeText(cmd); setCopiedId(id); setTimeout(() => setCopiedId(null), 2000) } catch {} }

  return (
    <div className="space-y-5 ct-fade-in">
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2 font-display" style={{ color: 'var(--ct-text-heading)' }}>{I.save} {t.savedTitle}</h2>
          <p className="text-xs font-mono mt-1" style={{ color: 'var(--ct-text-muted)' }}>{cmds.length} {t.saved}</p>
        </div>
        <button onClick={() => { setShowForm(!showForm); setEditId(null); setForm({ name: '', cmd: '', cat: 'Custom', lang: 'bash', desc: '' }) }} className="ct-btn ct-btn-accent">{showForm ? I.x : I.plus} {showForm ? t.close : t.addCustom}</button>
      </div>
      {showForm && (
        <div className="ct-card p-5 space-y-3 ct-slide-down">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder={t.commandName} className="ct-input px-3 py-2.5 text-sm font-mono" />
            <input value={form.cat} onChange={e => setForm(p => ({ ...p, cat: e.target.value }))} placeholder={t.category} className="ct-input px-3 py-2.5 text-sm" />
          </div>
          <textarea value={form.cmd} onChange={e => setForm(p => ({ ...p, cmd: e.target.value }))} placeholder="nmap -sV target.com" rows={3} className="w-full ct-input px-3 py-2.5 text-sm font-mono resize-none" style={{ color: 'var(--ct-accent-alt)' }} />
          <input value={form.desc} onChange={e => setForm(p => ({ ...p, desc: e.target.value }))} placeholder={t.description} className="w-full ct-input px-3 py-2.5 text-sm font-mono" />
          <button onClick={addCustom} className="ct-btn ct-btn-green">{I.check} {editId ? t.update : t.save}</button>
        </div>
      )}
      <div className="space-y-3">
        {cmds.map((cmd, i) => (
          <div key={cmd.id} className="ct-card overflow-hidden group ct-stagger" style={{ animationDelay: `${i * 30}ms` }}>
            <div className="h-[2px] w-full" style={{ background: `linear-gradient(90deg, var(--ct-accent-alt), transparent 70%)`, opacity: 0.6 }} />
            <div className="p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold" style={{ color: 'var(--ct-text-heading)' }}>{cmd.name}</h3>
                  <span className="text-[10px] font-mono" style={{ color: 'var(--ct-text-muted)' }}>{cmd.cat} • {cmd.lang || 'bash'}</span>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => startEdit(cmd)} className="p-1.5 rounded-lg" style={{ color: 'var(--ct-text-muted)' }}>{I.edit}</button>
                  <button onClick={() => removeCmd(cmd.id)} className="p-1.5 rounded-lg" style={{ color: 'var(--ct-danger)' }}>{I.trash}</button>
                </div>
              </div>
              {cmd.desc && <p className="text-xs" style={{ color: 'var(--ct-text-muted)' }}>{cmd.desc}</p>}
              <div className="relative group/code">
                <div className="ct-terminal-body rounded-lg" style={{ borderRadius: '8px', border: '1px solid var(--ct-border)' }}><code>{cmd.cmd}</code></div>
                <button onClick={() => copyCmd(cmd.id, cmd.cmd)} className={`absolute right-2 bottom-2 ct-btn text-[11px] transition-all ${copiedId === cmd.id ? 'ct-btn-green' : 'opacity-0 group-hover/code:opacity-100'}`} style={copiedId !== cmd.id ? { background: 'var(--ct-bg-card)', borderColor: 'var(--ct-border)', color: 'var(--ct-text-muted)' } : {}}>
                  {copiedId === cmd.id ? I.check : I.copy} {copiedId === cmd.id ? t.copied : t.copy}
                </button>
              </div>
            </div>
          </div>
        ))}
        {cmds.length === 0 && <div className="text-center py-16 font-mono text-sm" style={{ color: 'var(--ct-text-muted)' }}><p>{t.noSavedYet}</p><p className="mt-2">{t.saveCmdsHint}</p></div>}
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════
// NOTES
// ════════════════════════════════════════════════════
function NotesSystem({ username }) {
  const { t } = useLang()
  const timeAgo = useTimeAgo()
  const [data, setData] = useState(() => getUserData(username))
  const [activeFolder, setActiveFolder] = useState('All')
  const [activeNote, setActiveNote] = useState(null)
  const [search, setSearch] = useState('')
  const [editMode, setEditMode] = useState(true)
  const [showHistory, setShowHistory] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [showNewFolder, setShowNewFolder] = useState(false)
  const [moveNoteId, setMoveNoteId] = useState(null)
  const [toast, setToast] = useState(null)
  const autoSaveRef = useRef(null)
  const editorRef = useRef(null)

  useEffect(() => { saveUserData(username, data) }, [data, username])
  useEffect(() => { if (autoSaveRef.current) clearTimeout(autoSaveRef.current); autoSaveRef.current = setTimeout(() => { if (activeNote) setData(p => ({ ...p, notes: p.notes.map(n => n.id === activeNote.id ? { ...activeNote, updatedAt: Date.now() } : n) })) }, 800); return () => clearTimeout(autoSaveRef.current) }, [activeNote])

  const showToast = useCallback((msg, type = 'success') => setToast({ msg, type }), [])
  const folders = useMemo(() => ['All', ...(data.folders || [])], [data.folders])
  const allTags = useMemo(() => { const s = new Set(); data.notes.forEach(n => n.tags?.forEach(x => s.add(x))); return [...s] }, [data.notes])
  const filteredNotes = useMemo(() => data.notes.filter(n => { if (activeFolder !== 'All' && n.folder !== activeFolder) return false; if (!search.trim()) return true; const q = search.toLowerCase(); return n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q) || n.tags?.some(x => x.toLowerCase().includes(q)) }).sort((a, b) => { if (a.pinned !== b.pinned) return a.pinned ? -1 : 1; return (b.updatedAt || b.createdAt) - (a.updatedAt || a.createdAt) }), [data.notes, activeFolder, search])

  function createNote() { const note = { id: genId(), title: 'Untitled Note', content: '', folder: activeFolder === 'All' ? (data.folders[0] || 'General') : activeFolder, tags: [], pinned: false, createdAt: Date.now(), updatedAt: Date.now(), history: [], reminder: null, isTask: false }; setData(p => ({ ...p, notes: [note, ...p.notes] })); setActiveNote(note); setEditMode(true); setTimeout(() => editorRef.current?.focus(), 100) }
  function deleteNote(id) { setData(p => ({ ...p, notes: p.notes.filter(n => n.id !== id) })); if (activeNote?.id === id) setActiveNote(null); showToast(t.noteDeleted, 'info') }
  function updateActiveNote(field, value) { setActiveNote(p => { if (!p) return p; const u = { ...p, [field]: value, updatedAt: Date.now() }; if (field === 'content' && p.content !== value) { const h = [...(p.history || [])]; if (h.length === 0 || Date.now() - (h[0]?.time || 0) > 30000) { h.unshift({ content: p.content, time: Date.now() }); if (h.length > 10) h.pop(); u.history = h } }; return u }) }
  function addFolder() { if (!newFolderName.trim()) return; if (data.folders.includes(newFolderName.trim())) { showToast(t.folderExists, 'error'); return }; setData(p => ({ ...p, folders: [...p.folders, newFolderName.trim()] })); setNewFolderName(''); setShowNewFolder(false); showToast(t.folderCreated) }
  function deleteFolder(name) { if (data.notes.some(n => n.folder === name)) { showToast(t.moveNotesFirst, 'error'); return }; setData(p => ({ ...p, folders: p.folders.filter(f => f !== name) })); if (activeFolder === name) setActiveFolder('All'); showToast(t.folderDeleted, 'info') }
  function moveNote(noteId, targetFolder) { setData(p => ({ ...p, notes: p.notes.map(n => n.id === noteId ? { ...n, folder: targetFolder, updatedAt: Date.now() } : n) })); if (activeNote?.id === noteId) setActiveNote(p => ({ ...p, folder: targetFolder })); setMoveNoteId(null); showToast(`${t.movedTo} ${targetFolder}`) }
  function togglePin(id) { setData(p => ({ ...p, notes: p.notes.map(n => n.id === id ? { ...n, pinned: !n.pinned } : n) })); if (activeNote?.id === id) setActiveNote(p => ({ ...p, pinned: !p.pinned })) }
  function toggleTask(id) { setData(p => ({ ...p, notes: p.notes.map(n => n.id === id ? { ...n, isTask: !n.isTask } : n) })); if (activeNote?.id === id) setActiveNote(p => ({ ...p, isTask: !p.isTask })) }
  function restoreVersion(h) { if (!activeNote) return; updateActiveNote('content', h.content); setShowHistory(false); showToast(t.versionRestored) }
  function exportNoteMD() { if (!activeNote) return; const b = new Blob([`# ${activeNote.title}\n\n${activeNote.content}`], { type: 'text/markdown' }); const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = `${activeNote.title.replace(/[^a-zA-Z0-9]/g, '_')}.md`; a.click(); showToast(t.exportedMd) }
  function exportAllJSON() { const b = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }); const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = `ct-notes-${username}-${new Date().toISOString().slice(0, 10)}.json`; a.click(); showToast(t.notesExported) }
  function importJSON(e) { const f = e.target.files[0]; if (!f) return; const r = new FileReader(); r.onload = ev => { try { const im = JSON.parse(ev.target.result); if (im.notes && Array.isArray(im.notes)) { setData(p => ({ ...p, notes: [...im.notes, ...p.notes], folders: [...new Set([...p.folders, ...(im.folders || [])])] })); showToast(`${im.notes.length} ${t.notesImported}`) } else showToast(t.invalidFormat, 'error') } catch { showToast(t.invalidJSON, 'error') } }; r.readAsText(f); e.target.value = '' }
  function handleTagInput(e) { if (e.key === 'Enter' && e.target.value.trim()) { const tag = e.target.value.trim().toLowerCase(); if (!activeNote.tags.includes(tag)) updateActiveNote('tags', [...activeNote.tags, tag]); e.target.value = '' } }
  function removeTag(tag) { updateActiveNote('tags', activeNote.tags.filter(x => x !== tag)) }

  return (
    <div className="flex h-[calc(100vh-7rem)] gap-0 ct-fade-in">
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
      <div className="w-64 flex-shrink-0 ct-sidebar flex flex-col overflow-hidden ct-hide-mobile">
        <div className="p-3" style={{ borderBottom: '1px solid var(--ct-border)' }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder={t.searchNotes} className="w-full ct-input pl-3 pr-3 py-2 text-xs font-mono" />
        </div>
        <div className="p-3" style={{ borderBottom: '1px solid var(--ct-border)' }}>
          <button onClick={createNote} className="w-full ct-btn ct-btn-accent justify-center">{I.plus} {t.newNote}</button>
        </div>
        <div className="p-3 space-y-1" style={{ borderBottom: '1px solid var(--ct-border)' }}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[9px] font-bold uppercase tracking-widest font-mono" style={{ color: 'var(--ct-text-muted)' }}>{t.folders}</span>
            <button onClick={() => setShowNewFolder(!showNewFolder)} style={{ color: 'var(--ct-text-muted)' }}>{I.plus}</button>
          </div>
          {showNewFolder && <div className="flex gap-1 mb-2"><input value={newFolderName} onChange={e => setNewFolderName(e.target.value)} placeholder={t.folderName} onKeyDown={e => e.key === 'Enter' && addFolder()} className="flex-1 ct-input px-2 py-1 text-xs font-mono" /><button onClick={addFolder} style={{ color: 'var(--ct-accent-alt)' }}>{I.check}</button></div>}
          {folders.map(f => (
            <div key={f} className="group flex items-center">
              <button onClick={() => setActiveFolder(f)} className="flex-1 flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all" style={activeFolder === f ? { background: 'var(--ct-accent-10)', color: 'var(--ct-accent)' } : { color: 'var(--ct-text-muted)' }}>
                {I.folder}<span className="truncate">{f}</span><span className="ml-auto text-[10px]" style={{ color: 'var(--ct-text-muted)' }}>{f === 'All' ? data.notes.length : data.notes.filter(n => n.folder === f).length}</span>
              </button>
              {f !== 'All' && <button onClick={() => deleteFolder(f)} className="opacity-0 group-hover:opacity-100 p-1 ml-0.5" style={{ color: 'var(--ct-danger)' }}>{I.x}</button>}
            </div>
          ))}
        </div>
        {allTags.length > 0 && <div className="p-3" style={{ borderBottom: '1px solid var(--ct-border)' }}><span className="text-[9px] font-bold uppercase tracking-widest font-mono block mb-2" style={{ color: 'var(--ct-text-muted)' }}>{t.tags}</span><div className="flex flex-wrap gap-1">{allTags.slice(0, 15).map(x => <button key={x} onClick={() => setSearch(x)} className="text-[10px] font-mono px-2 py-0.5 rounded" style={{ background: 'var(--ct-bg)', border: '1px solid var(--ct-border)', color: 'var(--ct-text-muted)' }}>#{x}</button>)}</div></div>}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {filteredNotes.map(note => (
            <button key={note.id} onClick={() => { setActiveNote(note); setEditMode(true) }} className="w-full text-left p-2.5 rounded-lg transition-all" style={activeNote?.id === note.id ? { background: 'var(--ct-accent-10)', border: '1px solid var(--ct-accent-15)' } : { border: '1px solid transparent' }}>
              <div className="flex items-center gap-1.5">{note.pinned && <span style={{ color: 'var(--ct-warning)' }} className="text-[10px]">★</span>}<span className="text-xs font-semibold truncate" style={{ color: activeNote?.id === note.id ? 'var(--ct-accent)' : 'var(--ct-text)' }}>{note.title || 'Untitled'}</span></div>
              <span className="text-[9px] font-mono" style={{ color: 'var(--ct-text-muted)' }}>{note.content?.slice(0, 40) || t.empty}</span>
              <span className="block text-[9px] mt-1" style={{ color: 'var(--ct-text-muted)' }}>{timeAgo(new Date(note.updatedAt || note.createdAt).toISOString())}</span>
            </button>
          ))}
          {filteredNotes.length === 0 && <div className="text-center py-8 text-xs font-mono" style={{ color: 'var(--ct-text-muted)' }}>{data.notes.length === 0 ? t.noNotesYet : t.noResults}</div>}
        </div>
        <div className="p-2 flex gap-1" style={{ borderTop: '1px solid var(--ct-border)' }}>
          <button onClick={exportAllJSON} className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-[10px] rounded-lg font-mono" style={{ border: '1px solid var(--ct-border)', color: 'var(--ct-text-muted)' }}>{I.download} JSON</button>
          <label className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-[10px] rounded-lg cursor-pointer font-mono" style={{ border: '1px solid var(--ct-border)', color: 'var(--ct-text-muted)' }}>{I.upload} {t.importBtn}<input type="file" accept=".json" onChange={importJSON} className="hidden" /></label>
        </div>
      </div>
      <div className="flex-1 flex flex-col overflow-hidden" style={{ background: 'var(--ct-bg)' }}>
        {activeNote ? (
          <>
            <div className="flex items-center gap-2 px-5 py-3 flex-shrink-0" style={{ borderBottom: '1px solid var(--ct-border)', background: 'var(--ct-bg-sidebar)' }}>
              <input value={activeNote.title} onChange={e => updateActiveNote('title', e.target.value)} className="flex-1 bg-transparent text-lg font-bold outline-none font-display" style={{ color: 'var(--ct-text-heading)' }} placeholder={t.noteTitle} />
              <div className="flex items-center gap-1">
                <button onClick={() => togglePin(activeNote.id)} className="p-1.5 rounded-lg" style={{ color: activeNote.pinned ? 'var(--ct-warning)' : 'var(--ct-text-muted)' }}>{activeNote.pinned ? I.star : I.starO}</button>
                <button onClick={() => toggleTask(activeNote.id)} className="p-1.5 rounded-lg" style={{ color: activeNote.isTask ? 'var(--ct-accent-alt)' : 'var(--ct-text-muted)' }}>{I.check}</button>
                <button onClick={() => setEditMode(!editMode)} className="p-1.5 rounded-lg" style={{ color: 'var(--ct-text-muted)' }}>{editMode ? I.eye : I.edit}</button>
                <button onClick={exportNoteMD} className="p-1.5 rounded-lg" style={{ color: 'var(--ct-text-muted)' }}>{I.download}</button>
                <button onClick={() => setShowHistory(!showHistory)} className="p-1.5 rounded-lg" style={{ color: 'var(--ct-text-muted)' }}>{I.history}</button>
                <div className="relative">
                  <button onClick={() => setMoveNoteId(moveNoteId ? null : activeNote.id)} className="p-1.5 rounded-lg" style={{ color: 'var(--ct-text-muted)' }}>{I.move}</button>
                  {moveNoteId === activeNote.id && <div className="absolute right-0 top-full mt-1 z-20 ct-card p-2 min-w-[150px] shadow-xl">{data.folders.map(f => <button key={f} onClick={() => moveNote(activeNote.id, f)} className="w-full text-left px-3 py-1.5 rounded-lg text-xs flex items-center gap-2 transition-all" style={{ color: activeNote.folder === f ? 'var(--ct-accent)' : 'var(--ct-text-muted)' }}>{I.folder} {f}</button>)}</div>}
                </div>
                <button onClick={() => deleteNote(activeNote.id)} className="p-1.5 rounded-lg" style={{ color: 'var(--ct-danger)' }}>{I.trash}</button>
              </div>
            </div>
            <div className="flex items-center gap-2 px-5 py-2 flex-shrink-0" style={{ borderBottom: '1px solid var(--ct-border)' }}>
              <span style={{ color: 'var(--ct-text-muted)' }}>{I.tag}</span>
              {activeNote.tags?.map(x => <span key={x} className="flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded" style={{ background: 'var(--ct-accent-10)', border: '1px solid var(--ct-accent-15)', color: 'var(--ct-accent)' }}>#{x}<button onClick={() => removeTag(x)} style={{ color: 'var(--ct-danger)' }}>&times;</button></span>)}
              <input placeholder={t.addTag} onKeyDown={handleTagInput} className="bg-transparent text-[11px] outline-none font-mono w-24" style={{ color: 'var(--ct-text-muted)' }} />
              <span className="ml-auto text-[10px] font-mono" style={{ color: 'var(--ct-text-muted)' }}>{activeNote.folder} • {timeAgo(new Date(activeNote.updatedAt || activeNote.createdAt).toISOString())}</span>
            </div>
            <div className="flex-1 overflow-y-auto relative">
              {showHistory && activeNote.history?.length > 0 && (
                <div className="absolute inset-0 z-10 backdrop-blur-sm p-5 overflow-y-auto" style={{ background: 'var(--ct-bg)' }}>
                  <div className="flex items-center justify-between mb-4"><h3 className="text-sm font-bold font-display flex items-center gap-2" style={{ color: 'var(--ct-text-heading)' }}>{I.history} {t.versionHistory}</h3><button onClick={() => setShowHistory(false)} style={{ color: 'var(--ct-text-muted)' }}>{I.x}</button></div>
                  <div className="space-y-3">{activeNote.history.map((h, i) => <div key={i} className="ct-card p-4"><div className="flex items-center justify-between mb-2"><span className="text-[10px] font-mono" style={{ color: 'var(--ct-text-muted)' }}>{new Date(h.time).toLocaleString()}</span><button onClick={() => restoreVersion(h)} className="ct-btn ct-btn-accent text-[10px]">{t.restore}</button></div><pre className="text-xs font-mono whitespace-pre-wrap max-h-32 overflow-y-auto" style={{ color: 'var(--ct-text-muted)' }}>{h.content.slice(0, 500)}</pre></div>)}</div>
                </div>
              )}
              {editMode ? <textarea ref={editorRef} value={activeNote.content} onChange={e => updateActiveNote('content', e.target.value)} placeholder={t.startWriting} className="w-full h-full bg-transparent text-sm p-5 outline-none resize-none font-mono leading-relaxed" style={{ color: 'var(--ct-text)' }} /> : <div className="p-5 markdown-body text-sm leading-relaxed" onClick={e => { if (e.target.classList.contains('backlink')) { const name = e.target.textContent.replace('🔗 ', ''); const found = data.notes.find(n => n.title.toLowerCase() === name.toLowerCase()); if (found) setActiveNote(found) } }} dangerouslySetInnerHTML={{ __html: parseMD(activeNote.content) }} />}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center space-y-4">
              <div className="w-20 h-20 mx-auto ct-card flex items-center justify-center"><span className="scale-150" style={{ color: 'var(--ct-text-muted)' }}>{I.note}</span></div>
              <p className="font-display font-semibold" style={{ color: 'var(--ct-text-muted)' }}>{t.selectOrCreate}</p>
              <button onClick={createNote} className="ct-btn ct-btn-accent text-sm">{I.plus} {t.newNote}</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════
// DASHBOARD
// ════════════════════════════════════════════════════
function DashboardPanel({ username, feedData, setActiveTab, commandsDB }) {
  const { t } = useLang()
  const timeAgo = useTimeAgo()
  const userData = useMemo(() => getUserData(username), [username])
  const savedCmds = useMemo(() => getUserCommands(username), [username])
  const criticalCount = useMemo(() => feedData.items.filter(i => i.severity === 'CRITICAL').length, [feedData.items])
  const highCount = useMemo(() => feedData.items.filter(i => i.severity === 'HIGH').length, [feedData.items])
  const recentFeeds = useMemo(() => feedData.items.slice(0, 3), [feedData.items])
  const recentNotes = useMemo(() => [...(userData.notes || [])].sort((a, b) => (b.updatedAt || b.createdAt) - (a.updatedAt || a.createdAt)).slice(0, 3), [userData.notes])
  const recentCmds = useMemo(() => savedCmds.slice(0, 3), [savedCmds])

  return (
    <div className="space-y-6 ct-fade-in">
      <div>
        <h2 className="text-xl font-bold flex items-center gap-2 font-display" style={{ color: 'var(--ct-text-heading)' }}>{I.dashboard} {t.dashboardTitle}</h2>
        <p className="text-xs font-mono mt-1" style={{ color: 'var(--ct-text-muted)' }}>{t.overview} • {commandsDB.length} cmds • {feedData.items.length} feed</p>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[{ label: t.criticalVulns, count: criticalCount, color: 'var(--ct-danger)' }, { label: t.highVulns, count: highCount, color: 'var(--ct-warning)' }, { label: t.notesCount, count: userData.notes?.length || 0, color: 'var(--ct-accent)' }, { label: t.savedCmdsCount, count: savedCmds.length, color: 'var(--ct-accent-alt)' }].map((s, i) => (
          <div key={i} className="ct-card p-4 ct-stagger" style={{ animationDelay: `${i * 60}ms` }}>
            <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--ct-text-muted)' }}>{s.label}</p>
            <p className="text-2xl font-mono font-bold mt-1" style={{ color: s.color }}>{s.count}</p>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="ct-card p-4 ct-stagger" style={{ animationDelay: '100ms' }}>
          <div className="flex items-center justify-between mb-3"><h3 className="text-sm font-bold flex items-center gap-2" style={{ color: 'var(--ct-text-heading)' }}>{I.rss} {t.latestThreats}</h3><button onClick={() => setActiveTab('feed')} className="text-[10px] hover:underline font-mono" style={{ color: 'var(--ct-accent)' }}>{t.viewAll}</button></div>
          <div className="space-y-2">
            {recentFeeds.map(item => (
              <a key={item.id} href={item.link} target="_blank" rel="noopener noreferrer" className="block ct-card p-3 !border-transparent hover:!border-[var(--ct-border-hover)]">
                <div className="flex items-center gap-2"><span className={`ct-badge ct-badge-${item.severity.toLowerCase()}`}>{item.severity}</span><span className="text-[9px] font-mono" style={{ color: 'var(--ct-text-muted)' }}>{timeAgo(item.date)}</span></div>
                <p className="text-xs font-semibold mt-1 line-clamp-2" style={{ color: item.severity === 'CRITICAL' ? 'var(--ct-danger)' : 'var(--ct-accent)' }}>{item.title}</p>
              </a>
            ))}
            {recentFeeds.length === 0 && <p className="text-xs font-mono" style={{ color: 'var(--ct-text-muted)' }}>{t.loadingFeeds}</p>}
          </div>
        </div>
        <div className="ct-card p-4 ct-stagger" style={{ animationDelay: '160ms' }}>
          <div className="flex items-center justify-between mb-3"><h3 className="text-sm font-bold flex items-center gap-2" style={{ color: 'var(--ct-text-heading)' }}>{I.note} {t.recentNotes}</h3><button onClick={() => setActiveTab('notes')} className="text-[10px] hover:underline font-mono" style={{ color: 'var(--ct-accent)' }}>{t.viewAll}</button></div>
          <div className="space-y-2">
            {recentNotes.map(note => (
              <button key={note.id} onClick={() => setActiveTab('notes')} className="w-full text-left ct-card p-3 !border-transparent hover:!border-[var(--ct-border-hover)]">
                <p className="text-xs font-semibold truncate" style={{ color: 'var(--ct-text-heading)' }}>{note.title}</p>
                <p className="text-[10px] mt-1 truncate font-mono" style={{ color: 'var(--ct-text-muted)' }}>{note.content?.slice(0, 60) || t.empty}</p>
              </button>
            ))}
            {recentNotes.length === 0 && <p className="text-xs font-mono" style={{ color: 'var(--ct-text-muted)' }}>{t.noNotes}</p>}
          </div>
        </div>
        <div className="ct-card p-4 ct-stagger" style={{ animationDelay: '220ms' }}>
          <div className="flex items-center justify-between mb-3"><h3 className="text-sm font-bold flex items-center gap-2" style={{ color: 'var(--ct-text-heading)' }}>{I.save} {t.savedCommands}</h3><button onClick={() => setActiveTab('saved')} className="text-[10px] hover:underline font-mono" style={{ color: 'var(--ct-accent)' }}>{t.viewAll}</button></div>
          <div className="space-y-2">
            {recentCmds.map(cmd => (
              <div key={cmd.id} className="ct-card p-3 !border-transparent">
                <p className="text-xs font-semibold" style={{ color: 'var(--ct-text-heading)' }}>{cmd.name}</p>
                <pre className="text-[10px] font-mono mt-1 truncate" style={{ color: 'var(--ct-accent-alt)' }}>{cmd.cmd}</pre>
              </div>
            ))}
            {recentCmds.length === 0 && <p className="text-xs font-mono" style={{ color: 'var(--ct-text-muted)' }}>{t.noSavedCmds}</p>}
          </div>
        </div>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════
// FAVORITES
// ════════════════════════════════════════════════════
function FavoritesPanel({ username }) {
  const { t } = useLang()
  const [favs, setFavs] = useState(() => getUserFavs(username))
  const [tab, setTab] = useState('feeds')
  const [, fu] = useState(0)
  function reload() { setFavs(getUserFavs(username)); fu(x => x + 1) }
  function removeFeed(title) { const f = getUserFavs(username); f.feeds = f.feeds.filter(x => x.title !== title); saveUserFavs(username, f); reload() }
  const total = favs.feeds.length + favs.notes.length + favs.commands.length

  return (
    <div className="space-y-5 ct-fade-in">
      <div>
        <h2 className="text-xl font-bold flex items-center gap-2 font-display" style={{ color: 'var(--ct-text-heading)' }}><span style={{ color: 'var(--ct-warning)' }}>{I.star}</span> {t.favoritesTitle}</h2>
        <p className="text-xs font-mono mt-1" style={{ color: 'var(--ct-text-muted)' }}>{total} {t.itemsSaved}</p>
      </div>
      <div className="flex gap-2">
        {[['feeds', `${t.feeds} (${favs.feeds.length})`], ['notes', `${t.notes} (${favs.notes.length})`], ['commands', `${t.commands} (${favs.commands.length})`]].map(([k, label]) => (
          <button key={k} onClick={() => setTab(k)} className="ct-btn" style={tab === k ? { background: 'var(--ct-warning-10)', borderColor: 'var(--ct-warning-25)', color: 'var(--ct-warning)' } : { borderColor: 'var(--ct-border)', color: 'var(--ct-text-muted)' }}>{label}</button>
        ))}
      </div>
      {tab === 'feeds' && (
        <div className="space-y-2">
          {favs.feeds.map(item => (
            <div key={item.title} className="ct-card p-4 flex items-start gap-3 group">
              <div className="flex-1 min-w-0">
                <span className={`ct-badge ct-badge-${(item.severity || 'info').toLowerCase()}`}>{item.severity}</span>
                <a href={item.link} target="_blank" rel="noopener noreferrer" className="block text-sm font-bold mt-1 hover:underline" style={{ color: 'var(--ct-accent)' }}>{item.title}</a>
                <p className="text-[10px] mt-1 font-mono" style={{ color: 'var(--ct-text-muted)' }}>{item.source}</p>
              </div>
              <button onClick={() => removeFeed(item.title)} className="opacity-0 group-hover:opacity-100 p-1" style={{ color: 'var(--ct-danger)' }}>{I.x}</button>
            </div>
          ))}
          {favs.feeds.length === 0 && <p className="text-center py-12 font-mono text-sm" style={{ color: 'var(--ct-text-muted)' }}>{t.noFavFeeds}</p>}
        </div>
      )}
      {tab === 'notes' && <p className="text-center py-12 font-mono text-sm" style={{ color: 'var(--ct-text-muted)' }}>{t.noFavNotes}</p>}
      {tab === 'commands' && <p className="text-center py-12 font-mono text-sm" style={{ color: 'var(--ct-text-muted)' }}>{t.noFavCmds}</p>}
    </div>
  )
}

// ════════════════════════════════════════════════════
// GLOBAL SEARCH
// ════════════════════════════════════════════════════
function GlobalSearch({ username, commandsDB, onNavigate, isOpen, onClose }) {
  const { t } = useLang()
  const [query, setQuery] = useState('')
  const inputRef = useRef(null)
  useEffect(() => { if (isOpen) { setQuery(''); setTimeout(() => inputRef.current?.focus(), 100) } }, [isOpen])
  const results = useMemo(() => {
    if (!query.trim()) return []
    const q = query.toLowerCase(); const out = []
    getUserData(username).notes?.forEach(n => { if (n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q)) out.push({ type: t.note, title: n.title, desc: n.content?.slice(0, 80), icon: I.note, tab: 'notes', color: 'var(--ct-accent)' }) })
    commandsDB.forEach(c => { if (c.name.toLowerCase().includes(q) || c.command.toLowerCase().includes(q) || c.description?.toLowerCase().includes(q)) out.push({ type: t.command, title: c.name, desc: c.command.slice(0, 80), icon: I.code, tab: 'commands', color: 'var(--ct-accent-alt)' }) })
    getUserCommands(username).forEach(c => { if (c.name.toLowerCase().includes(q) || c.cmd.toLowerCase().includes(q)) out.push({ type: t.savedCmd, title: c.name, desc: c.cmd.slice(0, 80), icon: I.save, tab: 'saved', color: 'var(--ct-warning)' }) })
    return out.slice(0, 15)
  }, [query, username, commandsDB, t])
  if (!isOpen) return null
  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center pt-[15vh] px-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative w-full max-w-lg ct-scale-in" onClick={e => e.stopPropagation()}>
        <div className="ct-card shadow-2xl overflow-hidden" style={{ background: 'var(--ct-bg-card)' }}>
          <div className="flex items-center gap-3 px-5 py-4" style={{ borderBottom: '1px solid var(--ct-border)' }}>
            <span style={{ color: 'var(--ct-accent)' }}>{I.search}</span>
            <input ref={inputRef} value={query} onChange={e => setQuery(e.target.value)} placeholder={t.searchPlaceholder} className="flex-1 bg-transparent text-sm outline-none font-mono" style={{ color: 'var(--ct-text-heading)' }} />
            <kbd className="px-2 py-0.5 rounded text-[10px] font-mono" style={{ background: 'var(--ct-bg)', border: '1px solid var(--ct-border)', color: 'var(--ct-text-muted)' }}>ESC</kbd>
          </div>
          {results.length > 0 && <div className="max-h-80 overflow-y-auto p-2 space-y-1">
            {results.map((r, i) => (
              <button key={i} onClick={() => { onNavigate(r.tab); onClose() }} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all hover:opacity-90" onMouseEnter={e => e.currentTarget.style.background = 'var(--ct-bg-hover)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <span style={{ color: r.color }}>{r.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2"><span className="text-sm font-semibold truncate" style={{ color: 'var(--ct-text-heading)' }}>{r.title}</span><span className="ct-badge" style={{ background: 'var(--ct-bg)', borderColor: 'var(--ct-border)', color: r.color }}>{r.type}</span></div>
                  <p className="text-[11px] truncate mt-0.5 font-mono" style={{ color: 'var(--ct-text-muted)' }}>{r.desc}</p>
                </div>
              </button>
            ))}
          </div>}
          {query.trim() && results.length === 0 && <div className="p-8 text-center font-mono text-sm" style={{ color: 'var(--ct-text-muted)' }}>{t.noResultsFor} "{query}"</div>}
          {!query.trim() && <div className="p-6 text-center font-mono text-xs" style={{ color: 'var(--ct-text-muted)' }}>{t.startTyping}</div>}
        </div>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════
// SETTINGS
// ════════════════════════════════════════════════════
function SettingsPanel({ username, onLogout }) {
  const { t, lang, setLang } = useLang()
  const [activeTheme, setActiveTheme] = useState(() => getSavedTheme())
  const [toast, setToast] = useState(null)
  const [changingPass, setChangingPass] = useState(false)
  const [oldPass, setOldPass] = useState('')
  const [changeNewPass, setChangeNewPass] = useState('')
  const [newUser, setNewUser] = useState('')
  const [newPass, setNewPass] = useState('')
  const showToast = useCallback((msg, type = 'success') => setToast({ msg, type }), [])

  function selectTheme(key) { applyTheme(key); setActiveTheme(key); const s = getSettings(username); s.theme = key; saveSettings(username, s); showToast(`Theme: ${THEMES_LIST.find(x => x.key === key)?.name}`, 'info') }
  function changePassword() { const db = getDB(); if (!db[username] || db[username]._hash !== simpleHash(oldPass)) { showToast(t.wrongPass, 'error'); return }; if (changeNewPass.length < 4) { showToast(t.minPass, 'error'); return }; db[username]._hash = simpleHash(changeNewPass); saveDB(db); setOldPass(''); setChangeNewPass(''); setChangingPass(false); showToast(t.passwordChanged) }
  function createAccount() { if (!newUser.trim() || !newPass.trim()) { showToast(t.fillAllFields, 'error'); return }; const db = getDB(); if (db[newUser] && db[newUser]._hash) { showToast(t.userExists, 'error'); return }; db[newUser] = { _hash: simpleHash(newPass), notes: [], folders: ['General', 'Security', 'Recon', 'Tools'], tags: [] }; saveDB(db); setNewUser(''); setNewPass(''); showToast(t.accountCreated) }
  function deleteAccount() { if (!confirm(t.deleteConfirm)) return; const db = getDB(); delete db[username]; saveDB(db); clearSession(); onLogout() }
  function exportFullBackup() { const d = { version: '2.0', exportedAt: new Date().toISOString(), user: username, userData: getUserData(username), commands: getUserCommands(username), favorites: getUserFavs(username), settings: getSettings(username) }; const b = new Blob([JSON.stringify(d, null, 2)], { type: 'application/json' }); const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = `ct-backup-${username}-${new Date().toISOString().slice(0, 10)}.json`; a.click(); showToast(t.fullBackupExported) }
  function importFullBackup(e) { const f = e.target.files[0]; if (!f) return; const r = new FileReader(); r.onload = ev => { try { const im = JSON.parse(ev.target.result); if (im.userData) saveUserData(username, im.userData); if (im.commands) saveUserCommands(username, im.commands); if (im.favorites) saveUserFavs(username, im.favorites); if (im.settings) { saveSettings(username, im.settings); if (im.settings.theme) selectTheme(im.settings.theme) }; showToast(t.backupRestored) } catch { showToast(t.invalidBackup, 'error') } }; r.readAsText(f); e.target.value = '' }

  const stats = useMemo(() => { const d = getUserData(username); return { notes: d.notes?.length || 0, folders: d.folders?.length || 0, tags: new Set(d.notes?.flatMap(n => n.tags || [])).size, commands: getUserCommands(username).length } }, [username])

  return (
    <div className="max-w-2xl mx-auto space-y-6 ct-fade-in p-4">
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
      <div className="ct-card p-6">
        <h3 className="text-base font-bold mb-4 font-display flex items-center gap-2" style={{ color: 'var(--ct-text-heading)' }}>{I.shield} {t.profile}</h3>
        <div className="flex items-center gap-4 mb-4">
          <div className="w-14 h-14 rounded-xl flex items-center justify-center" style={{ background: 'var(--ct-accent-10)', border: '1px solid var(--ct-accent-15)' }}><span className="text-2xl font-bold font-mono" style={{ color: 'var(--ct-accent)' }}>{username[0].toUpperCase()}</span></div>
          <div><p className="font-bold font-display" style={{ color: 'var(--ct-text-heading)' }}>{username}</p><p className="text-xs font-mono" style={{ color: 'var(--ct-text-muted)' }}>{stats.notes} notes • {stats.folders} folders • {stats.commands} cmds</p></div>
        </div>
        <button onClick={() => setChangingPass(!changingPass)} className="ct-btn ct-btn-accent">{t.changePassword}</button>
        {changingPass && <div className="space-y-2 p-4 rounded-xl mt-3" style={{ background: 'var(--ct-bg)', border: '1px solid var(--ct-border)' }}><input type="password" value={oldPass} onChange={e => setOldPass(e.target.value)} placeholder={t.currentPassword} className="w-full ct-input px-3 py-2 text-sm font-mono" /><input type="password" value={changeNewPass} onChange={e => setChangeNewPass(e.target.value)} placeholder={t.newPassword} className="w-full ct-input px-3 py-2 text-sm font-mono" /><div className="flex gap-2"><button onClick={changePassword} className="ct-btn ct-btn-green">{I.check} {t.save}</button><button onClick={() => setChangingPass(false)} className="ct-btn" style={{ borderColor: 'var(--ct-border)', color: 'var(--ct-text-muted)' }}>{t.cancel}</button></div></div>}
      </div>
      <div className="ct-card p-6">
        <h3 className="text-base font-bold mb-4 font-display" style={{ color: 'var(--ct-text-heading)' }}>{t.themes}</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {THEMES_LIST.map(th => (
            <button key={th.key} onClick={() => selectTheme(th.key)} className={`ct-card p-4 text-left transition-all ${activeTheme === th.key ? '!shadow-lg' : ''}`} style={activeTheme === th.key ? { borderColor: 'var(--ct-accent)', boxShadow: '0 0 20px var(--ct-accent-10)' } : {}}>
              <div className="flex items-center gap-2 mb-1"><span className="text-lg">{th.emoji}</span><span className="text-xs font-bold" style={{ color: 'var(--ct-text-heading)' }}>{th.name}</span></div>
              <p className="text-[10px] font-mono" style={{ color: 'var(--ct-text-muted)' }}>{th.desc}</p>
              {activeTheme === th.key && <p className="text-[9px] mt-2 font-mono font-bold" style={{ color: 'var(--ct-accent)' }}>✓ {t.active}</p>}
            </button>
          ))}
        </div>
      </div>
      <div className="ct-card p-6">
        <h3 className="text-base font-bold mb-4 font-display" style={{ color: 'var(--ct-text-heading)' }}>{t.language}</h3>
        <p className="text-xs font-mono mb-3" style={{ color: 'var(--ct-text-muted)' }}>{t.selectLanguage}</p>
        <div className="flex gap-3">
          <button onClick={() => setLang('es')} className={`ct-btn flex-1 justify-center ${lang === 'es' ? 'ct-btn-accent' : ''}`} style={lang !== 'es' ? { borderColor: 'var(--ct-border)', color: 'var(--ct-text-muted)' } : {}}>🇪🇸 {t.spanish}</button>
          <button onClick={() => setLang('en')} className={`ct-btn flex-1 justify-center ${lang === 'en' ? 'ct-btn-accent' : ''}`} style={lang !== 'en' ? { borderColor: 'var(--ct-border)', color: 'var(--ct-text-muted)' } : {}}>🇺🇸 {t.english}</button>
        </div>
      </div>
      <div className="ct-card p-6">
        <h3 className="text-base font-bold mb-4 font-display" style={{ color: 'var(--ct-text-heading)' }}>{t.backup}</h3>
        <p className="text-xs font-mono mb-4" style={{ color: 'var(--ct-text-muted)' }}>{t.backupDesc}</p>
        <div className="flex gap-3">
          <button onClick={exportFullBackup} className="ct-btn ct-btn-accent">{I.download} {t.exportBackup}</button>
          <label className="ct-btn ct-btn-green cursor-pointer">{I.upload} {t.importBackup}<input type="file" accept=".json" onChange={importFullBackup} className="hidden" /></label>
        </div>
      </div>
      <div className="ct-card p-6">
        <h3 className="text-base font-bold mb-4 font-display" style={{ color: 'var(--ct-text-heading)' }}>{t.createNewAccount}</h3>
        <div className="grid grid-cols-2 gap-3">
          <input type="text" value={newUser} onChange={e => setNewUser(e.target.value)} placeholder={t.username} className="ct-input px-3 py-2.5 text-sm font-mono" />
          <input type="password" value={newPass} onChange={e => setNewPass(e.target.value)} placeholder={t.password} className="ct-input px-3 py-2.5 text-sm font-mono" />
        </div>
        <button onClick={createAccount} className="ct-btn ct-btn-green mt-3">{I.plus} {t.createAccount}</button>
      </div>
      <div className="ct-card p-6" style={{ borderColor: 'var(--ct-danger-25)' }}>
        <h3 className="text-base font-bold mb-4 font-display" style={{ color: 'var(--ct-danger)' }}>{t.dangerZone}</h3>
        <div className="flex gap-3">
          <button onClick={onLogout} className="ct-btn ct-btn-accent">{I.logout} {t.logout}</button>
          <button onClick={deleteAccount} className="ct-btn ct-btn-danger">{I.trash} {t.deleteAccount}</button>
        </div>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════
// ALERT BANNER
// ════════════════════════════════════════════════════
function AlertBanner({ alerts, onDismiss }) {
  const { t } = useLang()
  if (!alerts || alerts.length === 0) return null
  return (
    <div className="ct-alert-banner px-4 py-2.5 flex items-center gap-3 ct-slide-down">
      <span style={{ color: 'var(--ct-danger)' }} className="animate-pulse text-lg">⚠</span>
      <div className="flex-1 min-w-0">
        <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--ct-danger)' }}>{t.newCriticalVuln}</span>
        <p className="text-xs truncate mt-0.5" style={{ color: 'var(--ct-text)' }}>{alerts[0]?.title}</p>
      </div>
      {alerts.length > 1 && <span className="ct-badge ct-badge-critical">+{alerts.length - 1} {t.more}</span>}
      <button onClick={onDismiss} className="flex-shrink-0 p-1" style={{ color: 'var(--ct-text-muted)' }}>{I.x}</button>
    </div>
  )
}

// ════════════════════════════════════════════════════
// MAIN DASHBOARD
// ════════════════════════════════════════════════════
function DashboardApp({ session, onLogout }) {
  const { t, lang } = useLang()
  const [activeTab, setActiveTab] = useState('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [commandsDB, setCommandsDB] = useState([])
  const feedData = useFeedData()

  useEffect(() => { fetch('/commands.json').then(r => r.json()).then(d => { if (Array.isArray(d)) setCommandsDB(d) }).catch(() => setCommandsDB([])) }, [])
  useEffect(() => { const s = getSettings(session.username); applyTheme(s.theme || 'pro-dark') }, [session.username])
  useEffect(() => { const h = (e) => { if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); setSearchOpen(true) }; if (e.key === 'Escape') setSearchOpen(false) }; window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h) }, [])

  const tabs = [
    { key: 'dashboard', label: t.dashboard, icon: I.dashboard },
    { key: 'feed', label: t.securityFeed, icon: I.rss },
    { key: 'livefeed', label: t.liveFeed, icon: I.live },
    { key: 'commands', label: t.commands, icon: I.code },
    { key: 'saved', label: t.savedCmds, icon: I.save },
    { key: 'notes', label: t.notes, icon: I.note },
    { key: 'favorites', label: t.favorites, icon: I.heart },
    { key: 'settings', label: t.settings, icon: I.settings },
  ]

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--ct-bg)' }}>
      <AlertBanner alerts={feedData.newCriticals} onDismiss={feedData.clearAlerts} />
      <GlobalSearch username={session.username} commandsDB={commandsDB} onNavigate={setActiveTab} isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
      <div className="flex flex-1">
        {sidebarOpen && <div className="fixed inset-0 bg-black/60 z-40 md:hidden" onClick={() => setSidebarOpen(false)} />}
        <nav className={`fixed md:sticky top-0 left-0 h-screen z-50 w-[220px] md:w-[200px] flex-shrink-0 ct-sidebar flex flex-col transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
          <div className="p-4" style={{ borderBottom: '1px solid var(--ct-border)' }}>
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center relative" style={{ background: 'var(--ct-bg-card)', border: '1px solid var(--ct-accent-15)' }}><span style={{ color: 'var(--ct-accent)' }}>{I.terminal}</span><div className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full" style={{ background: 'var(--ct-accent-alt)' }} /></div>
              <div><h1 className="text-sm font-extrabold font-display tracking-tight" style={{ color: 'var(--ct-text-heading)' }}>Cyber<span style={{ color: 'var(--ct-accent)' }}>Toolkit</span></h1><p className="text-[9px] font-mono" style={{ color: 'var(--ct-text-muted)' }}>v2.0 • {commandsDB.length} cmds</p></div>
            </div>
          </div>
          <div className="p-3" style={{ borderBottom: '1px solid var(--ct-border)' }}>
            <button onClick={() => setSearchOpen(true)} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs transition-all" style={{ background: 'var(--ct-bg)', border: '1px solid var(--ct-border)', color: 'var(--ct-text-muted)' }}>
              {I.search}<span className="flex-1 text-left">{t.search}</span><kbd className="text-[9px] font-mono px-1.5 py-0.5 rounded" style={{ background: 'var(--ct-bg-card)', color: 'var(--ct-text-muted)' }}>⌘K</kbd>
            </button>
          </div>
          <div className="flex-1 p-3 space-y-1 overflow-y-auto">
            {tabs.map(tab => (
              <button key={tab.key} onClick={() => { setActiveTab(tab.key); setSidebarOpen(false) }} className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all" style={activeTab === tab.key ? { background: 'var(--ct-accent-10)', color: 'var(--ct-accent)', border: '1px solid var(--ct-accent-15)' } : { color: 'var(--ct-text-muted)', border: '1px solid transparent' }}>
                {tab.icon}{tab.label}
                {tab.key === 'feed' && feedData.newCriticals.length > 0 && <span className="ml-auto w-2 h-2 rounded-full animate-pulse" style={{ background: 'var(--ct-danger)' }} />}
              </button>
            ))}
          </div>
          <div className="p-3" style={{ borderTop: '1px solid var(--ct-border)' }}>
            <div className="flex items-center gap-2.5 px-2 py-2">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'var(--ct-accent-10)', border: '1px solid var(--ct-accent-15)' }}><span className="text-xs font-bold font-mono" style={{ color: 'var(--ct-accent)' }}>{session.username[0].toUpperCase()}</span></div>
              <div className="flex-1 min-w-0"><p className="text-xs font-bold truncate" style={{ color: 'var(--ct-text-heading)' }}>{session.username}</p><p className="text-[9px] font-mono" style={{ color: 'var(--ct-text-muted)' }}>{t.online}</p></div>
              <button onClick={onLogout} style={{ color: 'var(--ct-danger)' }}>{I.logout}</button>
            </div>
          </div>
        </nav>
        <main className="flex-1 flex flex-col min-h-screen overflow-hidden">
          <div className="md:hidden flex items-center gap-3 px-4 py-3 flex-shrink-0" style={{ borderBottom: '1px solid var(--ct-border)', background: 'var(--ct-bg-sidebar)' }}>
            <button onClick={() => setSidebarOpen(true)} style={{ color: 'var(--ct-text-muted)' }}>{I.menu}</button>
            <h2 className="text-sm font-bold font-display flex-1" style={{ color: 'var(--ct-text-heading)' }}>{tabs.find(x => x.key === activeTab)?.label}</h2>
            <button onClick={() => setSearchOpen(true)} style={{ color: 'var(--ct-text-muted)' }}>{I.search}</button>
          </div>
          <div className="flex-1 overflow-y-auto">
            {activeTab === 'dashboard' && <div className="max-w-5xl mx-auto p-4 lg:p-6"><DashboardPanel username={session.username} feedData={feedData} setActiveTab={setActiveTab} commandsDB={commandsDB} /></div>}
            {activeTab === 'feed' && <div className="max-w-4xl mx-auto p-4 lg:p-6"><SecurityFeed feedData={feedData} username={session.username} /></div>}
            {activeTab === 'livefeed' && <SecurityFeedLive lang={lang} t={t} />}
            {activeTab === 'commands' && <div className="max-w-4xl mx-auto p-4 lg:p-6"><CommandsPanel username={session.username} commandsDB={commandsDB} /></div>}
            {activeTab === 'saved' && <div className="max-w-4xl mx-auto p-4 lg:p-6"><SavedCommandsPanel username={session.username} /></div>}
            {activeTab === 'notes' && <NotesSystem username={session.username} />}
            {activeTab === 'favorites' && <div className="max-w-4xl mx-auto p-4 lg:p-6"><FavoritesPanel username={session.username} /></div>}
            {activeTab === 'settings' && <SettingsPanel username={session.username} onLogout={onLogout} />}
          </div>
        </main>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════
// APP ROOT
// ════════════════════════════════════════════════════
function App() {
  const [session, setSession] = useState(() => getSession())
  const [lang, setLangState] = useState(() => getSavedLang())

  const langValue = useMemo(() => ({
    lang,
    t: TRANSLATIONS[lang] || TRANSLATIONS.es,
    setLang: (l) => { saveLang(l); setLangState(l) }
  }), [lang])

  useEffect(() => {
    if (session) { const s = getSettings(session.username); applyTheme(s.theme || 'pro-dark') }
    else applyTheme('pro-dark')
  }, [session])

  return (
    <LangContext.Provider value={langValue}>
      {!session ? <AuthScreen onLogin={(s) => setSession(s)} /> : <DashboardApp session={session} onLogout={() => { clearSession(); setSession(null) }} />}
    </LangContext.Provider>
  )
}

export default App