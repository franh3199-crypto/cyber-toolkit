import { useState, useEffect, useRef, useMemo, useCallback } from 'react'

// ─── Constantes ────────────────────────────────────────────
const USERS_KEY = 'cyberforge-users'
const SESSION_KEY = 'cyberforge-session'

// ─── Helpers de "Base de Datos" local ──────────────────────
function getUsers() {
  try { return JSON.parse(localStorage.getItem(USERS_KEY)) || {} } catch { return {} }
}
function saveUsers(users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users))
}
function getUserSnippets(email) {
  const users = getUsers()
  return users[email]?.snippets || []
}
function saveUserSnippets(email, snippets) {
  const users = getUsers()
  if (users[email]) { users[email].snippets = snippets; saveUsers(users) }
}
function getSession() {
  try { return JSON.parse(localStorage.getItem(SESSION_KEY)) } catch { return null }
}
function saveSession(session) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session))
}
function clearSession() {
  localStorage.removeItem(SESSION_KEY)
}

// ─── Iconos SVG ────────────────────────────────────────────
const I = {
  search: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"/></svg>,
  plus: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15"/></svg>,
  star: <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>,
  starO: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"/></svg>,
  copy: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9.75a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184"/></svg>,
  check: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5"/></svg>,
  trash: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"/></svg>,
  download: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"/></svg>,
  upload: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"/></svg>,
  terminal: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 7.5l3 2.25-3 2.25m4.5 0h3m-9 8.25h13.5A2.25 2.25 0 0021 18V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v12a2.25 2.25 0 002.25 2.25z"/></svg>,
  folder: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z"/></svg>,
  clock: <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>,
  edit: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10"/></svg>,
  x: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>,
  bolt: <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path fillRule="evenodd" d="M14.615 1.595a.75.75 0 01.359.852L12.982 9.75h7.268a.75.75 0 01.548 1.262l-10.5 11.25a.75.75 0 01-1.272-.71l1.992-7.302H3.75a.75.75 0 01-.548-1.262l10.5-11.25a.75.75 0 01.913-.143z" clipRule="evenodd"/></svg>,
  user: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"/></svg>,
  logout: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9"/></svg>,
  eye: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"/><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>,
  eyeOff: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88"/></svg>,
  mail: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"/></svg>,
  lock: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"/></svg>,
  shield: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"/></svg>,
}

