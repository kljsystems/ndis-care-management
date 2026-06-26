import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const API = import.meta.env.VITE_API_URL

interface SearchResults {
  clients:      { id: string; name: string }[]
  appointments: { id: string; date: string; clientName: string }[]
  invoices:     { id: string; invoiceNumber: string; clientName: string }[]
}

const fmtDate = (d: string) =>
  new Date(d + 'T00:00:00').toLocaleDateString('en-AU', {
    day: '2-digit', month: 'short', year: 'numeric'
  })

export default function Nav() {
  const { signOut } = useAuth()
  const navigate = useNavigate()

  const [query,    setQuery]    = useState('')
  const [results,  setResults]  = useState<SearchResults | null>(null)
  const [open,     setOpen]     = useState(false)
  const [loading,  setLoading]  = useState(false)

  const containerRef = useRef<HTMLDivElement>(null)
  const debounceRef  = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (query.trim().length < 2) {
      setResults(null)
      setOpen(false)
      return
    }
    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        const res  = await fetch(`${API}/search?q=${encodeURIComponent(query.trim())}`)
        const data = await res.json()
        setResults(data)
        setOpen(true)
      } catch {
        setResults({ clients: [], appointments: [], invoices: [] })
        setOpen(true)
      }
      setLoading(false)
    }, 300)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [query])

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleSelect = (path: string) => {
    setQuery('')
    setResults(null)
    setOpen(false)
    navigate(path)
  }

  const total = results
    ? results.clients.length + results.appointments.length + results.invoices.length
    : 0

  return (
    <nav>
      <span style={{ fontWeight: 700, fontSize: '1.1rem', marginRight: 'auto' }}>
        NDIS Care Manager
      </span>

      <Link to="/">Dashboard</Link>
      <Link to="/clients">Clients</Link>
      <Link to="/appointments">Appointments</Link>
      <Link to="/invoices">Invoices</Link>
      <Link to="/reports">Reports</Link>
      <Link to="/session-notes">Session Notes</Link>

      {/* ── Search ── */}
      <div ref={containerRef} style={{ position: 'relative' }}>
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          onFocus={() => results && setOpen(true)}
          onKeyDown={e => { if (e.key === 'Escape') { setOpen(false); setQuery('') } }}
          placeholder={loading ? 'Searching…' : '🔍 Search…'}
          style={{
            width: '160px',
            marginBottom: 0,
            padding: '0.25rem 0.6rem',
            background: 'rgba(255,255,255,0.15)',
            border: '1px solid rgba(255,255,255,0.3)',
            borderRadius: '6px',
            color: 'white',
            fontSize: '0.85rem',
            outline: 'none',
          }}
        />

        {open && results && (
          <div style={{
            position: 'absolute', top: 'calc(100% + 6px)', right: 0,
            width: '320px', zIndex: 1000,
            background: 'white', borderRadius: '8px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
            border: '1px solid #e5e7eb', overflow: 'hidden'
          }}>
            {total === 0 ? (
              <p style={{ padding: '1rem', color: '#6b7280', fontSize: '0.9rem', margin: 0 }}>
                No results for "{query}"
              </p>
            ) : (
              <>
                {results.clients.length > 0 && (
                  <section>
                    <GroupHeader label="Clients" />
                    {results.clients.map(c => (
                      <ResultRow key={c.id} primary={c.name} onClick={() => handleSelect(`/clients/${c.id}`)} />
                    ))}
                  </section>
                )}

                {results.appointments.length > 0 && (
                  <section>
                    <GroupHeader label="Appointments" />
                    {results.appointments.map(a => (
                      <ResultRow
                        key={a.id}
                        primary={fmtDate(a.date)}
                        secondary={a.clientName}
                        onClick={() => handleSelect(`/appointments/${a.id}`)}
                      />
                    ))}
                  </section>
                )}

                {results.invoices.length > 0 && (
                  <section>
                    <GroupHeader label="Invoices" />
                    {results.invoices.map(inv => (
                      <ResultRow
                        key={inv.id}
                        primary={`#${inv.invoiceNumber}`}
                        primaryMono
                        secondary={inv.clientName}
                        onClick={() => handleSelect(`/invoices/${inv.id}`)}
                      />
                    ))}
                  </section>
                )}
              </>
            )}
          </div>
        )}
      </div>

      <button onClick={signOut} style={{ background: 'rgba(255,255,255,0.2)', marginLeft: '0.5rem' }}>
        Log out
      </button>
    </nav>
  )
}

function GroupHeader({ label }: { label: string }) {
  return (
    <p style={{
      padding: '0.4rem 0.75rem', margin: 0,
      fontSize: '0.7rem', fontWeight: 700,
      color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em',
      background: '#f9fafb', borderBottom: '1px solid #e5e7eb'
    }}>
      {label}
    </p>
  )
}

function ResultRow({
  primary, primaryMono = false, secondary, onClick
}: {
  primary: string
  primaryMono?: boolean
  secondary?: string
  onClick: () => void
}) {
  const [hovered, setHovered] = useState(false)
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        padding: '0.55rem 0.75rem', cursor: 'pointer',
        borderBottom: '1px solid #f3f4f6',
        background: hovered ? '#f9fafb' : 'white',
        display: 'flex', alignItems: 'baseline', gap: '0.4rem'
      }}
    >
      <span style={{ fontSize: '0.9rem', color: '#111827', fontWeight: 500, fontFamily: primaryMono ? 'monospace' : 'inherit' }}>
        {primary}
      </span>
      {secondary && (
        <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>— {secondary}</span>
      )}
    </div>
  )
}
