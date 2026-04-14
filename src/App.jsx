import { useState, useEffect } from 'react'

const STORAGE_KEY = 'cyber-toolkit-snippets'

function App() {

  const [snippets, setSnippets] = useState(() => {
    try {
      const guardados = localStorage.getItem(STORAGE_KEY)
      return guardados ? JSON.parse(guardados) : []
    } catch {
      return []
    }
  })

  const [nombre,      setNombre]     = useState('')
  const [codigo,      setCodigo]     = useState('')
  const [tags,        setTags]       = useState('')
  const [descripcion, setDesc]       = useState('')
  const [carpeta,     setCarpeta]    = useState('')
  const [copiadoId,   setCopiadoId]  = useState(null)
  const [searchTerm,  setSearchTerm] = useState('')
  const [carpetaActiva, setCarpetaActiva] = useState('todas')

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(snippets))
  }, [snippets])

  const carpetas = ['todas', ...new Set(snippets.map(s => s.carpeta || 'General'))]

  function esReciente(timestamp) {
    if (!timestamp) return false
    const horasTranscurridas = (Date.now() - timestamp) / (1000 * 60 * 60)
    return horasTranscurridas < 24
  }

  const snippetsFiltrados = snippets
    .filter(snippet => {
      if (carpetaActiva !== 'todas' && (snippet.carpeta || 'General') !== carpetaActiva) return false
      const term = searchTerm.toLowerCase().trim()
      if (!term) return true
      return (
        snippet.nombre.toLowerCase().includes(term)              ||
        snippet.descripcion.toLowerCase().includes(term)         ||
        snippet.codigo.toLowerCase().includes(term)              ||
        snippet.tags.some(tag => tag.toLowerCase().includes(term))
      )
    })
    .sort((a, b) => {
      if (a.favorito && !b.favorito) return -1
      if (!a.favorito && b.favorito) return 1
      const aReciente = esReciente(a.ultimoUso)
      const bReciente = esReciente(b.ultimoUso)
      if (aReciente && !bReciente) return -1
      if (!aReciente && bReciente) return 1
      if (a.ultimoUso !== b.ultimoUso) {
        return (b.ultimoUso || 0) - (a.ultimoUso || 0)
      }
      return 0
    })

  function guardarSnippet() {
    if (!nombre.trim() || !codigo.trim()) return
    const nuevoSnippet = {
      id:          Date.now(),
      nombre:      nombre.trim(),
      codigo:      codigo.trim(),
      descripcion: descripcion.trim(),
      tags:        tags.split(',').map(t => t.trim()).filter(Boolean),
      favorito:    false,
      carpeta:     carpeta.trim() || 'General',
      ultimoUso:   null,
    }
    setSnippets([nuevoSnippet, ...snippets])
    setNombre(''); setCodigo(''); setTags(''); setDesc(''); setCarpeta('')
  }

  function eliminarSnippet(id) {
    setSnippets(snippets.filter(s => s.id !== id))
  }

  function toggleFavorito(id) {
    setSnippets(snippets.map(s => s.id === id ? { ...s, favorito: !s.favorito } : s))
  }

  async function copiarCodigo(id, codigo) {
    try {
      await navigator.clipboard.writeText(codigo)
      setCopiadoId(id)
      setTimeout(() => setCopiadoId(null), 2000)
      setSnippets(prev => prev.map(s => s.id === id ? { ...s, ultimoUso: Date.now() } : s))
    } catch {
      alert('Error al copiar')
    }
  }

  const totalFavoritos = snippets.filter(s => s.favorito).length

  return (
    <div className="min-h-screen bg-[#0b0e14] text-slate-300 font-sans selection:bg-cyan-500/30">
      {/* Background Decor */}
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_50%_0%,_#1e293b_0%,_transparent_50%)] pointer-events-none opacity-50"></div>

      <div className="relative max-w-5xl mx-auto px-6 py-12">
        
        {/* Header Section */}
        <header className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6 border-b border-slate-800 pb-10">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-cyan-600 rounded-xl flex items-center justify-center shadow-lg shadow-cyan-900/20">
                <span className="text-white text-xl">🛡️</span>
              </div>
              <h1 className="text-4xl font-extrabold text-white tracking-tight">Cyber Toolkit</h1>
            </div>
            <p className="text-slate-500 text-lg ml-1">Central de inteligencia y comandos de seguridad.</p>
          </div>
          
          <div className="flex items-center gap-4 bg-slate-900/50 p-2 rounded-2xl border border-slate-800">
            <div className="px-4 py-1 text-center border-r border-slate-800">
              <span className="text-[10px] uppercase tracking-widest text-slate-500 block font-bold">Total</span>
              <span className="text-xl font-mono text-cyan-500">{snippets.length}</span>
            </div>
            <div className="px-4 py-1 text-center">
              <span className="text-[10px] uppercase tracking-widest text-slate-500 block font-bold">⭐ Favs</span>
              <span className="text-xl font-mono text-yellow-500">{totalFavoritos}</span>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          
          {/* Formulario Lateral */}
          <aside className="lg:col-span-5">
            <div className="bg-[#161b22] rounded-3xl p-8 border border-slate-800 shadow-2xl sticky top-8">
              <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                <span className="w-1.5 h-5 bg-cyan-500 rounded-full"></span>
                Nuevo Snippet
              </h2>
              
              <div className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase ml-1 tracking-wider">Nombre</label>
                    <input
                      type="text" value={nombre} onChange={e => setNombre(e.target.value)}
                      placeholder="nmap scan..."
                      className="w-full bg-[#0d1117] border border-slate-800 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 outline-none transition-all"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase ml-1 tracking-wider">Carpeta</label>
                    <input
                      type="text" value={carpeta} onChange={e => setCarpeta(e.target.value)}
                      placeholder="General"
                      className="w-full bg-[#0d1117] border border-slate-800 rounded-xl px-4 py-2.5 text-sm focus:border-cyan-500 outline-none transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase ml-1 tracking-wider">Descripción</label>
                  <input
                    type="text" value={descripcion} onChange={e => setDesc(e.target.value)}
                    placeholder="¿Qué hace este comando?"
                    className="w-full bg-[#0d1117] border border-slate-800 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-cyan-500 transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase ml-1 tracking-wider">Código</label>
                  <textarea
                    value={codigo} onChange={e => setCodigo(e.target.value)}
                    rows={4} placeholder="nmap -sV -A target.com"
                    className="w-full bg-[#0d1117] border border-slate-800 rounded-xl px-4 py-3 text-sm font-mono text-emerald-400 focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 outline-none transition-all resize-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase ml-1 tracking-wider">Tags</label>
                  <input
                    type="text" value={tags} onChange={e => setTags(e.target.value)}
                    placeholder="nmap, recon, web"
                    className="w-full bg-[#0d1117] border border-slate-800 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-cyan-500 transition-all"
                  />
                </div>

                <button
                  onClick={guardarSnippet}
                  className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-cyan-900/10 transition-all active:scale-[0.98]"
                >
                  Guardar en Repositorio
                </button>
              </div>
            </div>
          </aside>

          {/* Listado y Búsqueda */}
          <main className="lg:col-span-7 space-y-8">
            
            {/* Buscador de Estilo Minimalista */}
            <div className="space-y-6">
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">🔍</span>
                <input
                  type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                  placeholder="Buscar comandos, tags o carpetas..."
                  className="w-full bg-slate-900/30 border border-slate-800 rounded-2xl pl-12 pr-4 py-4 text-sm outline-none focus:ring-2 focus:ring-cyan-500/10 focus:border-slate-600 transition-all"
                />
              </div>

              {/* Filtros de Carpeta Estilo Notion */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold text-slate-600 uppercase tracking-widest mr-2">Filtrar:</span>
                {carpetas.map(c => (
                  <button
                    key={c} onClick={() => setCarpetaActiva(c)}
                    className={`px-4 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                      carpetaActiva === c 
                      ? 'bg-cyan-500/10 border-cyan-500 text-cyan-400' 
                      : 'bg-transparent border-slate-800 text-slate-500 hover:border-slate-700 hover:text-slate-400'
                    }`}
                  >
                    {c === 'todas' ? 'Todo' : c}
                  </button>
                ))}
              </div>
            </div>

            {/* Grid de Snippets */}
            <div className="space-y-6">
              {snippetsFiltrados.map(snippet => (
                <article
                  key={snippet.id}
                  className={`group bg-[#161b22] rounded-2xl border transition-all duration-300 hover:shadow-xl hover:shadow-black/20 ${
                    snippet.favorito ? 'border-yellow-500/20 ring-1 ring-yellow-500/10' : 'border-slate-800'
                  }`}
                >
                  <div className="p-6 space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-3">
                          <h3 className="text-lg font-bold text-white tracking-tight">{snippet.nombre}</h3>
                          {esReciente(snippet.ultimoUso) && (
                            <span className="text-[10px] font-black uppercase tracking-tighter bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/20">
                              REC
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] font-mono text-slate-500 block">
                          📂 {snippet.carpeta || 'General'}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => toggleFavorito(snippet.id)}
                          className={`p-2 rounded-lg border transition-all ${
                            snippet.favorito ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' : 'bg-slate-900 border-slate-800 text-slate-600 hover:text-yellow-500'
                          }`}
                        >
                          {snippet.favorito ? '★' : '☆'}
                        </button>
                        <button
                          onClick={() => eliminarSnippet(snippet.id)}
                          className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-600 hover:text-red-500 transition-all"
                        >
                          ✕
                        </button>
                      </div>
                    </div>

                    {snippet.descripcion && (
                      <p className="text-sm text-slate-400 leading-relaxed">{snippet.descripcion}</p>
                    )}

                    <div className="relative">
                      <pre className="bg-[#0d1117] rounded-xl p-4 font-mono text-sm text-cyan-400 overflow-x-auto border border-slate-800/50">
                        {snippet.codigo}
                      </pre>
                      <button
                        onClick={() => copiarCodigo(snippet.id, snippet.codigo)}
                        className={`absolute right-3 top-3 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-lg ${
                          copiadoId === snippet.id
                            ? 'bg-emerald-600 text-white'
                            : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                        }`}
                      >
                        {copiadoId === snippet.id ? '✓ Copiado' : 'Copiar'}
                      </button>
                    </div>

                    {snippet.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {snippet.tags.map((tag, i) => (
                          <span key={i} className="text-[10px] font-bold text-slate-500 bg-slate-900 px-2 py-1 rounded-md border border-slate-800 uppercase tracking-tighter">
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </article>
              ))}

              {snippetsFiltrados.length === 0 && (
                <div className="text-center py-20 bg-slate-900/20 rounded-3xl border border-dashed border-slate-800">
                  <p className="text-slate-500 italic">No se han encontrado resultados en la búsqueda.</p>
                </div>
              )}
            </div>
          </main>

        </div>
      </div>
    </div>
  )
}

export default App