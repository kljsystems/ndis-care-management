import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Nav from '../components/Nav'

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

const STATUS_COLORS: Record<string, string> = {
  scheduled: '#2563eb',
  'in-progress': '#854F0B',
  completed: '#15803d',
  cancelled: '#dc2626'
}

export default function Appointments() {

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
  const [view, setView] = useState<'list' | 'calendar'>('list')
  const [calMonth, setCalMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

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

  // Calendar helpers
  const getAppointmentsForDate = (dateStr: string) =>
    appointments.filter(a => a.date === dateStr || (a.end_date && a.date <= dateStr && a.end_date >= dateStr))

  const buildCalendarDays = () => {
    const year = calMonth.getFullYear()
    const month = calMonth.getMonth()
    const firstDay = new Date(year, month, 1).getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const days: (number | null)[] = []
    for (let i = 0; i < firstDay; i++) days.push(null)
    for (let i = 1; i <= daysInMonth; i++) days.push(i)
    return days
  }

  const toDateStr = (day: number) => {
    const y = calMonth.getFullYear()
    const m = String(calMonth.getMonth() + 1).padStart(2, '0')
    const d = String(day).padStart(2, '0')
    return `${y}-${m}-${d}`
  }

  const todayStr = new Date().toISOString().split('T')[0]
  const selectedDateAppts = selectedDate ? getAppointmentsForDate(selectedDate) : []

  return (
    <>
      <Nav />

      <div className="container">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h1>Appointments</h1>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <div style={{ display: 'flex', border: '1px solid #d1d5db', borderRadius: '6px', overflow: 'hidden' }}>
              <button onClick={() => setView('list')} style={{ borderRadius: 0, background: view === 'list' ? '#2563eb' : 'white', color: view === 'list' ? 'white' : '#374151', padding: '0.4rem 0.9rem', fontSize: '0.85rem' }}>List</button>
              <button onClick={() => setView('calendar')} style={{ borderRadius: 0, background: view === 'calendar' ? '#2563eb' : 'white', color: view === 'calendar' ? 'white' : '#374151', padding: '0.4rem 0.9rem', fontSize: '0.85rem', borderLeft: '1px solid #d1d5db' }}>Calendar</button>
            </div>
            <button onClick={() => { setShowForm(true); setForm(emptyForm); setSuccess(''); setError(''); setSelectedClient(null); setIsMultiDay(false) }}>
              + New appointment
            </button>
          </div>
        </div>

        {success && !showForm && <p className="success" style={{ marginBottom: '1rem' }}>{success}</p>}

        {showForm && (
          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <h2 style={{ marginBottom: '1.5rem' }}>New appointment</h2>
            {error && <p className="error">{error}</p>}
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Client *</label>
                <select value={form.client_id} onChange={e => handleClientChange(e.target.value)} required>
                  <option value="">Select a client...</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.full_name}</option>)}
                </select>
              </div>

              <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '1rem', marginBottom: '1rem' }}>
                <p style={{ fontSize: '0.8rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>Date &amp; Time</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 1rem' }}>
                  <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                    <label>Start date *</label>
                    <input type="date" value={form.date} onChange={e => { setForm(prev => ({ ...prev, date: e.target.value })); autoSelectRate(e.target.value, form.start_time, form.end_date, selectedClient?.client_rates) }} required />
                  </div>
                  <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                    <label>End date {isMultiDay ? '*' : '(if multi-day)'}</label>
                    <input type="date" value={form.end_date} min={form.date} disabled={!isMultiDay} onChange={e => { setForm(prev => ({ ...prev, end_date: e.target.value })); autoSelectRate(form.date, form.start_time, e.target.value, selectedClient?.client_rates) }} required={isMultiDay} style={{ opacity: isMultiDay ? 1 : 0.4 }} />
                  </div>
                  <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                    <label>Start time *</label>
                    <input type="time" value={form.start_time} onChange={e => { setForm(prev => ({ ...prev, start_time: e.target.value })); autoSelectRate(form.date, e.target.value, form.end_date, selectedClient?.client_rates) }} required />
                  </div>
                  <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                    <label>End time *</label>
                    <input type="time" value={form.end_time} onChange={e => setForm(prev => ({ ...prev, end_time: e.target.value }))} required />
                  </div>
                </div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', cursor: 'pointer' }}>
                  <input type="checkbox" checked={isMultiDay} onChange={e => { setIsMultiDay(e.target.checked); if (!e.target.checked) { setForm(prev => ({ ...prev, end_date: '' })); autoSelectRate(form.date, form.start_time, '', selectedClient?.client_rates) } }} style={{ width: 'auto', marginBottom: 0 }} />
                  This is a multi-day or overnight shift
                </label>
              </div>

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
                    {selectedClient?.client_rates?.map(r => <option key={r.id} value={r.id}>{r.label} — ${r.amount_per_hour}/hr</option>)}
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

        {/* CALENDAR VIEW */}
        {view === 'calendar' && !loading && (
          <div style={{ display: 'grid', gridTemplateColumns: selectedDate ? '1fr 320px' : '1fr', gap: '1rem' }}>
            <div className="card">
              {/* Month navigation */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <button className="secondary" style={{ padding: '0.3rem 0.75rem' }} onClick={() => setCalMonth(new Date(calMonth.getFullYear(), calMonth.getMonth() - 1))}>←</button>
                <h2 style={{ margin: 0 }}>{calMonth.toLocaleDateString('en-AU', { month: 'long', year: 'numeric' })}</h2>
                <button className="secondary" style={{ padding: '0.3rem 0.75rem' }} onClick={() => setCalMonth(new Date(calMonth.getFullYear(), calMonth.getMonth() + 1))}>→</button>
              </div>

              {/* Day headers */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px', marginBottom: '2px' }}>
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                  <div key={d} style={{ textAlign: 'center', fontSize: '0.75rem', fontWeight: 600, color: '#6b7280', padding: '0.25rem 0' }}>{d}</div>
                ))}
              </div>

              {/* Calendar grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px' }}>
                {buildCalendarDays().map((day, i) => {
                  if (!day) return <div key={i} />
                  const dateStr = toDateStr(day)
                  const dayAppts = getAppointmentsForDate(dateStr)
                  const isToday = dateStr === todayStr
                  const isSelected = dateStr === selectedDate
                  const isWeekend = (i % 7 === 0) || (i % 7 === 6)

                  return (
                    <div
                      key={i}
                      onClick={() => setSelectedDate(isSelected ? null : dateStr)}
                      style={{
                        minHeight: '80px',
                        padding: '0.3rem',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        background: isSelected ? '#EEF2FF' : isToday ? '#FEF9C3' : isWeekend ? '#fafafa' : 'white',
                        border: isSelected ? '2px solid #2563eb' : isToday ? '2px solid #EAB308' : '1px solid #e5e7eb',
                        transition: 'background 0.1s'
                      }}
                    >
                      <div style={{ fontSize: '0.8rem', fontWeight: isToday ? 700 : 500, color: isToday ? '#854F0B' : '#374151', marginBottom: '0.25rem' }}>{day}</div>
                      {dayAppts.slice(0, 3).map(appt => (
                        <div key={appt.id} style={{
                          fontSize: '0.7rem',
                          background: STATUS_COLORS[appt.status] || '#6b7280',
                          color: 'white',
                          borderRadius: '3px',
                          padding: '1px 4px',
                          marginBottom: '2px',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}>
                          {formatTime(appt.start_time)} {appt.clients?.full_name}
                        </div>
                      ))}
                      {dayAppts.length > 3 && (
                        <div style={{ fontSize: '0.65rem', color: '#6b7280' }}>+{dayAppts.length - 3} more</div>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Legend */}
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', flexWrap: 'wrap' }}>
                {Object.entries(STATUS_COLORS).map(([status, color]) => (
                  <div key={status} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem', color: '#6b7280' }}>
                    <div style={{ width: '10px', height: '10px', borderRadius: '2px', background: color }} />
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </div>
                ))}
              </div>
            </div>

            {/* Side panel */}
            {selectedDate && (
              <div className="card" style={{ alignSelf: 'start' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h2 style={{ margin: 0, fontSize: '1rem' }}>
                    {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' })}
                  </h2>
                  <button className="secondary" onClick={() => setSelectedDate(null)} style={{ padding: '0.15rem 0.5rem', fontSize: '0.8rem' }}>✕</button>
                </div>

                {selectedDateAppts.length === 0 ? (
                  <p style={{ color: '#6b7280', fontSize: '0.9rem' }}>No appointments on this day.</p>
                ) : (
                  selectedDateAppts.map(appt => (
                    <div key={appt.id} style={{ borderLeft: `3px solid ${STATUS_COLORS[appt.status] || '#6b7280'}`, paddingLeft: '0.75rem', marginBottom: '1rem' }}>
                      <Link to={`/appointments/${appt.id}`} style={{ fontWeight: 600, fontSize: '0.9rem', color: '#2563eb', textDecoration: 'none', display: 'block' }}>
                        {appt.clients?.full_name}
                      </Link>
                      <div style={{ fontSize: '0.8rem', color: '#6b7280', margin: '0.2rem 0' }}>
                        {formatTime(appt.start_time)} — {formatTime(appt.end_time)}
                        {appt.end_date && appt.end_date !== appt.date && ` (until ${formatDate(appt.end_date)})`}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>{appt.client_rates?.label || '—'}</div>
                      <span className={`badge badge-${appt.status}`} style={{ marginTop: '0.3rem', display: 'inline-block' }}>{appt.status}</span>
                      <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                        {appt.status === 'scheduled' && (
                          <>
                            <button onClick={() => handleAction(appt.id, 'clock-in')} style={{ padding: '0.2rem 0.5rem', fontSize: '0.72rem', background: '#15803d' }}>Clock in</button>
                            <button onClick={() => handleAction(appt.id, 'cancel')} className="danger" style={{ padding: '0.2rem 0.5rem', fontSize: '0.72rem' }}>Cancel</button>
                          </>
                        )}
                        {appt.status === 'in-progress' && (
                          <button onClick={() => handleAction(appt.id, 'clock-out')} style={{ padding: '0.2rem 0.5rem', fontSize: '0.72rem', background: '#854F0B' }}>Clock out</button>
                        )}
                        {appt.status === 'completed' && (
                          <Link to={`/session-notes/${appt.id}`} style={{ fontSize: '0.72rem', color: '#2563eb' }}>Session notes</Link>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}

        {/* LIST VIEW */}
        {view === 'list' && (
          <>
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
                    <tr><th>Client</th><th>Date</th><th>Time</th><th>Rate</th><th>Status</th><th>Actions</th></tr>
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
          </>
        )}
      </div>
    </>
  )
}