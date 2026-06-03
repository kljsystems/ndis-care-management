import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

interface ClientRate {
  id: string
  label: string
  amount_per_hour: number
}

interface Client {
  id: string
  full_name: string
  client_rates?: ClientRate[]
}

interface Appointment {
  id: string
  date: string
  end_date: string | null
  start_time: string
  end_time: string
  status: string
  notes: string
  actual_start: string | null
  actual_end: string | null
  clients: { full_name: string }
  client_rates: { label: string } | null
}

const API = import.meta.env.VITE_API_URL

const emptyForm = {
  client_id: '', rate_id: '', date: '', end_date: '',
  start_time: '', end_time: '', notes: ''
}

export default function Appointments() {
  const { signOut } = useAuth()
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [filter, setFilter] = useState('all')
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [isMultiDay, setIsMultiDay] = useState(false)

  const fetchAppointments = async () => {
    const res = await fetch(`${API}/appointments`)
    const data = await res.json()
    setAppointments(Array.isArray(data) ? data : [])
    setLoading(false)
  }

  const fetchClients = async () => {
    const res = await fetch(`${API}/clients`)
    const data = await res.json()
    setClients(Array.isArray(data) ? data : [])
  }

  useEffect(() => { fetchAppointments(); fetchClients() }, [])

  const autoSelectRate = (date: string, startTime: string, endDate: string, clientRates?: ClientRate[]) => {
    if (!date || !startTime || !clientRates || clientRates.length === 0) return
    const day = new Date(date + 'T00:00:00').getDay()
    const hour = parseInt(startTime.split(':')[0])
    const isOvernight = endDate && endDate !== date
    let preferredType = ''
    if (isOvernight) preferredType = 'Overnight'
    else if (day === 0) preferredType = 'Sunday'
    else if (day === 6) preferredType = 'Saturday'
    else if (hour >= 20) preferredType = 'Weekday Evening'
    else preferredType = 'Weekday Daytime'
    const match = clientRates.find(r => r.label.toLowerCase().includes(preferredType.toLowerCase()))
    if (match) setForm(prev => ({ ...prev, rate_id: match.id }))
  }

  const handleClientChange = async (clientId: string) => {
    setForm(prev => ({ ...prev, client_id: clientId, rate_id: '' }))
    if (clientId) {
      const res = await fetch(`${API}/clients/${clientId}`)
      const data = await res.json()
      setSelectedClient(data)
      autoSelectRate(form.date, form.start_time, form.end_date, data.client_rates)
    } else {
      setSelectedClient(null)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    const effectiveEndDate = form.end_date || form.date
    if (effectiveEndDate === form.date && form.end_time <= form.start_time) {
      setError('End time must be after start time for same-day appointments')
      return
    }
    setSaving(true)
    const res = await fetch(`${API}/appointments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, end_date: form.end_date || null })
    })
    const data = await res.json()
    if (data.error) { setError(data.error); setSaving(false); return }
    setSuccess('Appointment created successfully')
    setShowForm(false)
    setForm(emptyForm)
    setSelectedClient(null)
    setIsMultiDay(false)
    fetchAppointments()
    setSaving(false)
  }

  const handleAction = async (id: string, action: string) => {
    await fetch(`${API}/appointments/${id}/${action}`, { method: 'PATCH' })
    fetchAppointments()
  }

  const filteredAppointments = appointments.filter(a => filter === 'all' ? true : a.status === filter)
  const formatTime = (time: string) => time ? time.substring(0, 5) : '—'
  const formatDate = (date: string) => date ? new Date(date + 'T00:00:00').toLocaleDateString('en-AU', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' }) : '—'
  const formatDateRange = (date: string, endDate: string | null) => !endDate || endDate === date ? formatDate(date) : `${formatDate(date)} → ${formatDate(endDate)}`
  const getSuggestedLabel = (date: string, startTime: string, endDate: string) => {
    if (!date || !startTime) return ''
    const day = new Date(date + 'T00:00:00').getDay()
    const hour = parseInt(startTime.split(':')[0])
    if (endDate && endDate !== date) return 'Overnight Sleepover'
    if (day === 0) return 'Sunday'
    if (day === 6) return 'Saturday'
    if (hour >= 20) return 'Weekday Evening'
    return 'Weekday Daytime'
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h1>Appointments</h1>
          <button onClick={() => { setShowForm(true); setForm(emptyForm); setSuccess(''); setError(''); setSelectedClient(null); setIsMultiDay(false) }}>
            + New appointment
          </button>
        </div>

        {success && !showForm && <p className="success" style={{ marginBottom: '1rem' }}>{success}</p>}

        {showForm && (
          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <h2 style={{ marginBottom: '1.5rem' }}>New appointment</h2>
            {error && <p className="error">{error}</p>}
            <form onSubmit={handleSubmit}>

              {/* Client — full width */}
              <div className="form-group">
                <label>Client *</label>
                <select value={form.client_id} onChange={e => handleClientChange(e.target.value)} required>
                  <option value="">Select a client...</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.full_name}</option>)}
                </select>
              </div>

              {/* Date section */}
              <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '1rem', marginBottom: '1rem' }}>
                <p style={{ fontSize: '0.8rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>Date &amp; Time</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 1rem' }}>
                  <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                    <label>Start date *</label>
                    <input
                      type="date"
                      value={form.date}
                      onChange={e => {
                        setForm(prev => ({ ...prev, date: e.target.value }))
                        autoSelectRate(e.target.value, form.start_time, form.end_date, selectedClient?.client_rates)
                      }}
                      required
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                    <label>End date {isMultiDay ? '*' : '(if multi-day)'}</label>
                    <input
                      type="date"
                      value={form.end_date}
                      min={form.date}
                      disabled={!isMultiDay}
                      onChange={e => {
                        setForm(prev => ({ ...prev, end_date: e.target.value }))
                        autoSelectRate(form.date, form.start_time, e.target.value, selectedClient?.client_rates)
                      }}
                      required={isMultiDay}
                      style={{ opacity: isMultiDay ? 1 : 0.4 }}
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                    <label>Start time *</label>
                    <input
                      type="time"
                      value={form.start_time}
                      onChange={e => {
                        setForm(prev => ({ ...prev, start_time: e.target.value }))
                        autoSelectRate(form.date, e.target.value, form.end_date, selectedClient?.client_rates)
                      }}
                      required
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                    <label>End time *</label>
                    <input
                      type="time"
                      value={form.end_time}
                      onChange={e => setForm(prev => ({ ...prev, end_time: e.target.value }))}
                      required
                    />
                  </div>
                </div>

                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={isMultiDay}
                    onChange={e => {
                      setIsMultiDay(e.target.checked)
                      if (!e.target.checked) {
                        setForm(prev => ({ ...prev, end_date: '' }))
                        autoSelectRate(form.date, form.start_time, '', selectedClient?.client_rates)
                      }
                    }}
                    style={{ width: 'auto', marginBottom: 0 }}
                  />
                  This is a multi-day or overnight shift
                </label>
              </div>

              {/* Rate and notes */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 1rem' }}>
                <div className="form-group">
                  <label>
                    Rate type *
                    {form.date && form.start_time && (
                      <span style={{ color: '#2563eb', fontSize: '0.78rem', marginLeft: '0.5rem', fontWeight: 400 }}>
                        ✦ suggested: {getSuggestedLabel(form.date, form.start_time, form.end_date)}
                      </span>
                    )}
                  </label>
                  <select value={form.rate_id} onChange={e => setForm(prev => ({ ...prev, rate_id: e.target.value }))} required disabled={!selectedClient}>
                    <option value="">{selectedClient ? selectedClient.client_rates?.length === 0 ? 'No rates set for this client' : 'Select a rate...' : 'Select a client first'}</option>
                    {selectedClient?.client_rates?.map(r => (
                      <option key={r.id} value={r.id}>{r.label} — ${r.amount_per_hour}/hr</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Notes</label>
                  <input value={form.notes} onChange={e => setForm(prev => ({ ...prev, notes: e.target.value }))} placeholder="Optional notes..." />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Create appointment'}</button>
                <button type="button" className="secondary" onClick={() => { setShowForm(false); setError(''); setIsMultiDay(false) }}>Cancel</button>
              </div>
            </form>
          </div>
        )}

        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
          {['all', 'scheduled', 'in-progress', 'completed', 'cancelled'].map(f => (
            <button key={f} onClick={() => setFilter(f)} className={filter === f ? '' : 'secondary'} style={{ padding: '0.25rem 0.75rem', fontSize: '0.85rem' }}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        {loading ? <p>Loading...</p> : filteredAppointments.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', color: '#6b7280' }}><p>No appointments found.</p></div>
        ) : (
          <div className="card">
            <table>
              <thead>
                <tr>
                  <th>Client</th><th>Date</th><th>Time</th><th>Rate</th><th>Status</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredAppointments.map(appt => (
                  <tr key={appt.id}>
                    <td>{appt.clients?.full_name}</td>
                    <td>{formatDateRange(appt.date, appt.end_date)}</td>
                    <td>{formatTime(appt.start_time)} — {formatTime(appt.end_time)}</td>
                    <td>{appt.client_rates?.label || '—'}</td>
                    <td><span className={`badge badge-${appt.status}`}>{appt.status}</span></td>
                    <td style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                      {appt.status === 'scheduled' && (
                        <>
                          <button onClick={() => handleAction(appt.id, 'clock-in')} style={{ padding: '0.2rem 0.6rem', fontSize: '0.75rem', background: '#15803d' }}>Clock in</button>
                          <button onClick={() => handleAction(appt.id, 'cancel')} className="danger" style={{ padding: '0.2rem 0.6rem', fontSize: '0.75rem' }}>Cancel</button>
                        </>
                      )}
                      {appt.status === 'in-progress' && (
                        <button onClick={() => handleAction(appt.id, 'clock-out')} style={{ padding: '0.2rem 0.6rem', fontSize: '0.75rem', background: '#854F0B' }}>Clock out</button>
                      )}
                      {appt.status === 'completed' && (
                        <Link to={`/session-notes/${appt.id}`} style={{ fontSize: '0.75rem', color: '#2563eb' }}>Session notes</Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  )
}