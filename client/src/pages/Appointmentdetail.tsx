import { useEffect, useState } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

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
  client_id: string
  clients: { full_name: string; id: string }
  client_rates: { label: string; amount_per_hour: number } | null
}

const API = import.meta.env.VITE_API_URL

const STATUS_COLORS: Record<string, string> = {
  scheduled: '#2563eb',
  'in-progress': '#854F0B',
  completed: '#15803d',
  cancelled: '#dc2626'
}

export default function AppointmentDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { signOut } = useAuth()
  const [appointment, setAppointment] = useState<Appointment | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editForm, setEditForm] = useState({
    date: '', end_date: '', start_time: '', end_time: '', notes: ''
  })
  const [editSaving, setEditSaving] = useState(false)
  const [editSuccess, setEditSuccess] = useState('')

  const fetchAppointment = async () => {
    const res = await fetch(`${API}/appointments/${id}`)
    const data = await res.json()
    setAppointment(data)
    setLoading(false)
  }

  useEffect(() => { fetchAppointment() }, [id])

  useEffect(() => {
    if (appointment) {
      setEditForm({
        date: appointment.date || '',
        end_date: appointment.end_date || '',
        start_time: appointment.start_time || '',
        end_time: appointment.end_time || '',
        notes: appointment.notes || ''
      })
    }
  }, [appointment])

  const handleAction = async (action: string) => {
    setActionLoading(true)
    await fetch(`${API}/appointments/${id}/${action}`, { method: 'PATCH' })
    await fetchAppointment()
    setActionLoading(false)
  }

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    setEditSaving(true)
    const res = await fetch(`${API}/appointments/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editForm)
    })
    const data = await res.json()
    if (!data.error) {
      setEditSuccess('Appointment updated successfully')
      setEditing(false)
      fetchAppointment()
    }
    setEditSaving(false)
  }

  const formatTime = (time: string) => time ? time.substring(0, 5) : '—'

  const formatDateTime = (iso: string | null) => {
    if (!iso) return '—'
    return new Date(iso).toLocaleString('en-AU', {
      weekday: 'short', day: '2-digit', month: 'short',
      hour: '2-digit', minute: '2-digit'
    })
  }

  const formatDate = (date: string) =>
    date ? new Date(date + 'T00:00:00').toLocaleDateString('en-AU', {
      weekday: 'long', day: '2-digit', month: 'long', year: 'numeric'
    }) : '—'

  const calcDuration = () => {
    if (!appointment) return '—'
    const start = appointment.actual_start ? new Date(appointment.actual_start) : null
    const end = appointment.actual_end ? new Date(appointment.actual_end) : null
    if (!start || !end) {
      const [sh, sm] = appointment.start_time.split(':').map(Number)
      const [eh, em] = appointment.end_time.split(':').map(Number)
      const mins = (eh * 60 + em) - (sh * 60 + sm)
      if (mins <= 0) return '—'
      const h = Math.floor(mins / 60)
      const m = mins % 60
      return `${h}h${m > 0 ? ` ${m}m` : ''} (scheduled)`
    }
    const mins = Math.round((end.getTime() - start.getTime()) / 60000)
    if (mins <= 0) return '—'
    const h = Math.floor(mins / 60)
    const m = mins % 60
    return `${h}h${m > 0 ? ` ${m}m` : ''} (actual)`
  }

  const calcAmount = () => {
    if (!appointment?.client_rates?.amount_per_hour) return '—'
    let mins = 0
    if (appointment.actual_start && appointment.actual_end) {
      mins = Math.round((new Date(appointment.actual_end).getTime() - new Date(appointment.actual_start).getTime()) / 60000)
    } else {
      const [sh, sm] = appointment.start_time.split(':').map(Number)
      const [eh, em] = appointment.end_time.split(':').map(Number)
      mins = (eh * 60 + em) - (sh * 60 + sm)
    }
    if (mins <= 0) return '—'
    const amount = (mins / 60) * appointment.client_rates.amount_per_hour
    return `$${amount.toFixed(2)}`
  }

  if (loading) return <p style={{ padding: '2rem' }}>Loading...</p>
  if (!appointment) return <p style={{ padding: '2rem' }}>Appointment not found.</p>

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
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
          <button className="secondary" onClick={() => navigate('/appointments')} style={{ padding: '0.25rem 0.75rem' }}>← Back</button>
          <h1 style={{ margin: 0 }}>Appointment</h1>
          <span className={`badge badge-${appointment.status}`} style={{ fontSize: '0.85rem' }}>
            {appointment.status}
          </span>
        </div>

        {editSuccess && <p className="success" style={{ marginBottom: '1rem' }}>{editSuccess}</p>}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>

          {/* Left column */}
          <div>
            {/* Details card */}
            <div className="card" style={{ marginBottom: '1rem' }}>
              <h2 style={{ marginBottom: '1rem' }}>Details</h2>
              <div style={{ display: 'grid', gridTemplateColumns: '130px 1fr', gap: '0.6rem 0', fontSize: '0.9rem' }}>
                <span style={{ color: '#6b7280', fontWeight: 500 }}>Client</span>
                <Link to={`/clients/${appointment.clients?.id}`} style={{ color: '#2563eb', textDecoration: 'none', fontWeight: 500 }}>
                  {appointment.clients?.full_name}
                </Link>

                <span style={{ color: '#6b7280', fontWeight: 500 }}>Date</span>
                <span>
                  {formatDate(appointment.date)}
                  {appointment.end_date && appointment.end_date !== appointment.date
                    ? ` → ${formatDate(appointment.end_date)}` : ''}
                </span>

                <span style={{ color: '#6b7280', fontWeight: 500 }}>Scheduled</span>
                <span>{formatTime(appointment.start_time)} — {formatTime(appointment.end_time)}</span>

                <span style={{ color: '#6b7280', fontWeight: 500 }}>Rate</span>
                <span>{appointment.client_rates
                  ? `${appointment.client_rates.label} — $${appointment.client_rates.amount_per_hour}/hr`
                  : '—'}</span>

                <span style={{ color: '#6b7280', fontWeight: 500 }}>Duration</span>
                <span>{calcDuration()}</span>

                <span style={{ color: '#6b7280', fontWeight: 500 }}>Est. amount</span>
                <span style={{ fontWeight: 600, color: '#15803d' }}>{calcAmount()}</span>

                {appointment.notes && (
                  <>
                    <span style={{ color: '#6b7280', fontWeight: 500 }}>Notes</span>
                    <span>{appointment.notes}</span>
                  </>
                )}
              </div>
            </div>

            {/* Actual times card */}
            {(appointment.actual_start || appointment.actual_end) && (
              <div className="card" style={{ marginBottom: '1rem' }}>
                <h2 style={{ marginBottom: '1rem' }}>Actual times</h2>
                <div style={{ display: 'grid', gridTemplateColumns: '130px 1fr', gap: '0.6rem 0', fontSize: '0.9rem' }}>
                  <span style={{ color: '#6b7280', fontWeight: 500 }}>Clocked in</span>
                  <span>{formatDateTime(appointment.actual_start)}</span>
                  <span style={{ color: '#6b7280', fontWeight: 500 }}>Clocked out</span>
                  <span>{formatDateTime(appointment.actual_end)}</span>
                </div>
              </div>
            )}

            {/* Edit card — only for scheduled appointments */}
            {appointment.status === 'scheduled' && (
              <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: editing ? '1rem' : 0 }}>
                  <h2>Edit appointment</h2>
                  <button
                    className="secondary"
                    onClick={() => { setEditing(!editing); setEditSuccess('') }}
                    style={{ padding: '0.25rem 0.75rem', fontSize: '0.85rem' }}
                  >
                    {editing ? 'Cancel' : 'Edit'}
                  </button>
                </div>

                {editing && (
                  <form onSubmit={handleEdit}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 1rem' }}>
                      <div className="form-group">
                        <label>Start date *</label>
                        <input
                          type="date"
                          value={editForm.date}
                          onChange={e => setEditForm(prev => ({ ...prev, date: e.target.value }))}
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label>End date</label>
                        <input
                          type="date"
                          value={editForm.end_date}
                          min={editForm.date}
                          onChange={e => setEditForm(prev => ({ ...prev, end_date: e.target.value }))}
                        />
                      </div>
                      <div className="form-group">
                        <label>Start time *</label>
                        <input
                          type="time"
                          value={editForm.start_time}
                          onChange={e => setEditForm(prev => ({ ...prev, start_time: e.target.value }))}
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label>End time *</label>
                        <input
                          type="time"
                          value={editForm.end_time}
                          onChange={e => setEditForm(prev => ({ ...prev, end_time: e.target.value }))}
                          required
                        />
                      </div>
                      <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                        <label>Notes</label>
                        <input
                          value={editForm.notes}
                          onChange={e => setEditForm(prev => ({ ...prev, notes: e.target.value }))}
                          placeholder="Optional notes..."
                        />
                      </div>
                    </div>
                    <button type="submit" disabled={editSaving}>
                      {editSaving ? 'Saving...' : 'Save changes'}
                    </button>
                  </form>
                )}
              </div>
            )}
          </div>

          {/* Right column — actions */}
          <div>
            <div className="card" style={{ marginBottom: '1rem' }}>
              <h2 style={{ marginBottom: '1rem' }}>Actions</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {appointment.status === 'scheduled' && (
                  <>
                    <div>
                      <button onClick={() => handleAction('clock-in')} disabled={actionLoading} style={{ width: '100%', background: '#15803d' }}>
                        ⏱ Clock in — start session now
                      </button>
                      <p style={{ fontSize: '0.78rem', color: '#6b7280', marginTop: '0.3rem' }}>
                        Records the current time as the actual session start
                      </p>
                    </div>
                    <div>
                      <button onClick={() => handleAction('cancel')} disabled={actionLoading} className="danger" style={{ width: '100%' }}>
                        Cancel appointment
                      </button>
                      <p style={{ fontSize: '0.78rem', color: '#6b7280', marginTop: '0.3rem' }}>
                        Sets status to cancelled without deleting the record
                      </p>
                    </div>
                  </>
                )}

                {appointment.status === 'in-progress' && (
                  <div>
                    <button onClick={() => handleAction('clock-out')} disabled={actionLoading} style={{ width: '100%', background: '#854F0B' }}>
                      ⏹ Clock out — end session now
                    </button>
                    <p style={{ fontSize: '0.78rem', color: '#6b7280', marginTop: '0.3rem' }}>
                      Records the current time as the actual session end
                    </p>
                  </div>
                )}

                {appointment.status === 'completed' && (
                  <div>
                    <Link
                      to={`/session-notes/${appointment.id}`}
                      style={{ display: 'block', textAlign: 'center', background: '#2563eb', color: 'white', padding: '0.5rem 1.25rem', borderRadius: '6px', textDecoration: 'none', fontWeight: 500 }}
                    >
                      📝 View / write session notes
                    </Link>
                    <p style={{ fontSize: '0.78rem', color: '#6b7280', marginTop: '0.3rem' }}>
                      Document what occurred during this session
                    </p>
                  </div>
                )}

                {appointment.status === 'cancelled' && (
                  <p style={{ color: '#6b7280', fontSize: '0.9rem' }}>This appointment has been cancelled.</p>
                )}
              </div>
            </div>

            {/* Status card */}
            <div className="card" style={{ borderLeft: `4px solid ${STATUS_COLORS[appointment.status] || '#6b7280'}` }}>
              <h2 style={{ marginBottom: '0.5rem', fontSize: '0.9rem', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: STATUS_COLORS[appointment.status] || '#6b7280' }} />
                <span style={{ fontWeight: 600, textTransform: 'capitalize' }}>{appointment.status}</span>
              </div>
              <div style={{ marginTop: '0.75rem', fontSize: '0.8rem', color: '#6b7280' }}>
                {appointment.status === 'scheduled' && 'Waiting to start. Clock in when the session begins.'}
                {appointment.status === 'in-progress' && 'Session is currently active. Clock out when finished.'}
                {appointment.status === 'completed' && 'Session complete. Write session notes and generate an invoice.'}
                {appointment.status === 'cancelled' && 'This appointment was cancelled.'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}