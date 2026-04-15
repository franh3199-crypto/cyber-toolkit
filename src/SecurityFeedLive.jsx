// src/SecurityFeedLive.jsx
// ═══════════════════════════════════════════════════════════
// Security Feed Live — Complete UI
// Receives lang context via useLang() from App.jsx
// Uses existing theme CSS variables
// ═══════════════════════════════════════════════════════════

import { useState, useCallback, useMemo, memo, useRef, useEffect } from 'react'
import { useFeedEngine } from './feedEngine.js'
import { SEV_CONFIG, SEV_ORDER, FEED_CATEGORIES, MIN_POLLING, MAX_POLLING } from './feedConfig.js'

// ─── Time ago (standalone) ───
function timeAgo(dateStr, isEs) {
  const now = Date.now()
  const d = new Date(dateStr).getTime()
  if (isNaN(d)) return '—'
  const diff = now - d
  const mins = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  if (mins < 1) return isEs ? 'ahora' : 'just now'
  if (mins < 60) return `${mins}${isEs ? ' min' : 'm ago'}`
  if (hours < 24) return `${hours}${isEs ? 'h atrás' : 'h ago'}`
  if (days === 1) return isEs ? 'ayer' : 'yesterday'
  if (days < 30) return `${days}${isEs ? 'd atrás' : 'd ago'}`
  return new Date(dateStr).toLocaleDateString()
}

// ─── Severity label helper ───
function sevLabel(key, isEs) {
  const map = {
    critical: isEs ? 'Crítico' : 'Critical',
    high: isEs ? 'Alto' : 'High',
    medium: isEs ? 'Medio' : 'Medium',
    low: isEs ? 'Bajo' : 'Low',
  }
  return map[key] || key
}

// ─── Category label helper ───
function catLabel(key, isEs) {
  const map = {
    all: isEs ? 'Todos' : 'All',
    malware: 'Malware',
    breach: isEs ? 'Brecha' : 'Breach',
    vulnerability: isEs ? 'Vulnerabilidad' : 'Vulnerability',
    phishing: 'Phishing',
    other: isEs ? 'Otro' : 'Other',
  }
  return map[key] || key
}

