import { useEffect, useState } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const API = import.meta.env.VITE_API_URL

export default function ClientHistory() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { signOut } = useAuth()
  const [data, setData] = useState<any>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    Promise.all([
      fetch(`${API}/clients/${id}`).then(r => r.json()),
      fetch(`${API}/clients/${id}/history`).then(r => r.json())
    ])
      .then(([client, history]) => {
        setData({ client, history })
        setLoading(false)
      })
      .catch(e => {
        setError(String(e))
        setLoading(false)
      })
  }, [id])

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
        <button className="secondary" onClick={() => navigate(`/clients/${id}`)} style={{ marginBottom: '1rem', padding: '0.25rem 0.75rem' }}>← Back</button>
        <h1>Client History</h1>
        {loading && <p>Loading...</p>}
        {error && <p className="error">Error: {error}</p>}
        {data && (
          <>
            <h2>{data.client?.full_name}</h2>
            <div className="card" style={{ marginBottom: '1rem' }}>
              <p><strong>Appointments:</strong> {data.history?.appointments?.length ?? 0}</p>
              <p><strong>Incidents:</strong> {data.history?.incidents?.length ?? 0}</p>
              {data.history?.error && <p className="error">API error: {data.history.error}</p>}
            </div>
            {(data.history?.appointments ?? []).length === 0 && (
              <div className="card" style={{ color: '#6b7280', textAlign: 'center' }}>
                <p>No appointment history found for this client.</p>
              </div>
            )}
            {(data.history?.appointments ?? []).map((appt: any) => (
              <div key={appt.id} className="card" style={{ marginBottom: '0.75rem', borderLeft: '4px solid #2563eb' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <strong>{appt.date} · {appt.start_time?.substring(0,5)} – {appt.end_time?.substring(0,5)}</strong>
                  <span className={`badge badge-${appt.status}`}>{appt.status}</span>
                </div>
                {appt.session_notes && (
                  <p style={{ marginTop: '0.5rem', fontSize: '0.9rem', color: '#374151' }}>
                    📝 {Array.isArray(appt.session_notes) ? appt.session_notes[0]?.notes : appt.session_notes?.notes}
                  </p>
                )}
              </div>
            ))}
          </>
        )}
      </div>
    </>
  )
}
