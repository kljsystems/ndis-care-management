// client/src/pages/Appointmentdetail.tsx
// Updated to include incident report form (ITP126ON4-23)

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

interface Incident {
  id: string
  type: string
  description: string
  actions_taken: string
  occurred_at: string
}

const API = import.meta.env.VITE_API_URL

const STATUS_COLORS: Record<string, string> = {
  scheduled: '#2563eb',
  'in-progress': '#854F0B',
  completed: '#15803d',
  cancelled: '#dc2626'
}

const INCIDENT_TYPES = [
  'Fall or injury',
  'Medication error',
  'Behaviour incident',
  'Medical emergency',
  'Property damage',
  'Safeguarding concern',
  'Near miss',
  'Other'
]

export default function AppointmentDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { signOut } = useAuth()

  const [appointment, setAppointment] = useState<Appointment | null>(null)
  const [incidents, setIncidents]     = useState<Incident[]>([])
  const [loading, setLoading]         = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [editing, setEditing]         = useState(false)
  const [editForm, setEditForm]       = useState({ date: '', end_date: '', start_time: '', end_time: '', notes: '' })
  const [editSaving, setEditSaving]   = useState(false)
  const [editSuccess, setEditSuccess] = useState('')

  // incident form state
  const [showIncidentForm, setShowIncidentForm] = useState(false)
  const [incidentForm, setIncidentForm] = useState({ type: 'Fall or injury', description: '', actions_taken: '' })
  const [incidentSaving, setIncidentSaving] = useState(false)
  const [incidentSuccess, setIncidentSuccess] = useState('')
  const [incidentError, setIncidentError] = useState('')

  const fetchAppointment = async () => {
    const res = await fetch(`${API}/appointments/${id}`)
    const data = await res.json()
    setAppointment(data)
    setLoading(false)
  }

  const fetchIncidents = async (clientId: string) => {
    const res = await fetch(`${API}/incidents/client/${clientId}`)
    const data = await res.json()
    // filter to just this appointment's incidents
    if (Array.isArray(data)) {
      setIncidents(data.filter((i: any) => i.appointment_id === id))
    }
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
      fetchIncidents(appointment.client_id)
    }
  }, [appointment?.id])

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

  // ITP126ON4-139: incident report form submit
  const handleIncidentSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!incidentForm.description.trim()) {
      setIncidentError('Please describe what happened.')
      return
    }
    setIncidentSaving(true)
    setIncidentError('')

    const res = await fetch(`${API}/incidents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        appointment_id: id,
        client_id: appointment?.client_id,
        type: incidentForm.type,
        description: incidentForm.description,
        actions_taken: incidentForm.actions_taken
      })
    })
    const data = await res.json()

    if (data.error) {
      setIncidentError(data.error)
    } else {
      setIncidentSuccess('Incident report saved.')
      setIncidentForm({ type: 'Fall or injury', description: '', actions_taken: '' })
      setShowIncidentForm(false)
      if (appointment) fetchIncidents(appointment.client_id)
    }
    setIncidentSaving(false)
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

  const formatShortDate = (iso: string) =>
    new Date(iso).toLocaleString('en-AU', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })

  const calcDuration = () => {
    if (!appointment) return '—'
    const start = appointment.actual_start ? new Date(appointment.actual_start) : null
    const end   = appointment.actual_end   ? new Date(appointment.actual_end)   : null
    if (!start || !end) {
      const [sh, sm] = appointment.start_time.split(':').map(Number)
      const [eh, em] = appointment.end_time.split(':').map(Number)
      const mins = (eh * 60 + em) - (sh * 60 + sm)
      if (mins <= 0) return '—'
      return `${Math.floor(mins/60)}h${mins%60>0?` ${mins%60}m`:''} (scheduled)`
    }
    const mins = Math.round((end.getTime() - start.getTime()) / 60000)
    if (mins <= 0) return '—'
    return `${Math.floor(mins/60)}h${mins%60>0?` ${mins%60}m`:''} (actual)`
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
    return `$${((mins / 60) * appointment.client_rates.amount_per_hour).toFixed(2)}`
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
          <span className={`badge badge-${appointment.status}`}>{appointment.status}</span>
        </div>

        {editSuccess && <p className="success" style={{ marginBottom: '1rem' }}>{editSuccess}</p>}
        {incidentSuccess && <p className="success" style={{ marginBottom: '1rem' }}>{incidentSuccess}</p>}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>

          {/* ── Left column ── */}
          <div>
            {/* Details */}
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

                {appointment.notes && (<>
                  <span style={{ color: '#6b7280', fontWeight: 500 }}>Notes</span>
                  <span>{appointment.notes}</span>
                </>)}
              </div>
            </div>

            {/* Actual times */}
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

            {/* Edit — scheduled only */}
            {appointment.status === 'scheduled' && (
              <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: editing ? '1rem' : 0 }}>
                  <h2>Edit appointment</h2>
                  <button className="secondary" onClick={() => { setEditing(!editing); setEditSuccess('') }} style={{ padding: '0.25rem 0.75rem', fontSize: '0.85rem' }}>
                    {editing ? 'Cancel' : 'Edit'}
                  </button>
                </div>
                {editing && (
                  <form onSubmit={handleEdit}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 1rem' }}>
                      <div className="form-group">
                        <label>Start date *</label>
                        <input type="date" value={editForm.date} onChange={e => setEditForm(p => ({ ...p, date: e.target.value }))} required />
                      </div>
                      <div className="form-group">
                        <label>End date</label>
                        <input type="date" value={editForm.end_date} min={editForm.date} onChange={e => setEditForm(p => ({ ...p, end_date: e.target.value }))} />
                      </div>
                      <div className="form-group">
                        <label>Start time *</label>
                        <input type="time" value={editForm.start_time} onChange={e => setEditForm(p => ({ ...p, start_time: e.target.value }))} required />
                      </div>
                      <div className="form-group">
                        <label>End time *</label>
                        <input type="time" value={editForm.end_time} onChange={e => setEditForm(p => ({ ...p, end_time: e.target.value }))} required />
                      </div>
                      <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                        <label>Notes</label>
                        <input value={editForm.notes} onChange={e => setEditForm(p => ({ ...p, notes: e.target.value }))} placeholder="Optional notes..." />
                      </div>
                    </div>
                    <button type="submit" disabled={editSaving}>{editSaving ? 'Saving...' : 'Save changes'}</button>
                  </form>
                )}
              </div>
            )}

            {/* ITP126ON4-143: Incident flag indicator + list */}
            {incidents.length > 0 && (
              <div className="card" style={{ marginTop: '1rem', borderLeft: '4px solid #dc2626' }}>
                <h2 style={{ marginBottom: '0.75rem', color: '#dc2626' }}>⚠ Incident reports ({incidents.length})</h2>
                {incidents.map((inc, i) => (
                  <div key={inc.id} style={{ borderTop: i > 0 ? '1px solid #e5e7eb' : 'none', paddingTop: i > 0 ? '0.75rem' : 0, marginTop: i > 0 ? '0.75rem' : 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                      <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{inc.type}</span>
                      <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>{formatShortDate(inc.occurred_at)}</span>
                    </div>
                    <p style={{ fontSize: '0.85rem', color: '#374151', marginBottom: '0.25rem' }}>{inc.description}</p>
                    {inc.actions_taken && (
                      <p style={{ fontSize: '0.8rem', color: '#6b7280' }}>Actions taken: {inc.actions_taken}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Right column ── */}
          <div>
            {/* Actions */}
            <div className="card" style={{ marginBottom: '1rem' }}>
              <h2 style={{ marginBottom: '1rem' }}>Actions</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {appointment.status === 'scheduled' && (<>
                  <div>
                    <button onClick={() => handleAction('clock-in')} disabled={actionLoading} style={{ width: '100%', background: '#15803d' }}>
                      ⏱ Clock in — start session now
                    </button>
                    <p style={{ fontSize: '0.78rem', color: '#6b7280', marginTop: '0.3rem' }}>Records the current time as the actual session start</p>
                  </div>
                  <div>
                    <button onClick={() => handleAction('cancel')} disabled={actionLoading} className="danger" style={{ width: '100%' }}>
                      Cancel appointment
                    </button>
                    <p style={{ fontSize: '0.78rem', color: '#6b7280', marginTop: '0.3rem' }}>Sets status to cancelled without deleting the record</p>
                  </div>
                </>)}

                {appointment.status === 'in-progress' && (
                  <div>
                    <button onClick={() => handleAction('clock-out')} disabled={actionLoading} style={{ width: '100%', background: '#854F0B' }}>
                      ⏹ Clock out — end session now
                    </button>
                    <p style={{ fontSize: '0.78rem', color: '#6b7280', marginTop: '0.3rem' }}>Records the current time as the actual session end</p>
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
                    <p style={{ fontSize: '0.78rem', color: '#6b7280', marginTop: '0.3rem' }}>Document what occurred during this session</p>
                  </div>
                )}

                {appointment.status === 'cancelled' && (
                  <p style={{ color: '#6b7280', fontSize: '0.9rem' }}>This appointment has been cancelled.</p>
                )}
              </div>
            </div>

            {/* Status card */}
            <div className="card" style={{ marginBottom: '1rem', borderLeft: `4px solid ${STATUS_COLORS[appointment.status] || '#6b7280'}` }}>
              <h2 style={{ marginBottom: '0.5rem', fontSize: '0.9rem', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: STATUS_COLORS[appointment.status] || '#6b7280' }} />
                <span style={{ fontWeight: 600, textTransform: 'capitalize' }}>{appointment.status}</span>
              </div>
              <div style={{ marginTop: '0.75rem', fontSize: '0.8rem', color: '#6b7280' }}>
                {appointment.status === 'scheduled'   && 'Waiting to start. Clock in when the session begins.'}
                {appointment.status === 'in-progress' && 'Session is currently active. Clock out when finished.'}
                {appointment.status === 'completed'   && 'Session complete. Write session notes and generate an invoice.'}
                {appointment.status === 'cancelled'   && 'This appointment was cancelled.'}
              </div>
            </div>

            {/* ITP126ON4-139: Incident report form */}
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: showIncidentForm ? '1rem' : 0 }}>
                <div>
                  <h2 style={{ margin: 0 }}>⚠ Report an incident</h2>
                  {!showIncidentForm && <p style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: '0.25rem' }}>Flag and document any incident during this session</p>}
                </div>
                <button
                  className={showIncidentForm ? 'secondary' : 'danger'}
                  onClick={() => { setShowIncidentForm(!showIncidentForm); setIncidentError('') }}
                  style={{ padding: '0.25rem 0.75rem', fontSize: '0.85rem' }}
                >
                  {showIncidentForm ? 'Cancel' : '+ Report'}
                </button>
              </div>

              {showIncidentForm && (
                <form onSubmit={handleIncidentSubmit}>
                  {incidentError && <p className="error" style={{ marginBottom: '0.75rem' }}>{incidentError}</p>}

                  <div className="form-group">
                    <label>Incident type *</label>
                    <select value={incidentForm.type} onChange={e => setIncidentForm(p => ({ ...p, type: e.target.value }))}>
                      {INCIDENT_TYPES.map(t => <option key={t}>{t}</option>)}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Description *</label>
                    <textarea
                      value={incidentForm.description}
                      onChange={e => setIncidentForm(p => ({ ...p, description: e.target.value }))}
                      placeholder="Describe what happened, when, and who was involved..."
                      rows={4}
                      required
                      style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.9rem', resize: 'vertical', fontFamily: 'inherit' }}
                    />
                  </div>

                  <div className="form-group">
                    <label>Actions taken</label>
                    <textarea
                      value={incidentForm.actions_taken}
                      onChange={e => setIncidentForm(p => ({ ...p, actions_taken: e.target.value }))}
                      placeholder="What steps were taken in response to the incident..."
                      rows={3}
                      style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.9rem', resize: 'vertical', fontFamily: 'inherit' }}
                    />
                  </div>

                  <button type="submit" className="danger" disabled={incidentSaving} style={{ width: '100%' }}>
                    {incidentSaving ? 'Saving...' : '⚠ Submit incident report'}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}