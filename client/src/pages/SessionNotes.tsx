// client/src/pages/SessionNotes.tsx
// ITP126ON4-21 — Write and view session notes for a completed appointment

import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Nav from '../components/Nav'

interface SessionNote {
  id: string
  appointment_id: string
  notes: string
  created_at: string
  medications?: Medication[]
}

interface Medication {
  id: string
  name: string
  dose: string
  time_given: string
  notes: string
}

interface Appointment {
  id: string
  date: string
  start_time: string
  end_time: string
  status: string
  clients: { full_name: string; id: string }
}

const API = import.meta.env.VITE_API_URL

export default function SessionNotes() {
  const { appointmentId } = useParams<{ appointmentId: string }>()
  const navigate = useNavigate()


  const [appointment, setAppointment] = useState<Appointment | null>(null)
  const [existingNote, setExistingNote]   = useState<SessionNote | null>(null)
  const [loading, setLoading]             = useState(true)
  const [saving, setSaving]               = useState(false)
  const [success, setSuccess]             = useState('')
  const [error, setError]                 = useState('')

  // form state
  const [notes, setNotes]                 = useState('')
  const [medications, setMedications]     = useState<Omit<Medication, 'id'>[]>([])

  // ── fetch appointment + existing note ─────────────────────────────────────

  useEffect(() => {
    if (!appointmentId) return
    const load = async () => {
      const [apptRes, noteRes] = await Promise.all([
        fetch(`${API}/appointments/${appointmentId}`),
        fetch(`${API}/session-notes/${appointmentId}`)
      ])
      const apptData = await apptRes.json()
      const noteData = await noteRes.json()

      if (!apptData.error) setAppointment(apptData)

      // ITP126ON4-132: display existing notes if they exist
      if (!noteData.error && noteData?.id) {
        setExistingNote(noteData)
        setNotes(noteData.notes || '')
        setMedications(noteData.medications || [])
      }

      setLoading(false)
    }
    load()
  }, [appointmentId])

  // ── medication helpers ─────────────────────────────────────────────────────

  const addMedication = () => {
    setMedications(prev => [...prev, { name: '', dose: '', time_given: '', notes: '' }])
  }

  const updateMedication = (index: number, field: string, value: string) => {
    setMedications(prev => prev.map((m, i) => i === index ? { ...m, [field]: value } : m))
  }

  const removeMedication = (index: number) => {
    setMedications(prev => prev.filter((_, i) => i !== index))
  }

  // ── ITP126ON4-130: POST /session-notes ───────────────────────────────────

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!notes.trim()) { setError('Please enter session notes before saving.'); return }
    setSaving(true)
    setError('')
    setSuccess('')

    const res = await fetch(`${API}/session-notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        appointment_id: appointmentId,
        notes,
        medications: medications.filter(m => m.name.trim())
      })
    })
    const data = await res.json()

    if (data.error) {
      setError(data.error)
    } else {
      setExistingNote(data)
      setSuccess('Session notes saved successfully.')
    }
    setSaving(false)
  }

  // ── helpers ────────────────────────────────────────────────────────────────

  const formatDate = (d: string) =>
    new Date(d + 'T00:00:00').toLocaleDateString('en-AU', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })

  const formatTime = (t: string) => t ? t.substring(0, 5) : '—'

  const formatCreated = (iso: string) =>
    new Date(iso).toLocaleString('en-AU', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })

  // ── render ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <>
        <Nav />
        <div className="container"><p>Loading...</p></div>
      </>
    )
  }

  return (
    <>
      <Nav />

      <div className="container">

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
          <button className="secondary" onClick={() => navigate(`/appointments/${appointmentId}`)} style={{ padding: '0.25rem 0.75rem' }}>
            ← Back
          </button>
          <div>
            <h1 style={{ margin: 0 }}>Session Notes</h1>
            {appointment && (
              <p style={{ color: '#6b7280', fontSize: '0.85rem', marginTop: '0.2rem' }}>
                {appointment.clients?.full_name} · {formatDate(appointment.date)} · {formatTime(appointment.start_time)} – {formatTime(appointment.end_time)}
              </p>
            )}
          </div>
        </div>

        {/* ITP126ON4-132: Show existing note as read-only if already saved */}
        {existingNote && (
          <div className="card" style={{ marginBottom: '1.5rem', borderLeft: '4px solid #15803d' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <h2 style={{ margin: 0 }}>Saved notes</h2>
              <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>Saved {formatCreated(existingNote.created_at)}</span>
            </div>
            <p style={{ fontSize: '0.9rem', whiteSpace: 'pre-wrap', color: '#374151', marginBottom: existingNote.medications?.length ? '1rem' : 0 }}>
              {existingNote.notes}
            </p>
            {existingNote.medications && existingNote.medications.length > 0 && (
              <>
                <h3 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.5rem', color: '#374151' }}>Medications administered</h3>
                <table style={{ width: '100%' }}>
                  <thead>
                    <tr>
                      <th style={{ fontSize: '0.8rem' }}>Medication</th>
                      <th style={{ fontSize: '0.8rem' }}>Dose</th>
                      <th style={{ fontSize: '0.8rem' }}>Time given</th>
                      <th style={{ fontSize: '0.8rem' }}>Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {existingNote.medications.map((med, i) => (
                      <tr key={i}>
                        <td style={{ fontSize: '0.85rem' }}>{med.name}</td>
                        <td style={{ fontSize: '0.85rem' }}>{med.dose || '—'}</td>
                        <td style={{ fontSize: '0.85rem' }}>{med.time_given || '—'}</td>
                        <td style={{ fontSize: '0.85rem' }}>{med.notes || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}
          </div>
        )}

        {/* ITP126ON4-128: Session notes form */}
        <div className="card">
          <h2 style={{ marginBottom: '1rem' }}>
            {existingNote ? 'Add additional notes' : 'Write session notes'}
          </h2>

          {success && <p className="success" style={{ marginBottom: '1rem' }}>{success}</p>}
          {error   && <p className="error"   style={{ marginBottom: '1rem' }}>{error}</p>}

          <form onSubmit={handleSave}>
            {/* Notes textarea */}
            <div className="form-group">
              <label>Session notes *</label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Describe what occurred during this session, the client's mood and wellbeing, activities completed, any concerns or observations..."
                rows={6}
                required
                style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.9rem', resize: 'vertical', fontFamily: 'inherit' }}
              />
            </div>

            {/* Medications section */}
            <div style={{ marginBottom: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <label style={{ fontWeight: 500, fontSize: '0.9rem' }}>Medications administered (optional)</label>
                <button type="button" className="secondary" onClick={addMedication} style={{ padding: '0.2rem 0.75rem', fontSize: '0.85rem' }}>
                  + Add medication
                </button>
              </div>

              {medications.map((med, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr auto', gap: '0.5rem', alignItems: 'end', marginBottom: '0.5rem' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label style={{ fontSize: '0.8rem' }}>Medication name</label>
                    <input
                      value={med.name}
                      onChange={e => updateMedication(i, 'name', e.target.value)}
                      placeholder="e.g. Paracetamol"
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label style={{ fontSize: '0.8rem' }}>Dose</label>
                    <input
                      value={med.dose}
                      onChange={e => updateMedication(i, 'dose', e.target.value)}
                      placeholder="e.g. 500mg"
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label style={{ fontSize: '0.8rem' }}>Time given</label>
                    <input
                      type="time"
                      value={med.time_given}
                      onChange={e => updateMedication(i, 'time_given', e.target.value)}
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label style={{ fontSize: '0.8rem' }}>Notes</label>
                    <input
                      value={med.notes}
                      onChange={e => updateMedication(i, 'notes', e.target.value)}
                      placeholder="Optional"
                    />
                  </div>
                  <button
                    type="button"
                    className="danger"
                    onClick={() => removeMedication(i)}
                    style={{ marginBottom: '0.75rem', padding: '0.4rem 0.6rem' }}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button type="submit" disabled={saving}>
                {saving ? 'Saving...' : '💾 Save notes'}
              </button>
              <button type="button" className="secondary" onClick={() => navigate(`/appointments/${appointmentId}`)}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  )
}