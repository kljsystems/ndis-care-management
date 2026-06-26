import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Nav from '../components/Nav'

interface Client {
  id: string
  full_name: string
}

interface Appointment {
  id: string
  date: string
  start_time: string
  end_time: string
  actual_start: string | null
  actual_end: string | null
  client_id: string
  client_rates: { label: string; amount_per_hour: number } | null
}

interface InvoiceItem {
  id: string
  hours: number
  rate_per_hour: number
  rate_label: string
  amount: number
  appointments: { date: string; start_time: string; end_time: string } | null
}

interface Invoice {
  id: string
  status: string
  total: number
  created_at: string
  paid_at: string | null
  clients: { full_name: string }
  invoice_items?: InvoiceItem[]
}

const API = import.meta.env.VITE_API_URL

export default function Invoices() {

  const navigate = useNavigate()
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [completedAppointments, setCompletedAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [selectedClientId, setSelectedClientId] = useState('')
  const [selectedAppointmentIds, setSelectedAppointmentIds] = useState<string[]>([])
  const [generating, setGenerating] = useState(false)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [filter, setFilter] = useState('all')
  const [expandedInvoice, setExpandedInvoice] = useState<string | null>(null)

  // ── fetch ─────────────────────────────────────────────────────────────────

  const fetchInvoices = async () => {
    const res = await fetch(`${API}/invoices`)
    const data = await res.json()
    setInvoices(Array.isArray(data) ? data : [])
    setLoading(false)
  }

  const fetchClients = async () => {
    const res = await fetch(`${API}/clients`)
    const data = await res.json()
    setClients(Array.isArray(data) ? data : [])
  }

  const fetchCompletedAppointments = async (clientId: string) => {
    const res = await fetch(`${API}/appointments`)
    const data = await res.json()
    const eligible = Array.isArray(data)
      ? data.filter((a: any) => a.client_id === clientId && a.status === 'completed')
      : []
    setCompletedAppointments(eligible)
    setSelectedAppointmentIds([])
  }

  useEffect(() => { fetchInvoices(); fetchClients() }, [])

  // ── generate form ─────────────────────────────────────────────────────────

  const handleClientChange = (clientId: string) => {
    setSelectedClientId(clientId)
    setCompletedAppointments([])
    setSelectedAppointmentIds([])
    if (clientId) fetchCompletedAppointments(clientId)
  }

  const toggleAppointment = (id: string) => {
    setSelectedAppointmentIds(prev =>
      prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]
    )
  }

  const calcHours = (appt: Appointment) => {
    if (appt.actual_start && appt.actual_end) {
      return Math.round(((new Date(appt.actual_end).getTime() - new Date(appt.actual_start).getTime()) / 3600000) * 100) / 100
    }
    const [sh, sm] = appt.start_time.split(':').map(Number)
    const [eh, em] = appt.end_time.split(':').map(Number)
    const mins = (eh * 60 + em) - (sh * 60 + sm)
    return Math.round((mins / 60) * 100) / 100
  }

  const previewItems = completedAppointments
    .filter(a => selectedAppointmentIds.includes(a.id))
    .map(a => {
      const hours = calcHours(a)
      const rate = a.client_rates?.amount_per_hour || 0
      return { appt: a, hours, rate, amount: Math.round(hours * rate * 100) / 100 }
    })

  const previewTotal = previewItems.reduce((sum, i) => sum + i.amount, 0)

  const handleGenerate = async () => {
    if (!selectedClientId || selectedAppointmentIds.length === 0) {
      setError('Please select a client and at least one appointment')
      return
    }
    setGenerating(true)
    setError('')
    const res = await fetch(`${API}/invoices`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: selectedClientId, appointment_ids: selectedAppointmentIds })
    })
    const data = await res.json()
    if (data.error) { setError(data.error); setGenerating(false); return }
    setSuccess('Invoice generated successfully')
    setShowForm(false)
    setSelectedClientId('')
    setSelectedAppointmentIds([])
    setCompletedAppointments([])
    fetchInvoices()
    setGenerating(false)
  }

  // ── actions ───────────────────────────────────────────────────────────────

  const handleMarkPaid = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    await fetch(`${API}/invoices/${id}/paid`, { method: 'PATCH' })
    fetchInvoices()
  }

  const handleDownloadPDF = async (e: React.MouseEvent, inv: Invoice) => {
    e.stopPropagation()
    setDownloadingId(inv.id)
    try {
      const res = await fetch(`${API}/invoices/${inv.id}/pdf`)
      if (!res.ok) throw new Error()
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `invoice-${inv.id.slice(0, 8).toUpperCase()}.pdf`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch {
      alert('PDF download failed. Make sure pdfkit is installed on the server.')
    } finally {
      setDownloadingId(null)
    }
  }

  const handleExpandInvoice = async (id: string) => {
    if (expandedInvoice === id) { setExpandedInvoice(null); return }
    setExpandedInvoice(id)
    const existing = invoices.find(i => i.id === id)
    if (!existing?.invoice_items) {
      const res = await fetch(`${API}/invoices/${id}`)
      const data = await res.json()
      setInvoices(prev => prev.map(i => i.id === id ? { ...i, invoice_items: data.invoice_items } : i))
    }
  }

  // ── helpers ───────────────────────────────────────────────────────────────

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric' })

  const formatTime = (t?: string | null) => t ? t.substring(0, 5) : '—'

  const filteredInvoices = invoices.filter(i => filter === 'all' ? true : i.status === filter)

  const counts: Record<string, number> = {
    all:   invoices.length,
    draft: invoices.filter(i => i.status === 'draft').length,
    sent:  invoices.filter(i => i.status === 'sent').length,
    paid:  invoices.filter(i => i.status === 'paid').length,
  }

  // ── render ────────────────────────────────────────────────────────────────

  return (
    <>
      <Nav />

      <div className="container">

        {/* Page header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h1>Invoices</h1>
          <button onClick={() => { setShowForm(true); setSuccess(''); setError('') }}>
            + Generate invoice
          </button>
        </div>

        {success && !showForm && <p className="success" style={{ marginBottom: '1rem' }}>{success}</p>}

        {/* Generate invoice form */}
        {showForm && (
          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <h2 style={{ marginBottom: '1.5rem' }}>Generate invoice</h2>
            {error && <p className="error">{error}</p>}

            <div className="form-group">
              <label>Step 1 — Select client *</label>
              <select value={selectedClientId} onChange={e => handleClientChange(e.target.value)}>
                <option value="">Select a client...</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.full_name}</option>)}
              </select>
            </div>

            {selectedClientId && (
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.9rem' }}>
                  Step 2 — Select completed appointments to invoice
                </label>
                {completedAppointments.length === 0 ? (
                  <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '6px', padding: '1rem', color: '#6b7280', fontSize: '0.9rem' }}>
                    No completed uninvoiced appointments found for this client.
                  </div>
                ) : (
                  <div style={{ border: '1px solid #e5e7eb', borderRadius: '6px', overflow: 'hidden' }}>
                    {completedAppointments.map((appt, i) => {
                      const hours = calcHours(appt)
                      const rate = appt.client_rates?.amount_per_hour || 0
                      const amount = Math.round(hours * rate * 100) / 100
                      const isSelected = selectedAppointmentIds.includes(appt.id)
                      return (
                        <div
                          key={appt.id}
                          onClick={() => toggleAppointment(appt.id)}
                          style={{
                            display: 'flex', alignItems: 'center', gap: '0.75rem',
                            padding: '0.75rem 1rem', cursor: 'pointer',
                            background: isSelected ? '#EEF2FF' : 'white',
                            borderTop: i > 0 ? '1px solid #e5e7eb' : 'none'
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleAppointment(appt.id)}
                            onClick={e => e.stopPropagation()}
                            style={{ width: 'auto', marginBottom: 0 }}
                          />
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '0.9rem', fontWeight: 500 }}>
                              {formatDate(appt.date)} — {formatTime(appt.start_time)} to {formatTime(appt.end_time)}
                            </div>
                            <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>
                              {appt.client_rates?.label || 'No rate'} · {hours}h · ${rate}/hr
                            </div>
                          </div>
                          <div style={{ fontWeight: 600, color: '#15803d', fontSize: '0.9rem' }}>${amount.toFixed(2)}</div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {previewItems.length > 0 && (
              <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '6px', padding: '0.75rem 1rem', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 500, fontSize: '0.9rem' }}>
                    {previewItems.length} appointment{previewItems.length > 1 ? 's' : ''} selected
                  </span>
                  <span style={{ fontWeight: 700, fontSize: '1.1rem', color: '#15803d' }}>
                    Total: ${previewTotal.toFixed(2)}
                  </span>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button onClick={handleGenerate} disabled={generating || selectedAppointmentIds.length === 0}>
                {generating ? 'Generating...' : 'Generate invoice'}
              </button>
              <button className="secondary" onClick={() => {
                setShowForm(false); setError(''); setSelectedClientId('')
                setSelectedAppointmentIds([]); setCompletedAppointments([])
              }}>
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Filter tabs with counts */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
          {(['all', 'draft', 'sent', 'paid'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={filter === f ? '' : 'secondary'}
              style={{ padding: '0.25rem 0.75rem', fontSize: '0.85rem' }}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}{' '}
              <span style={{
                background: filter === f ? 'rgba(255,255,255,0.25)' : '#e5e7eb',
                color: filter === f ? 'white' : '#6b7280',
                borderRadius: '10px', padding: '0 0.4rem', fontSize: '0.75rem', fontWeight: 600
              }}>
                {counts[f]}
              </span>
            </button>
          ))}
        </div>

        {/* Invoice list */}
        {loading ? <p>Loading...</p> : filteredInvoices.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', color: '#6b7280' }}>
            <p>No invoices found.</p>
          </div>
        ) : (
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <table>
              <thead>
                <tr>
                  <th>Client</th>
                  <th>Date issued</th>
                  <th>Total</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredInvoices.map(inv => (
                  <>
                    <tr
                      key={inv.id}
                      style={{ cursor: 'pointer' }}
                      onClick={() => handleExpandInvoice(inv.id)}
                    >
                      {/* Client name links to detail page */}
                      <td>
                        <Link
                          to={`/invoices/${inv.id}`}
                          onClick={e => e.stopPropagation()}
                          style={{ color: '#2563eb', textDecoration: 'none', fontWeight: 500 }}
                        >
                          {inv.clients?.full_name}
                        </Link>
                      </td>
                      <td>{formatDate(inv.created_at)}</td>
                      <td style={{ fontWeight: 600 }}>${inv.total?.toFixed(2)}</td>
                      <td><span className={`badge badge-${inv.status}`}>{inv.status}</span></td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                          {/* PDF download */}
                          <button
                            onClick={e => handleDownloadPDF(e, inv)}
                            disabled={downloadingId === inv.id}
                            style={{ padding: '0.2rem 0.6rem', fontSize: '0.75rem', background: '#2563eb' }}
                          >
                            {downloadingId === inv.id ? '...' : '⬇ PDF'}
                          </button>
                          {/* Mark paid */}
                          {inv.status !== 'paid' && (
                            <button
                              onClick={e => handleMarkPaid(e, inv.id)}
                              style={{ padding: '0.2rem 0.6rem', fontSize: '0.75rem', background: '#15803d' }}
                            >
                              Mark paid
                            </button>
                          )}
                          {/* Expand toggle */}
                          <span style={{ fontSize: '0.75rem', color: '#6b7280', padding: '0.2rem 0.4rem' }}>
                            {expandedInvoice === inv.id ? '▲ hide' : '▼ details'}
                          </span>
                        </div>
                      </td>
                    </tr>

                    {/* Expanded line items */}
                    {expandedInvoice === inv.id && (
                      <tr key={`${inv.id}-exp`}>
                        <td colSpan={5} style={{ background: '#f9fafb', padding: '0.75rem 1rem' }}>
                          {!inv.invoice_items ? (
                            <p style={{ color: '#6b7280', fontSize: '0.85rem' }}>Loading...</p>
                          ) : (
                            <table style={{ width: '100%' }}>
                              <thead>
                                <tr>
                                  <th style={{ background: 'none', fontSize: '0.8rem' }}>Date</th>
                                  <th style={{ background: 'none', fontSize: '0.8rem' }}>Rate</th>
                                  <th style={{ background: 'none', fontSize: '0.8rem' }}>Time</th>
                                  <th style={{ background: 'none', fontSize: '0.8rem' }}>Hours</th>
                                  <th style={{ background: 'none', fontSize: '0.8rem' }}>Rate/hr</th>
                                  <th style={{ background: 'none', fontSize: '0.8rem' }}>Amount</th>
                                </tr>
                              </thead>
                              <tbody>
                                {(inv.invoice_items || []).map(item => (
                                  <tr key={item.id}>
                                    <td style={{ fontSize: '0.85rem' }}>{item.appointments ? formatDate(item.appointments.date) : '—'}</td>
                                    <td style={{ fontSize: '0.85rem' }}>{item.rate_label}</td>
                                    <td style={{ fontSize: '0.85rem', color: '#6b7280' }}>
                                      {item.appointments
                                        ? `${formatTime(item.appointments.start_time)} – ${formatTime(item.appointments.end_time)}`
                                        : '—'}
                                    </td>
                                    <td style={{ fontSize: '0.85rem' }}>{item.hours}h</td>
                                    <td style={{ fontSize: '0.85rem' }}>${item.rate_per_hour}/hr</td>
                                    <td style={{ fontSize: '0.85rem', fontWeight: 600 }}>${item.amount?.toFixed(2)}</td>
                                  </tr>
                                ))}
                              </tbody>
                              <tfoot>
                                <tr>
                                  <td colSpan={5} style={{ textAlign: 'right', fontWeight: 700, fontSize: '0.85rem', borderBottom: 'none', background: 'none' }}>Total</td>
                                  <td style={{ fontWeight: 700, color: '#2563eb', borderBottom: 'none', background: 'none' }}>${inv.total?.toFixed(2)}</td>
                                </tr>
                              </tfoot>
                            </table>
                          )}
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  )
}