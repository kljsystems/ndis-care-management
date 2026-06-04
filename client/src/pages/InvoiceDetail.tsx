// client/src/pages/InvoiceDetail.tsx
// Invoice detail page with Download PDF button  (ITP126ON4-90)
// ─────────────────────────────────────────────────────────────
// Add to App.tsx inside <Routes>:
//   import InvoiceDetail from './pages/InvoiceDetail'
//   <Route path="/invoices/:id" element={<ProtectedRoute><InvoiceDetail /></ProtectedRoute>} />
//
// In Invoices.tsx, wrap each table row with:
//   <tr onClick={() => navigate(`/invoices/${inv.id}`)} style={{ cursor: 'pointer' }}>
// and add:  import { useNavigate } from 'react-router-dom'
//           const navigate = useNavigate()
// ─────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const API = import.meta.env.VITE_API_URL

interface Appointment {
  date: string
  start_time: string
  end_time: string
  actual_start: string | null
  actual_end: string | null
}

interface InvoiceItem {
  id: string
  hours: number
  rate_per_hour: number
  rate_label: string
  amount: number
  appointments: Appointment | null
}

interface Invoice {
  id: string
  status: 'draft' | 'sent' | 'paid'
  total: number
  created_at: string
  paid_at: string | null
  notes?: string
  clients: { full_name: string; ndis_number?: string }
  invoice_items: InvoiceItem[]
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric' })
}

function fmtTime(t?: string | null) {
  if (!t) return ''
  const [h, m] = t.split(':')
  const hour = parseInt(h, 10)
  return `${hour % 12 || 12}:${m} ${hour >= 12 ? 'PM' : 'AM'}`
}

const STATUS_STYLE: Record<string, string> = {
  draft: 'badge badge-draft',
  sent:  'badge badge-scheduled',
  paid:  'badge badge-paid',
}