// ─── Colores ───────────────────────────────────────────────
const DIFF_COLORS = {
  básico:     { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20', dot: 'bg-emerald-400' },
  intermedio: { bg: 'bg-amber-500/10',   text: 'text-amber-400',   border: 'border-amber-500/20',   dot: 'bg-amber-400' },
  avanzado:   { bg: 'bg-rose-500/10',    text: 'text-rose-400',    border: 'border-rose-500/20',     dot: 'bg-rose-400' },
}
const LANG_COLORS = {
  bash: '#34d399', python: '#fbbf24', powershell: '#60a5fa', ruby: '#fb7185', javascript: '#fbbf24', sql: '#a78bfa', otro: '#94a3b8',
}

// ═══════════════════════════════════════════════════════════
// COMPONENTE: Toast
// ═══════════════════════════════════════════════════════════
function Toast({ message, type = 'success', onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 2800); return () => clearTimeout(t) }, [onClose])
  const styles = {
    success: 'border-emerald-500/20 text-emerald-400',
    error:   'border-rose-500/20 text-rose-400',
    info:    'border-indigo-500/20 text-indigo-400',
  }
  return (
    <div className={`fixed bottom-6 right-6 z-50 animate-slide-up glass-solid rounded-2xl border ${styles[type]} px-5 py-3.5 shadow-2xl shadow-black/40 flex items-center gap-3`}>
      {type === 'success' && <span className="text-emerald-400">{I.check}</span>}
      {type === 'error' && <span className="text-rose-400">{I.x}</span>}
      {type === 'info' && <span className="text-indigo-400">{I.shield}</span>}
      <span className="text-sm font-medium text-slate-200">{message}</span>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════
// COMPONENTE: Modal Confirmar
// ═══════════════════════════════════════════════════════════
function ConfirmModal({ isOpen, onConfirm, onCancel, snippetName }) {
  if (!isOpen) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onCancel}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div className="relative glass-solid border border-slate-700/40 rounded-3xl p-8 max-w-sm w-full animate-scale-in shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="text-center space-y-5">
          <div className="w-14 h-14 mx-auto bg-rose-500/10 rounded-2xl flex items-center justify-center border border-rose-500/15">
            <span className="text-rose-400 scale-125">{I.trash}</span>
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Eliminar snippet</h3>
            <p className="text-sm text-slate-400 mt-2">
              ¿Seguro que querés eliminar <span className="text-white font-semibold">"{snippetName}"</span>?
            </p>
          </div>
          <div className="flex gap-3 pt-1">
            <button onClick={onCancel} className="flex-1 px-4 py-2.5 rounded-xl border border-void-500 text-slate-400 hover:text-white hover:border-void-600 transition-all text-sm font-medium">
              Cancelar
            </button>
            <button onClick={onConfirm} className="flex-1 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white transition-all text-sm font-bold">
              Eliminar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════
// COMPONENTE: Stat Card
// ═══════════════════════════════════════════════════════════
function StatCard({ label, value, icon, color = 'indigo' }) {
  const c = {
    indigo:  'border-indigo-500/10 text-indigo-400',
    amber:   'border-amber-500/10 text-amber-400',
    emerald: 'border-emerald-500/10 text-emerald-400',
    purple:  'border-violet-500/10 text-violet-400',
  }
  return (
    <div className={`rounded-2xl border ${c[color]} bg-void-200/50 p-4 card-hover`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">{label}</p>
          <p className={`text-2xl font-mono font-bold mt-1 ${c[color].split(' ')[1]}`}>{value}</p>
        </div>
        <div className="opacity-20 scale-125">{icon}</div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════
// COMPONENTE: Snippet Card
// ═══════════════════════════════════════════════════════════
function SnippetCard({ snippet, onCopy, onToggleFav, onDelete, onEdit, copiadoId }) {
  const dc = DIFF_COLORS[snippet.dificultad] || DIFF_COLORS['básico']
  const lc = LANG_COLORS[snippet.lenguaje] || LANG_COLORS['otro']
  const esReciente = snippet.ultimoUso && (Date.now() - snippet.ultimoUso) / 3600000 < 24

  return (
    <article className={`group card-hover rounded-2xl border overflow-hidden ${
      snippet.favorito ? 'border-amber-500/15 bg-void-200/70' : 'border-void-500/40 bg-void-200/50'
    }`}>
      <div className="h-[2px] w-full opacity-60" style={{ background: `linear-gradient(90deg, ${lc}, transparent 70%)` }} />
      <div className="p-5 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1.5 min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-[15px] font-bold text-white tracking-tight">{snippet.nombre}</h3>
              {esReciente && (
                <span className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded-md border border-indigo-500/15">
                  {I.clock} reciente
                </span>
              )}
            </div>
            <div className="flex items-center gap-2.5 text-[11px] text-slate-500">
              <span className="flex items-center gap-1">{I.folder} {snippet.carpeta || 'General'}</span>
              <span className="w-[3px] h-[3px] rounded-full bg-void-600" />
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: lc }} />
                {snippet.lenguaje || 'bash'}
              </span>
              <span className="w-[3px] h-[3px] rounded-full bg-void-600" />
              <span className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold ${dc.bg} ${dc.text} border ${dc.border}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${dc.dot}`} />
                {snippet.dificultad || 'básico'}
              </span>
            </div>
          </div>
          {/* Actions */}
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <button onClick={() => onToggleFav(snippet.id)} className={`p-1.5 rounded-lg transition-all ${snippet.favorito ? 'text-amber-400' : 'text-slate-600 hover:text-amber-400'}`}>
              {snippet.favorito ? I.star : I.starO}
            </button>
            <button onClick={() => onEdit(snippet)} className="p-1.5 rounded-lg text-slate-600 hover:text-indigo-400 transition-all">{I.edit}</button>
            <button onClick={() => onDelete(snippet.id, snippet.nombre)} className="p-1.5 rounded-lg text-slate-600 hover:text-rose-400 transition-all">{I.trash}</button>
          </div>
        </div>

        {snippet.descripcion && <p className="text-[13px] text-slate-400/80 leading-relaxed">{snippet.descripcion}</p>}

        {/* Code Block */}
        <div className="relative group/code">
          <div className="flex items-center gap-1.5 px-3.5 py-2 bg-void-100 rounded-t-xl border-b border-void-400/30">
            <span className="w-2 h-2 rounded-full bg-rose-500/50" /><span className="w-2 h-2 rounded-full bg-amber-500/50" /><span className="w-2 h-2 rounded-full bg-emerald-500/50" />
            <span className="ml-2 text-[10px] text-slate-600 font-mono">{snippet.lenguaje || 'bash'}</span>
          </div>
          <pre className="bg-void-100 rounded-b-xl p-4 font-mono text-sm text-cyan-300/80 overflow-x-auto border-x border-b border-void-400/10 leading-relaxed">
            <code>{snippet.codigo}</code>
          </pre>
          <button
            onClick={() => onCopy(snippet.id, snippet.codigo)}
            className={`absolute right-3 bottom-3 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
              copiadoId === snippet.id
                ? 'bg-emerald-600 text-white'
                : 'bg-void-400/80 text-slate-400 hover:bg-void-500 hover:text-white opacity-0 group-hover/code:opacity-100'
            }`}
          >
            {copiadoId === snippet.id ? I.check : I.copy}
            {copiadoId === snippet.id ? 'Copiado!' : 'Copiar'}
          </button>
        </div>

        {snippet.tags?.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {snippet.tags.map((tag, i) => (
              <span key={i} className="text-[10px] font-medium text-slate-500 bg-void-400/30 px-2.5 py-1 rounded-lg border border-void-500/30 hover:text-indigo-400 hover:border-indigo-500/20 transition-colors cursor-default">
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </article>
  )
}

// ═══════════════════════════════════════════════════════════
// COMPONENTE: Pantalla de Auth (Login / Register)
// ═══════════════════════════════════════════════════════════
function AuthScreen({ onLogin }) {
  const [mode, setMode] = useState('login') // 'login' | 'register'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [nombre, setNombre] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (!email.trim() || !password.trim()) { setError('Completá todos los campos'); return }
    if (password.length < 6) { setError('La contraseña debe tener al menos 6 caracteres'); return }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) { setError('Email inválido'); return }

    setLoading(true)
    setTimeout(() => {
      const users = getUsers()

      if (mode === 'register') {
        if (users[email]) { setError('Ya existe una cuenta con ese email'); setLoading(false); return }
        if (!nombre.trim()) { setError('Ingresá tu nombre'); setLoading(false); return }
        users[email] = { nombre: nombre.trim(), password, snippets: [], createdAt: Date.now() }
        saveUsers(users)
        const session = { email, nombre: nombre.trim() }
        saveSession(session)
        onLogin(session)
      } else {
        if (!users[email]) { setError('No existe una cuenta con ese email'); setLoading(false); return }
        if (users[email].password !== password) { setError('Contraseña incorrecta'); setLoading(false); return }
        const session = { email, nombre: users[email].nombre }
        saveSession(session)
        onLogin(session)
      }
      setLoading(false)
    }, 600)
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md space-y-8 animate-fade-in">
        {/* Logo */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-indigo-500 to-cyan-500 rounded-2xl shadow-xl shadow-indigo-900/30 mx-auto">
            <span className="text-white scale-125">{I.bolt}</span>
          </div>
          <div>
            <h1 className="text-3xl font-extrabold text-white font-display">
              Cyber<span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">Forge</span>
            </h1>
            <p className="text-slate-500 text-sm mt-1">Arsenal de comandos de ciberseguridad</p>
          </div>
        </div>

        {/* Card */}
        <div className="glass rounded-3xl border border-void-500/40 p-8 shadow-2xl shadow-black/30 gradient-border">
          <h2 className="text-xl font-bold text-white mb-6">
            {mode === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider ml-1">Nombre</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-600">{I.user}</span>
                  <input
                    type="text" value={nombre} onChange={e => setNombre(e.target.value)}
                    placeholder="Tu nombre"
                    className="w-full bg-void-100 border border-void-500/60 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-slate-600 outline-none focus:border-indigo-500/40 transition-all"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider ml-1">Email</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-600">{I.mail}</span>
                <input
                  type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="tu@email.com"
                  className="w-full bg-void-100 border border-void-500/60 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-slate-600 outline-none focus:border-indigo-500/40 transition-all"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider ml-1">Contraseña</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-600">{I.lock}</span>
                <input
                  type={showPass ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className="w-full bg-void-100 border border-void-500/60 rounded-xl pl-10 pr-12 py-3 text-sm text-white placeholder-slate-600 outline-none focus:border-indigo-500/40 transition-all"
                />
                <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-400 transition-colors">
                  {showPass ? I.eyeOff : I.eye}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 px-4 py-2.5 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-sm animate-slide-down">
                <span>{I.x}</span> {error}
              </div>
            )}

            <button type="submit" disabled={loading} className="w-full btn-primary text-white font-bold py-3.5 rounded-xl text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
              {loading ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  {mode === 'login' ? I.shield : I.plus}
                  {mode === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-void-500/30 text-center">
            {mode === 'login' ? (
              <p className="text-sm text-slate-500">
                ¿No tenés cuenta?{' '}
                <button onClick={() => { setMode('register'); setError('') }} className="text-indigo-400 hover:text-indigo-300 font-semibold transition-colors">
                  Crear una
                </button>
              </p>
            ) : (
              <p className="text-sm text-slate-500">
                ¿Ya tenés cuenta?{' '}
                <button onClick={() => { setMode('login'); setError('') }} className="text-indigo-400 hover:text-indigo-300 font-semibold transition-colors">
                  Iniciá sesión
                </button>
              </p>
            )}
          </div>
        </div>

        <p className="text-center text-[11px] text-slate-600">
          🔒 Tus datos se guardan localmente en tu navegador
        </p>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════
// COMPONENTE: Dashboard Principal
// ═══════════════════════════════════════════════════════════
function Dashboard({ session, onLogout }) {
  const [snippets, setSnippets] = useState(() => getUserSnippets(session.email))
  const [form, setForm] = useState({ nombre: '', codigo: '', tags: '', descripcion: '', carpeta: '', lenguaje: 'bash', dificultad: 'básico' })
  const [editingId, setEditingId] = useState(null)
  const [copiadoId, setCopiadoId] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [carpetaActiva, setCarpetaActiva] = useState('todas')
  const [showForm, setShowForm] = useState(false)
  const [toast, setToast] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [viewMode, setViewMode] = useState('list')
  const searchRef = useRef(null)

  // Guardar en "cuenta"
  useEffect(() => {
    saveUserSnippets(session.email, snippets)
  }, [snippets, session.email])

  // Atajos de teclado
  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); searchRef.current?.focus() }
      if (e.key === 'Escape') { setShowForm(false); searchRef.current?.blur() }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const carpetas = useMemo(() => ['todas', ...new Set(snippets.map(s => s.carpeta || 'General'))], [snippets])
  const totalFavoritos = useMemo(() => snippets.filter(s => s.favorito).length, [snippets])
  const totalCarpetas = useMemo(() => new Set(snippets.map(s => s.carpeta || 'General')).size, [snippets])
  const totalRecientes = useMemo(() => snippets.filter(s => s.ultimoUso && (Date.now() - s.ultimoUso) / 3600000 < 24).length, [snippets])

  const snippetsFiltrados = useMemo(() => {
    return snippets
      .filter(snippet => {
        if (carpetaActiva !== 'todas' && (snippet.carpeta || 'General') !== carpetaActiva) return false
        const term = searchTerm.toLowerCase().trim()
        if (!term) return true
        return snippet.nombre.toLowerCase().includes(term) || snippet.descripcion?.toLowerCase().includes(term) || snippet.codigo.toLowerCase().includes(term) || snippet.tags?.some(t => t.toLowerCase().includes(term)) || snippet.lenguaje?.toLowerCase().includes(term)
      })
      .sort((a, b) => {
        if (a.favorito !== b.favorito) return a.favorito ? -1 : 1
        return (b.ultimoUso || 0) - (a.ultimoUso || 0)
      })
  }, [snippets, carpetaActiva, searchTerm])

  const showToast = useCallback((message, type = 'success') => setToast({ message, type }), [])

  function guardarSnippet() {
    if (!form.nombre.trim() || !form.codigo.trim()) { showToast('Nombre y código son requeridos', 'error'); return }

    if (editingId) {
      setSnippets(prev => prev.map(s => s.id === editingId ? {
        ...s, nombre: form.nombre.trim(), codigo: form.codigo.trim(), descripcion: form.descripcion.trim(),
        tags: form.tags.split(',').map(t => t.trim()).filter(Boolean), carpeta: form.carpeta.trim() || 'General',
        lenguaje: form.lenguaje, dificultad: form.dificultad,
      } : s))
      showToast('Snippet actualizado')
      setEditingId(null)
    } else {
      setSnippets(prev => [{
        id: Date.now(), nombre: form.nombre.trim(), codigo: form.codigo.trim(), descripcion: form.descripcion.trim(),
        tags: form.tags.split(',').map(t => t.trim()).filter(Boolean), favorito: false,
        carpeta: form.carpeta.trim() || 'General', ultimoUso: null, lenguaje: form.lenguaje, dificultad: form.dificultad,
      }, ...prev])
      showToast('Snippet guardado en tu arsenal')
    }
    setForm({ nombre: '', codigo: '', tags: '', descripcion: '', carpeta: '', lenguaje: 'bash', dificultad: 'básico' })
    setShowForm(false)
  }

  function iniciarEdicion(snippet) {
    setForm({ nombre: snippet.nombre, codigo: snippet.codigo, tags: snippet.tags?.join(', ') || '', descripcion: snippet.descripcion || '', carpeta: snippet.carpeta || '', lenguaje: snippet.lenguaje || 'bash', dificultad: snippet.dificultad || 'básico' })
    setEditingId(snippet.id)
    setShowForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function confirmarEliminar() {
    if (confirmDelete) { setSnippets(prev => prev.filter(s => s.id !== confirmDelete.id)); showToast('Snippet eliminado', 'info'); setConfirmDelete(null) }
  }

  async function copiarCodigo(id, codigo) {
    try {
      await navigator.clipboard.writeText(codigo)
      setCopiadoId(id); setTimeout(() => setCopiadoId(null), 2000)
      setSnippets(prev => prev.map(s => s.id === id ? { ...s, ultimoUso: Date.now() } : s))
    } catch { showToast('Error al copiar', 'error') }
  }

  function exportarSnippets() {
    const blob = new Blob([JSON.stringify(snippets, null, 2)], { type: 'application/json' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob)
    a.download = `cyberforge-${session.nombre}-${new Date().toISOString().slice(0, 10)}.json`
    a.click(); URL.revokeObjectURL(a.href); showToast('Snippets exportados')
  }

  function importarSnippets(e) {
    const file = e.target.files[0]; if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const imported = JSON.parse(ev.target.result)
        if (Array.isArray(imported)) { setSnippets(prev => [...imported, ...prev]); showToast(`${imported.length} snippets importados`) }
      } catch { showToast('Archivo inválido', 'error') }
    }
    reader.readAsText(file); e.target.value = ''
  }

  return (
    <div className="min-h-screen text-slate-300 font-sans">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      <ConfirmModal isOpen={!!confirmDelete} snippetName={confirmDelete?.nombre} onConfirm={confirmarEliminar} onCancel={() => setConfirmDelete(null)} />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-10 space-y-8">

        {/* ═══════ HEADER ═══════ */}
        <header className="space-y-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
            <div className="flex items-center gap-3.5">
              <div className="relative">
                <div className="w-11 h-11 bg-gradient-to-br from-indigo-500 to-cyan-500 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-900/20">
                  <span className="text-white">{I.bolt}</span>
                </div>
                <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-void-50" />
              </div>
              <div>
                <h1 className="text-2xl lg:text-3xl font-extrabold text-white tracking-tight font-display">
                  Cyber<span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">Forge</span>
                </h1>
                <p className="text-xs text-slate-500 mt-0.5">Tu arsenal personal de ciberseguridad</p>
              </div>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              {/* User Info */}
              <div className="flex items-center gap-2.5 px-4 py-2 bg-void-200/60 rounded-xl border border-void-500/30">
                <div className="w-7 h-7 bg-gradient-to-br from-indigo-500 to-violet-500 rounded-lg flex items-center justify-center">
                  <span className="text-white text-xs font-bold">{session.nombre.charAt(0).toUpperCase()}</span>
                </div>
                <div className="hidden sm:block">
                  <p className="text-xs font-semibold text-white leading-none">{session.nombre}</p>
                  <p className="text-[10px] text-slate-500 leading-none mt-0.5">{session.email}</p>
                </div>
              </div>
              <button onClick={onLogout} className="flex items-center gap-1.5 px-3 py-2 text-slate-500 hover:text-rose-400 rounded-xl border border-void-500/30 hover:border-rose-500/20 transition-all text-xs font-medium">
                {I.logout} Salir
              </button>
            </div>
          </div>

          {/* Actions bar */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={() => { setShowForm(!showForm); setEditingId(null); setForm({ nombre: '', codigo: '', tags: '', descripcion: '', carpeta: '', lenguaje: 'bash', dificultad: 'básico' }) }}
              className="flex items-center gap-2 px-4 py-2.5 btn-primary text-white font-semibold rounded-xl text-sm"
            >
              {showForm ? I.x : I.plus}
              {showForm ? 'Cerrar' : 'Nuevo Snippet'}
            </button>
            <button onClick={exportarSnippets} className="flex items-center gap-1.5 px-3.5 py-2.5 border border-void-500/40 text-slate-500 hover:text-white hover:border-void-600 rounded-xl transition-all text-sm">
              {I.download} <span className="hidden sm:inline">Exportar</span>
            </button>
            <label className="flex items-center gap-1.5 px-3.5 py-2.5 border border-void-500/40 text-slate-500 hover:text-white hover:border-void-600 rounded-xl transition-all text-sm cursor-pointer">
              {I.upload} <span className="hidden sm:inline">Importar</span>
              <input type="file" accept=".json" onChange={importarSnippets} className="hidden" />
            </label>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard label="Snippets" value={snippets.length} icon={I.terminal} color="indigo" />
            <StatCard label="Favoritos" value={totalFavoritos} icon={I.star} color="amber" />
            <StatCard label="Carpetas" value={totalCarpetas} icon={I.folder} color="emerald" />
            <StatCard label="Recientes" value={totalRecientes} icon={I.clock} color="purple" />
          </div>
        </header>

        {/* ═══════ FORMULARIO ═══════ */}
        {showForm && (
          <div className="animate-slide-down">
            <div className="glass rounded-2xl p-6 lg:p-8 border border-void-500/40 shadow-xl gradient-border">
              <h2 className="text-base font-bold text-white mb-5 flex items-center gap-2.5">
                <div className="w-7 h-7 bg-indigo-500/10 rounded-lg flex items-center justify-center text-indigo-400 border border-indigo-500/15">
                  {editingId ? I.edit : I.plus}
                </div>
                {editingId ? 'Editar Snippet' : 'Nuevo Snippet'}
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider ml-1">Nombre *</label>
                  <input type="text" value={form.nombre} onChange={e => setForm(p => ({...p, nombre: e.target.value}))} placeholder="nmap full scan..."
                    className="w-full bg-void-100 border border-void-500/50 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 outline-none focus:border-indigo-500/40 transition-all" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider ml-1">Carpeta</label>
                  <input type="text" value={form.carpeta} onChange={e => setForm(p => ({...p, carpeta: e.target.value}))} placeholder="General"
                    className="w-full bg-void-100 border border-void-500/50 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 outline-none focus:border-indigo-500/40 transition-all" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider ml-1">Lenguaje</label>
                  <select value={form.lenguaje} onChange={e => setForm(p => ({...p, lenguaje: e.target.value}))}
                    className="w-full bg-void-100 border border-void-500/50 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-indigo-500/40 transition-all appearance-none cursor-pointer">
                    <option value="bash">Bash</option><option value="python">Python</option><option value="powershell">PowerShell</option>
                    <option value="ruby">Ruby</option><option value="javascript">JavaScript</option><option value="sql">SQL</option><option value="otro">Otro</option>
                  </select>
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider ml-1">Descripción</label>
                  <input type="text" value={form.descripcion} onChange={e => setForm(p => ({...p, descripcion: e.target.value}))} placeholder="¿Qué hace este comando?"
                    className="w-full bg-void-100 border border-void-500/50 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 outline-none focus:border-indigo-500/40 transition-all" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider ml-1">Dificultad</label>
                  <select value={form.dificultad} onChange={e => setForm(p => ({...p, dificultad: e.target.value}))}
                    className="w-full bg-void-100 border border-void-500/50 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-indigo-500/40 transition-all appearance-none cursor-pointer">
                    <option value="básico">🟢 Básico</option><option value="intermedio">🟡 Intermedio</option><option value="avanzado">🔴 Avanzado</option>
                  </select>
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider ml-1">Código *</label>
                  <textarea value={form.codigo} onChange={e => setForm(p => ({...p, codigo: e.target.value}))} rows={4} placeholder="nmap -sV -A target.com"
                    className="w-full bg-void-100 border border-void-500/50 rounded-xl px-4 py-3 text-sm font-mono text-emerald-400 placeholder-slate-600 outline-none focus:border-indigo-500/40 transition-all resize-none" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider ml-1">Tags (separados por coma)</label>
                  <input type="text" value={form.tags} onChange={e => setForm(p => ({...p, tags: e.target.value}))} placeholder="nmap, recon, web"
                    className="w-full bg-void-100 border border-void-500/50 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 outline-none focus:border-indigo-500/40 transition-all" />
                </div>
              </div>

              <div className="flex items-center gap-3 mt-6">
                <button onClick={guardarSnippet} className="flex items-center gap-2 px-5 py-2.5 btn-primary text-white font-semibold rounded-xl text-sm">
                  {I.check} {editingId ? 'Actualizar' : 'Guardar'}
                </button>
                {editingId && (
                  <button onClick={() => { setEditingId(null); setShowForm(false); setForm({ nombre: '', codigo: '', tags: '', descripcion: '', carpeta: '', lenguaje: 'bash', dificultad: 'básico' }) }}
                    className="px-4 py-2.5 text-slate-500 hover:text-white transition-all text-sm">
                    Cancelar
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ═══════ BUSCADOR + FILTROS ═══════ */}
        <div className="space-y-3">
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600">{I.search}</span>
            <input ref={searchRef} type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
              placeholder="Buscar comandos, tags, carpetas..."
              className="w-full bg-void-200/50 border border-void-500/30 rounded-2xl pl-11 pr-24 py-3.5 text-sm text-white placeholder-slate-600 outline-none focus:border-indigo-500/30 transition-all" />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
              {searchTerm && <button onClick={() => setSearchTerm('')} className="text-slate-600 hover:text-white transition-colors">{I.x}</button>}
              <kbd className="hidden sm:flex items-center gap-1 px-2 py-1 rounded-lg bg-void-400/50 border border-void-500/30 text-[10px] text-slate-600 font-mono">⌘K</kbd>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-semibold text-slate-600 uppercase tracking-widest mr-1">Filtrar:</span>
            {carpetas.map(c => (
              <button key={c} onClick={() => setCarpetaActiva(c)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all duration-200 ${
                  carpetaActiva === c ? 'bg-indigo-500/10 border-indigo-500/25 text-indigo-400' : 'bg-transparent border-void-500/30 text-slate-500 hover:border-void-600 hover:text-slate-400'
                }`}>
                {c === 'todas' ? 'Todo' : c}
              </button>
            ))}
            <div className="ml-auto flex items-center gap-1 bg-void-200/50 rounded-lg p-0.5 border border-void-500/20">
              <button onClick={() => setViewMode('list')} className={`px-2.5 py-1.5 rounded-md text-[11px] font-medium transition-all ${viewMode === 'list' ? 'bg-void-400/60 text-white' : 'text-slate-600 hover:text-slate-400'}`}>
                ☰ Lista
              </button>
              <button onClick={() => setViewMode('grid')} className={`px-2.5 py-1.5 rounded-md text-[11px] font-medium transition-all ${viewMode === 'grid' ? 'bg-void-400/60 text-white' : 'text-slate-600 hover:text-slate-400'}`}>
                ⊞ Grid
              </button>
            </div>
          </div>
        </div>

        {/* Info */}
        <p className="text-[11px] text-slate-600">
          Mostrando <span className="text-slate-400 font-semibold">{snippetsFiltrados.length}</span> de {snippets.length} snippets
          {searchTerm && <span> para "<span className="text-indigo-400">{searchTerm}</span>"</span>}
        </p>

        {/* ═══════ SNIPPETS ═══════ */}
        <div className={viewMode === 'grid' ? 'grid grid-cols-1 lg:grid-cols-2 gap-4' : 'space-y-4'}>
          {snippetsFiltrados.map((snippet, i) => (
            <div key={snippet.id} className="animate-fade-in" style={{ animationDelay: `${i * 40}ms` }}>
              <SnippetCard snippet={snippet} onCopy={copiarCodigo} onToggleFav={id => setSnippets(prev => prev.map(s => s.id === id ? {...s, favorito: !s.favorito} : s))}
                onDelete={(id, nombre) => setConfirmDelete({ id, nombre })} onEdit={iniciarEdicion} copiadoId={copiadoId} />
            </div>
          ))}

          {snippetsFiltrados.length === 0 && (
            <div className="col-span-full text-center py-20 bg-void-200/30 rounded-2xl border border-dashed border-void-500/30">
              <div className="space-y-3">
                <div className="w-16 h-16 mx-auto bg-void-300/50 rounded-2xl flex items-center justify-center">
                  <span className="text-slate-600 scale-125">{snippets.length === 0 ? I.plus : I.search}</span>
                </div>
                <p className="text-slate-500 font-medium">{snippets.length === 0 ? 'Tu arsenal está vacío' : 'Sin resultados'}</p>
                <p className="text-slate-600 text-sm">{snippets.length === 0 ? 'Creá tu primer snippet para empezar' : 'Probá con otros términos'}</p>
                {snippets.length === 0 ? (
                  <button onClick={() => setShowForm(true)} className="mt-3 inline-flex items-center gap-2 px-4 py-2 btn-primary text-white font-semibold rounded-xl text-sm">
                    {I.plus} Crear snippet
                  </button>
                ) : searchTerm && (
                  <button onClick={() => setSearchTerm('')} className="mt-2 px-4 py-2 bg-void-400/50 text-slate-400 hover:text-white rounded-xl text-sm transition-all">
                    Limpiar búsqueda
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ═══════ FOOTER ═══════ */}
        <footer className="border-t border-void-400/20 pt-6 mt-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-slate-600">
            <div className="flex items-center gap-2">
              <span className="text-indigo-500">{I.shield}</span>
              CyberForge — Arsenal de ciberseguridad
            </div>
            <div className="flex items-center gap-3">
              <span>Sesión: {session.email}</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/60" />
              <span className="text-emerald-500/70">Online</span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════
// APP ROOT — Manejo de sesión
// ═══════════════════════════════════════════════════════════
function App() {
  const [session, setSession] = useState(() => getSession())

  function handleLogin(sess) {
    setSession(sess)
  }

  function handleLogout() {
    clearSession()
    setSession(null)
  }

  if (!session) {
    return <AuthScreen onLogin={handleLogin} />
  }

  return <Dashboard session={session} onLogout={handleLogout} />
}

export default App