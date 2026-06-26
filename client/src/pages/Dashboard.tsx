import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Nav from '../components/Nav'

interface Appointment {
  id: string
  date: string
  start_time: string
  end_time: string
  actual_start: string | null
  status: string
  clients: { full_name: string }
}

interface Invoice {
  id: string
  total: number
  status: string
  created_at: string
  clients: { full_name: string }
}

interface Client {
  id: string
  full_name: string
  client_rates?: { id: string }[]
}

interface AlertSession {
  id: string
  clientName: string
  actual_start: string
  hours_elapsed: number
}

interface AlertInvoice {
  id: string
  clientName: string
  total: number
  days_overdue: number
}

interface Alerts {
  long_sessions: AlertSession[]
  overdue_invoices: AlertInvoice[]
}

const API = import.meta.env.VITE_API_URL

const formatTime = (t: string) => t ? t.substring(0, 5) : '—'

const formatDateTime = (iso: string | null) => {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-AU', { hour: '2-digit', minute: '2-digit' })
}

export default function Dashboard() {
  const [todayAppts, setTodayAppts] = useState<Appointment[]>([])
  const [inProgressAppts, setInProgressAppts] = useState<Appointment[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [clientsNoRate, setClientsNoRate] = useState<Client[]>([])
  const [alerts, setAlerts] = useState<Alerts>({ long_sessions: [], overdue_invoices: [] })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      const [apptRes, invRes, clientRes, alertRes] = await Promise.all([
        fetch(`${API}/appointments`),
        fetch(`${API}/invoices`),
        fetch(`${API}/clients`),
        fetch(`${API}/alerts`)
      ])
      const apptData: Appointment[] = await apptRes.json()
      const invData: Invoice[]      = await invRes.json()
      const clientData: Client[]    = await clientRes.json()
      const alertData: Alerts       = await alertRes.json()

      const today = new Date().toISOString().split('T')[0]

      setTodayAppts(Array.isArray(apptData)
        ? apptData.filter(a => a.date === today && a.status !== 'cancelled')
        : [])

      setInProgressAppts(Array.isArray(apptData)
        ? apptData.filter(a => a.status === 'in-progress')
        : [])

      setInvoices(Array.isArray(invData)
        ? invData.filter(i => i.status !== 'paid')
        : [])

      // Check clients without any rates configured
      const withRatesRes = await Promise.all(
        (Array.isArray(clientData) ? clientData : []).map(c =>
          fetch(`${API}/clients/${c.id}`).then(r => r.json())
        )
      )
      setClientsNoRate(withRatesRes.filter(c => !c.client_rates || c.client_rates.length === 0))
      setAlerts(alertData?.long_sessions ? alertData : { long_sessions: [], overdue_invoices: [] })

      setLoading(false)
    }
    fetchData()
  }, [])

  const unpaidTotal = invoices.reduce((sum, inv) => sum + (inv.total || 0), 0)

  return (
    <>
      <Nav />

      <div className="container">
        <h1>Dashboard</h1>

        {/* Alerts */}
        {!loading && (alerts.long_sessions.length > 0 || alerts.overdue_invoices.length > 0) && (
          <div style={{ marginBottom: '1.5rem' }}>
            {alerts.long_sessions.map(s => (
              <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff7ed', border: '1px solid #fed7aa', borderLeft: '4px solid #f97316', borderRadius: '8px', padding: '0.75rem 1rem', marginBottom: '0.5rem' }}>
                <div>
                  <span style={{ fontWeight: 600, color: '#9a3412', fontSize: '0.9rem' }}>
                    ⏱ Long-running session
                  </span>
                  <span style={{ color: '#c2410c', fontSize: '0.85rem', marginLeft: '0.5rem' }}>
                    {s.clientName} — clocked in {s.hours_elapsed}h ago, no clock-out recorded
                  </span>
                </div>
                <Link to={`/appointments/${s.id}`} style={{ fontSize: '0.85rem', color: '#9a3412', fontWeight: 600, textDecoration: 'none', whiteSpace: 'nowrap', marginLeft: '1rem' }}>
                  Clock out →
                </Link>
              </div>
            ))}

            {alerts.overdue_invoices.map(inv => (
              <div key={inv.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff1f2', border: '1px solid #fecdd3', borderLeft: '4px solid #dc2626', borderRadius: '8px', padding: '0.75rem 1rem', marginBottom: '0.5rem' }}>
                <div>
                  <span style={{ fontWeight: 600, color: '#991b1b', fontSize: '0.9rem' }}>
                    ⚠ Overdue invoice
                  </span>
                  <span style={{ color: '#b91c1c', fontSize: '0.85rem', marginLeft: '0.5rem' }}>
                    {inv.clientName} — ${Number(inv.total).toFixed(2)} unpaid for {inv.days_overdue} days
                  </span>
                </div>
                <Link to={`/invoices/${inv.id}`} style={{ fontSize: '0.85rem', color: '#991b1b', fontWeight: 600, textDecoration: 'none', whiteSpace: 'nowrap', marginLeft: '1rem' }}>
                  View invoice →
                </Link>
              </div>
            ))}
          </div>
        )}

        {/* Stat cards */}
        <div className="grid" style={{ marginBottom: '2rem' }}>
          <div className="card" style={{ borderLeft: '4px solid #2563eb' }}>
            <p style={{ color: '#6b7280', fontSize: '0.85rem', marginBottom: '0.5rem' }}>Today's appointments</p>
            <p style={{ fontSize: '2rem', fontWeight: 700 }}>{todayAppts.length}</p>
          </div>
          <div className="card" style={{ borderLeft: inProgressAppts.length > 0 ? '4px solid #854F0B' : '4px solid #e5e7eb' }}>
            <p style={{ color: '#6b7280', fontSize: '0.85rem', marginBottom: '0.5rem' }}>In-progress sessions</p>
            <p style={{ fontSize: '2rem', fontWeight: 700, color: inProgressAppts.length > 0 ? '#854F0B' : 'inherit' }}>{inProgressAppts.length}</p>
          </div>
          <div className="card" style={{ borderLeft: '4px solid #dc2626' }}>
            <p style={{ color: '#6b7280', fontSize: '0.85rem', marginBottom: '0.5rem' }}>Unpaid invoices</p>
            <p style={{ fontSize: '2rem', fontWeight: 700 }}>{invoices.length}</p>
          </div>
          <div className="card" style={{ borderLeft: '4px solid #15803d' }}>
            <p style={{ color: '#6b7280', fontSize: '0.85rem', marginBottom: '0.5rem' }}>Outstanding amount</p>
            <p style={{ fontSize: '2rem', fontWeight: 700 }}>${unpaidTotal.toFixed(2)}</p>
          </div>
        </div>

        {/* No-rate warning */}
        {!loading && clientsNoRate.length > 0 && (
          <div className="card" style={{ marginBottom: '1.5rem', borderLeft: '4px solid #f59e0b', background: '#fffbeb' }}>
            <p style={{ fontWeight: 600, color: '#92400e', marginBottom: '0.5rem' }}>
              ⚠ {clientsNoRate.length} client{clientsNoRate.length > 1 ? 's have' : ' has'} no billing rates configured
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {clientsNoRate.map(c => (
                <Link key={c.id} to={`/clients/${c.id}`} style={{ fontSize: '0.85rem', color: '#2563eb', textDecoration: 'none', background: 'white', border: '1px solid #e5e7eb', borderRadius: '4px', padding: '0.2rem 0.5rem' }}>
                  {c.full_name}
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* In-progress sessions */}
        {!loading && inProgressAppts.length > 0 && (
          <div className="card" style={{ marginBottom: '1rem', borderLeft: '4px solid #854F0B' }}>
            <h2 style={{ marginBottom: '1rem', color: '#854F0B' }}>⏱ Active sessions</h2>
            <table>
              <thead>
                <tr><th>Client</th><th>Clocked in</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {inProgressAppts.map(appt => (
                  <tr key={appt.id}>
                    <td>
                      <Link to={`/appointments/${appt.id}`} style={{ color: '#2563eb', textDecoration: 'none', fontWeight: 500 }}>
                        {appt.clients?.full_name}
                      </Link>
                    </td>
                    <td>{formatDateTime(appt.actual_start)}</td>
                    <td>
                      <Link to={`/appointments/${appt.id}`} style={{ fontSize: '0.8rem', color: '#854F0B' }}>
                        Clock out →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Today's appointments */}
        <div className="card" style={{ marginBottom: '1rem' }}>
          <h2>Today's appointments</h2>
          {loading ? (
            <p style={{ color: '#6b7280' }}>Loading...</p>
          ) : todayAppts.length === 0 ? (
            <p style={{ color: '#6b7280' }}>No appointments today.</p>
          ) : (
            <table>
              <thead>
                <tr><th>Client</th><th>Time</th><th>Status</th></tr>
              </thead>
              <tbody>
                {todayAppts.map(appt => (
                  <tr key={appt.id}>
                    <td>
                      <Link to={`/appointments/${appt.id}`} style={{ color: '#2563eb', textDecoration: 'none', fontWeight: 500 }}>
                        {appt.clients?.full_name}
                      </Link>
                    </td>
                    <td>{formatTime(appt.start_time)} — {formatTime(appt.end_time)}</td>
                    <td><span className={`badge badge-${appt.status}`}>{appt.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Unpaid invoices */}
        <div className="card">
          <h2>Unpaid invoices</h2>
          {loading ? (
            <p style={{ color: '#6b7280' }}>Loading...</p>
          ) : invoices.length === 0 ? (
            <p style={{ color: '#6b7280' }}>No outstanding invoices.</p>
          ) : (
            <table>
              <thead>
                <tr><th>Client</th><th>Issued</th><th>Amount</th><th>Status</th></tr>
              </thead>
              <tbody>
                {invoices.map(inv => (
                  <tr key={inv.id}>
                    <td>
                      <Link to={`/invoices/${inv.id}`} style={{ color: '#2563eb', textDecoration: 'none', fontWeight: 500 }}>
                        {inv.clients?.full_name}
                      </Link>
                    </td>
                    <td style={{ fontSize: '0.85rem', color: '#6b7280' }}>
                      {new Date(inv.created_at).toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td style={{ fontWeight: 600 }}>${inv.total?.toFixed(2)}</td>
                    <td><span className={`badge badge-${inv.status}`}>{inv.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  )
}