export default function InvoiceDetail() {
  const { id } = useParams<{ id: string }>()
  const { signOut } = useAuth()
  const navigate = useNavigate()
  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState(false)
  const [markingPaid, setMarkingPaid] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    fetch(`${API}/invoices/${id}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) setError(data.error)
        else setInvoice(data)
      })
      .catch(() => setError('Could not load invoice'))
      .finally(() => setLoading(false))
  }, [id])

  const downloadPDF = async () => {
    if (!id) return
    setDownloading(true)
    try {
      const res = await fetch(`${API}/invoices/${id}/pdf`)
      if (!res.ok) throw new Error()
      const blob = await res.blob()
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      a.download = `invoice-${id.slice(0, 8).toUpperCase()}.pdf`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch {
      alert('PDF download failed. Please try again.')
    } finally {
      setDownloading(false)
    }
  }

  const handleMarkPaid = async () => {
    if (!id || !invoice) return
    setMarkingPaid(true)
    await fetch(`${API}/invoices/${id}/paid`, { method: 'PATCH' })
    const res = await fetch(`${API}/invoices/${id}`)
    setInvoice(await res.json())
    setMarkingPaid(false)
  }

  if (loading) {
    return (
      <>
        <nav>
          <span style={{ fontWeight: 700, fontSize: '1.1rem', marginRight: 'auto' }}>NDIS Care Manager</span>
          <Link to="/">Dashboard</Link>
          <Link to="/clients">Clients</Link>
          <Link to="/appointments">Appointments</Link>
          <Link to="/invoices">Invoices</Link>
          <Link to="/session-notes">Session Notes</Link>
          <button onClick={signOut} style={{ background: 'rgba(255,255,255,0.2)', marginLeft: '1rem' }}>Log out</button>
        </nav>
        <div className="container"><p>Loading...</p></div>
      </>
    )
  }

  if (error || !invoice) {
    return (
      <>
        <nav>
          <span style={{ fontWeight: 700, fontSize: '1.1rem', marginRight: 'auto' }}>NDIS Care Manager</span>
          <Link to="/invoices">← Back to invoices</Link>
        </nav>
        <div className="container">
          <p className="error">{error ?? 'Invoice not found.'}</p>
        </div>
      </>
    )
  }

  return (
    <>
      <nav>
        <span style={{ fontWeight: 700, fontSize: '1.1rem', marginRight: 'auto' }}>NDIS Care Manager</span>
        <Link to="/">Dashboard</Link>
        <Link to="/clients">Clients</Link>
        <Link to="/appointments">Appointments</Link>
        <Link to="/invoices">Invoices</Link>
        <Link to="/session-notes">Session Notes</Link>
        <button onClick={signOut} style={{ background: 'rgba(255,255,255,0.2)', marginLeft: '1rem' }}>Log out</button>
      </nav>

      <div className="container">
        {/* Back link */}
        <Link to="/invoices" style={{ color: '#6b7280', fontSize: '0.9rem', textDecoration: 'none', display: 'inline-block', marginBottom: '1rem' }}>
          ← Back to invoices
        </Link>

        {/* Header card */}
        <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: '1.5rem' }}>
          {/* Blue top bar */}
          <div style={{ background: '#2563eb', padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <p style={{ color: '#bfdbfe', fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
                Invoice
              </p>
              <p style={{ color: 'white', fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.25rem' }}>
                #{invoice.id.slice(0, 8).toUpperCase()}
              </p>
              <p style={{ color: '#bfdbfe', fontSize: '0.85rem' }}>{fmtDate(invoice.created_at)}</p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.75rem' }}>
              <span className={STATUS_STYLE[invoice.status] || 'badge'}>{invoice.status.toUpperCase()}</span>

              {/* ── DOWNLOAD PDF BUTTON (ITP126ON4-90) ── */}
              <button
                onClick={downloadPDF}
                disabled={downloading}
                style={{ background: 'white', color: '#2563eb', fontWeight: 600, fontSize: '0.85rem', padding: '0.4rem 1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
              >
                {downloading ? '⏳ Generating…' : '⬇ Download PDF'}
              </button>
            </div>
          </div>

          {/* Client / total summary */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', padding: '1.25rem 1.5rem', borderBottom: '1px solid #e5e7eb' }}>
            <div>
              <p style={{ fontSize: '0.75rem', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.35rem' }}>Billed to</p>
              <p style={{ fontWeight: 600, fontSize: '1rem' }}>{invoice.clients?.full_name}</p>
              {invoice.clients?.ndis_number && (
                <p style={{ fontSize: '0.8rem', color: '#6b7280' }}>NDIS # {invoice.clients.ndis_number}</p>
              )}
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: '0.75rem', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.35rem' }}>Total due</p>
              <p style={{ fontWeight: 700, fontSize: '1.75rem', color: '#111827' }}>${invoice.total?.toFixed(2)}</p>
            </div>
          </div>

          {/* Line items */}
          <div style={{ padding: '1.25rem 1.5rem' }}>
            <p style={{ fontSize: '0.75rem', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>Line items</p>
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Rate</th>
                  <th>Session time</th>
                  <th>Hours</th>
                  <th>Rate/hr</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                {invoice.invoice_items.map((item, i) => {
                  const appt    = item.appointments
                  const dateStr = appt?.date ? fmtDate(appt.date) : '—'
                  const start   = fmtTime(appt?.actual_start || appt?.start_time)
                  const end     = fmtTime(appt?.actual_end   || appt?.end_time)
                  return (
                    <tr key={item.id} style={{ background: i % 2 === 1 ? '#f9fafb' : 'white' }}>
                      <td>{dateStr}</td>
                      <td>{item.rate_label || '—'}</td>
                      <td style={{ color: '#6b7280', fontSize: '0.8rem' }}>
                        {start && end ? `${start} – ${end}` : '—'}
                      </td>
                      <td>{Number(item.hours).toFixed(2)}h</td>
                      <td>${Number(item.rate_per_hour).toFixed(2)}</td>
                      <td style={{ fontWeight: 600 }}>${Number(item.amount).toFixed(2)}</td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={5} style={{ textAlign: 'right', fontWeight: 700, fontSize: '0.95rem', borderBottom: 'none' }}>Total</td>
                  <td style={{ fontWeight: 700, color: '#2563eb', fontSize: '1.05rem', borderBottom: 'none' }}>${invoice.total?.toFixed(2)}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Notes */}
          {invoice.notes && (
            <div style={{ padding: '0 1.5rem 1.25rem' }}>
              <p style={{ fontSize: '0.75rem', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.35rem' }}>Notes</p>
              <p style={{ fontSize: '0.9rem', color: '#374151' }}>{invoice.notes}</p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button onClick={downloadPDF} disabled={downloading} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            {downloading ? '⏳ Generating…' : '⬇ Download PDF'}
          </button>
          {invoice.status !== 'paid' && (
            <button
              onClick={handleMarkPaid}
              disabled={markingPaid}
              style={{ background: '#15803d' }}
            >
              {markingPaid ? 'Updating…' : '✓ Mark as paid'}
            </button>
          )}
          <button className="secondary" onClick={() => navigate('/invoices')}>
            ← Back
          </button>
        </div>
      </div>
    </>
  )
}