// ═══════════════════════════════════════════
// FeedCard — React.memo
// ═══════════════════════════════════════════
const FeedCard = memo(function FeedCard({ item, index, isEs }) {
  const [expanded, setExpanded] = useState(false)
  const sev = SEV_CONFIG[item.severity] || SEV_CONFIG.low
  const catObj = FEED_CATEGORIES.find(c => c.key === item.category) || FEED_CATEGORIES[5]

  return (
    <div className="ct-card overflow-hidden group ct-stagger" style={{ animationDelay: `${Math.min(index * 25, 500)}ms` }}>
      <div className="h-[3px] w-full" style={{ background: `linear-gradient(90deg, ${sev.color}, ${sev.color}44 70%, transparent)` }} />
      <div className="p-4">
        <div className="flex items-center gap-2 flex-wrap mb-2">
          <span className={`ct-badge ${sev.pulse ? 'animate-pulse' : ''}`} style={{ background: sev.bg, borderColor: sev.border, color: sev.color }}>
            {sev.emoji} {sevLabel(item.severity, isEs)}
          </span>
          <span className="ct-badge" style={{ background: 'var(--ct-accent-10)', borderColor: 'var(--ct-border)', color: 'var(--ct-text-muted)' }}>
            {catObj.emoji} {catLabel(item.category, isEs)}
          </span>
          <span className="text-[10px] font-mono" style={{ color: 'var(--ct-text-muted)' }}>{item.source}</span>
          <span className="text-[10px] font-mono ml-auto flex items-center gap-1" style={{ color: 'var(--ct-text-muted)' }}>
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            {timeAgo(item.date, isEs)}
          </span>
        </div>
        <h3 className="text-sm font-bold leading-snug cursor-pointer hover:underline underline-offset-2"
            style={{ color: sev.color }}
            onClick={() => item.link && window.open(item.link, '_blank', 'noopener,noreferrer')}>
          {item.title}
        </h3>
        {item.description && (
          <p className={`text-xs mt-2 leading-relaxed ${expanded ? '' : 'line-clamp-2'}`} style={{ color: 'var(--ct-text-muted)' }}>
            {item.description}
          </p>
        )}
        <div className="flex items-center justify-between mt-3">
          <span className="text-[9px] font-mono" style={{ color: 'var(--ct-text-muted)' }}>
            ID: {item.id.slice(0, 8)}… • {new Date(item.date).toLocaleDateString()}
          </span>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {item.description && item.description.length > 100 && (
              <button onClick={() => setExpanded(p => !p)} className="ct-btn text-[10px] py-0.5 px-2" style={{ borderColor: 'var(--ct-border)', color: 'var(--ct-text-muted)' }}>
                {expanded ? '▲' : '▼'}
              </button>
            )}
            {item.link && (
              <a href={item.link} target="_blank" rel="noopener noreferrer" className="ct-btn ct-btn-accent text-[10px] py-0.5 px-2">↗</a>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}, (prev, next) =>
  prev.item.id === next.item.id &&
  prev.item.severity === next.item.severity &&
  prev.item.title === next.item.title &&
  prev.index === next.index &&
  prev.isEs === next.isEs
)

// ═══════════════════════════════════════════
// MAIN EXPORT
// Receives { t, lang } as props from App.jsx
// ═══════════════════════════════════════════
export default function SecurityFeedLive({ t, lang }) {
  const isEs = lang === 'es'
  const {
    items, newCount, sevCounts, catCounts,
    sys, pollMs,
    refresh, setPollMs, clearNew,
  } = useFeedEngine()

  const [activeCat, setActiveCat] = useState('all')
  const [activeSev, setActiveSev] = useState('all')
  const [search, setSearch] = useState('')
  const [searchDebounced, setSearchDebounced] = useState('')
  const [showSettings, setShowSettings] = useState(false)
  const [visibleCount, setVisibleCount] = useState(30)
  const debounceRef = useRef(null)

  const handleSearch = useCallback((e) => {
    const v = e.target.value
    setSearch(v)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => setSearchDebounced(v), 200)
  }, [])

  useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current) }, [])

  const filtered = useMemo(() => {
    let res = items
    if (activeCat !== 'all') res = res.filter(i => i.category === activeCat)
    if (activeSev !== 'all') res = res.filter(i => i.severity === activeSev)
    if (searchDebounced.trim()) {
      const q = searchDebounced.toLowerCase()
      res = res.filter(i =>
        i.title.toLowerCase().includes(q) ||
        (i.description || '').toLowerCase().includes(q) ||
        i.source.toLowerCase().includes(q)
      )
    }
    res.sort((a, b) => {
      const sa = SEV_ORDER[a.severity] ?? 9, sb = SEV_ORDER[b.severity] ?? 9
      if (sa !== sb) return sa - sb
      return new Date(b.date) - new Date(a.date)
    })
    return res
  }, [items, activeCat, activeSev, searchDebounced])

  useEffect(() => { setVisibleCount(30) }, [activeCat, activeSev, searchDebounced])

  const display = filtered.slice(0, visibleCount)

  const statusColors = { online: '#3FB950', slow: '#D29922', offline: '#F85149' }
  const statusLabels = { online: '● LIVE', slow: '● SLOW', offline: '● OFFLINE' }

  return (
    <div className="min-h-full flex flex-col ct-fade-in" style={{ background: 'var(--ct-bg)' }}>

      {/* STATUS BAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between px-4 py-2.5 text-xs font-mono gap-2" style={{ background: 'var(--ct-bg-card)', borderBottom: '1px solid var(--ct-border)' }}>
        <div className="flex items-center gap-3 flex-wrap">
          <span className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${sys.status === 'online' ? 'animate-pulse' : ''}`} style={{ background: statusColors[sys.status] || statusColors.offline }} />
            <span style={{ color: statusColors[sys.status], fontWeight: 700, letterSpacing: '0.05em' }}>
              {statusLabels[sys.status]}
            </span>
          </span>
          {sys.isUpdating && (
            <span className="flex items-center gap-1" style={{ color: 'var(--ct-accent)' }}>
              <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="60" strokeDashoffset="15"/>
              </svg>
              {isEs ? 'SINCRONIZANDO' : 'SYNCING'}
            </span>
          )}
          {sys.status === 'offline' && sys.lastError && (
            <span style={{ color: 'var(--ct-danger)', opacity: 0.8 }}>⚠ {sys.lastError.slice(0, 50)}</span>
          )}
        </div>
        <div className="flex items-center gap-4" style={{ color: 'var(--ct-text-muted)' }}>
          <span>📡 <strong style={{ color: 'var(--ct-text)' }}>{sys.totalNews}</strong> items</span>
          <span>⏱ {pollMs / 1000}s</span>
          {sys.lastUpdated && <span>🕐 {timeAgo(sys.lastUpdated, isEs)}</span>}
        </div>
        <button onClick={refresh} disabled={sys.isUpdating} className="ct-btn ct-btn-accent text-[10px] py-1 px-3 disabled:opacity-50">
          {sys.isUpdating ? (
            <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182"/>
            </svg>
          ) : '⟳'} {isEs ? 'Actualizar' : 'Refresh'}
        </button>
      </div>

      {/* MAIN CONTENT */}
      <div className="flex-1 max-w-6xl mx-auto w-full px-4 py-6 space-y-5">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-extrabold font-display tracking-tight flex items-center gap-2" style={{ color: 'var(--ct-text-heading)' }}>
              <span style={{ color: 'var(--ct-danger)' }} className="animate-pulse">●</span>
              Security Feed <span style={{ color: 'var(--ct-accent)' }}>Live</span>
            </h2>
            <p className="text-xs font-mono mt-1" style={{ color: 'var(--ct-text-muted)' }}>
              {isEs
                ? `Inteligencia en tiempo real • ${sys.totalNews} amenazas activas • Polling cada ${pollMs/1000}s`
                : `Real-time intelligence • ${sys.totalNews} active threats • Polling every ${pollMs/1000}s`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {newCount > 0 && (
              <button onClick={() => { clearNew(); refresh() }} className="ct-btn ct-btn-green text-xs animate-pulse">
                🆕 {newCount} {isEs ? 'nuevos' : 'new'}
              </button>
            )}
            <button onClick={() => setShowSettings(p => !p)} className="ct-btn text-xs" style={{ borderColor: 'var(--ct-border)', color: 'var(--ct-text-muted)' }}>
              ⚙️ {isEs ? 'Config' : 'Settings'}
            </button>
          </div>
        </div>

        {/* Settings */}
        {showSettings && (
          <div className="ct-card p-4 ct-slide-down space-y-3">
            <h3 className="text-sm font-bold" style={{ color: 'var(--ct-text-heading)' }}>⚙️ {isEs ? 'Configuración del Feed' : 'Feed Settings'}</h3>
            <div className="flex items-center gap-4">
              <label className="text-xs font-mono" style={{ color: 'var(--ct-text-muted)' }}>
                {isEs ? 'Intervalo de polling:' : 'Polling interval:'}
              </label>
              <input type="range" min={MIN_POLLING} max={MAX_POLLING} step={5000} value={pollMs}
                     onChange={(e) => setPollMs(parseInt(e.target.value))}
                     className="flex-1" style={{ accentColor: 'var(--ct-accent)' }} />
              <span className="text-xs font-mono font-bold" style={{ color: 'var(--ct-accent)' }}>{pollMs / 1000}s</span>
            </div>
          </div>
        )}

        {/* Severity cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Object.entries(SEV_CONFIG).map(([key, cfg], i) => (
            <button key={key}
              onClick={() => setActiveSev(p => p === key ? 'all' : key)}
              className={`ct-card p-4 text-left transition-all ct-stagger`}
              style={{ animationDelay: `${i * 60}ms`, ...(activeSev === key ? { borderColor: cfg.color, boxShadow: `0 0 20px ${cfg.bg}` } : {}) }}>
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--ct-text-muted)' }}>
                  {cfg.emoji} {sevLabel(key, isEs)}
                </p>
                {key === 'critical' && sevCounts.critical > 0 && (
                  <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: cfg.color }} />
                )}
              </div>
              <p className="text-3xl font-mono font-bold mt-2" style={{ color: cfg.color }}>{sevCounts[key]}</p>
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative">
          <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ color: 'var(--ct-text-muted)' }}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"/>
          </svg>
          <input value={search} onChange={handleSearch}
                 placeholder={isEs ? 'Buscar amenazas... (título, fuente, descripción)' : 'Search threats... (title, source, description)'}
                 className="w-full ct-input pl-10 pr-10 py-2.5 text-sm font-mono" />
          {search && (
            <button onClick={() => { setSearch(''); setSearchDebounced('') }} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--ct-text-muted)' }}>✕</button>
          )}
        </div>

        {/* Category filters */}
        <div className="flex flex-wrap gap-1.5">
          {FEED_CATEGORIES.map(cat => (
            <button key={cat.key}
              onClick={() => setActiveCat(p => p === cat.key ? 'all' : cat.key)}
              className="ct-btn text-[11px]"
              style={activeCat === cat.key
                ? { background: 'var(--ct-accent-10)', borderColor: 'var(--ct-accent-25)', color: 'var(--ct-accent)' }
                : { borderColor: 'var(--ct-border)', color: 'var(--ct-text-muted)' }}>
              {cat.emoji} {catLabel(cat.key, isEs)} <span className="ml-1 opacity-60">({catCounts[cat.key] || 0})</span>
            </button>
          ))}
        </div>

        {/* Severity filter pills */}
        <div className="flex flex-wrap gap-1.5">
          <button onClick={() => setActiveSev('all')} className="ct-btn text-[11px]"
            style={activeSev === 'all'
              ? { background: 'var(--ct-accent-10)', borderColor: 'var(--ct-accent-25)', color: 'var(--ct-accent)' }
              : { borderColor: 'var(--ct-border)', color: 'var(--ct-text-muted)' }}>
            {isEs ? 'Toda Severidad' : 'All Severity'}
          </button>
          {Object.entries(SEV_CONFIG).map(([key, cfg]) => (
            <button key={key}
              onClick={() => setActiveSev(p => p === key ? 'all' : key)}
              className="ct-btn text-[11px]"
              style={activeSev === key
                ? { background: cfg.bg, borderColor: cfg.border, color: cfg.color }
                : { borderColor: 'var(--ct-border)', color: 'var(--ct-text-muted)' }}>
              {cfg.emoji} {sevLabel(key, isEs)} <span className="ml-1 opacity-60">({sevCounts[key]})</span>
            </button>
          ))}
        </div>

        {/* Feed list */}
        {filtered.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-20 h-20 mx-auto ct-card flex items-center justify-center mb-4" style={{ borderStyle: 'dashed' }}>
              <span className="text-3xl">🔍</span>
            </div>
            <p className="font-display font-semibold" style={{ color: 'var(--ct-text-muted)' }}>
              {isEs ? 'No hay amenazas que coincidan' : 'No threats match your filters'}
            </p>
            <p className="text-xs font-mono mt-2" style={{ color: 'var(--ct-text-muted)' }}>
              {isEs ? 'Intenta ajustar la búsqueda o filtros' : 'Try adjusting your search or filters'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <p className="text-[11px] font-mono" style={{ color: 'var(--ct-text-muted)' }}>
                {isEs
                  ? `Mostrando ${display.length} de ${filtered.length} amenazas`
                  : `Showing ${display.length} of ${filtered.length} threats`}
              </p>
              {searchDebounced && (
                <p className="text-[11px] font-mono" style={{ color: 'var(--ct-accent)' }}>🔍 "{searchDebounced}"</p>
              )}
            </div>

            {display.map((item, i) => (
              <FeedCard key={item.id} item={item} index={i} isEs={isEs} />
            ))}

            {visibleCount < filtered.length && (
              <button onClick={() => setVisibleCount(p => p + 30)} className="w-full ct-btn ct-btn-accent py-3 justify-center">
                {isEs
                  ? `Cargar Más (${filtered.length - visibleCount} restantes)`
                  : `Load More (${filtered.length - visibleCount} remaining)`}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="text-center py-4 text-[10px] font-mono" style={{ color: 'var(--ct-text-muted)', borderTop: '1px solid var(--ct-border)' }}>
        🛡️ Security Feed Live v2.0 • {sys.totalNews} {isEs ? 'amenazas rastreadas' : 'threats tracked'} •
        {isEs ? 'Última sync' : 'Last sync'}: {sys.lastUpdated ? new Date(sys.lastUpdated).toLocaleTimeString() : 'Never'}
      </div>
    </div>
  )
}