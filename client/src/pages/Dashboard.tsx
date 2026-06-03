import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

interface Appointment {
  id: string
  date: string
  start_time: string
  end_time: string
  status: string
  clients: { full_name: string }
}

interface Invoice {
  id: string
  total: number
  status: string
  clients: { full_name: string }
}

const API = import.meta.env.VITE_API_URL

export default function Dashboard() {
  const { signOut } = useAuth()
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      const [apptRes, invRes] = await Promise.all([
        fetch(`${API}/appointments`),
        fetch(`${API}/invoices`)
      ])
      const apptData = await apptRes.json()
      const invData = await invRes.json()

      const today = new Date().toISOString().split('T')[0]
      const todayAppts = Array.isArray(apptData)
        ? apptData.filter((a: Appointment) => a.date === today)
        : []
      const unpaidInvoices = Array.isArray(invData)
        ? invData.filter((i: Invoice) => i.status !== 'paid')
        : []

      setAppointments(todayAppts)
      setInvoices(unpaidInvoices)
      setLoading(false)
    }
    fetchData()
  }, [])

  const unpaidTotal = invoices.reduce((sum, inv) => sum + (inv.total || 0), 0)

  return (
    <>
      <nav>
        <span style={{ fontWeight: 700, fontSize: '1.1rem', marginRight: 'auto' }}>
          NDIS Care Manager
        </span>
        <Link to="/">Dashboard</Link>
        <Link to="/clients">Clients</Link>
        <Link to="/appointments">Appointments</Link>
        <Link to="/invoices">Invoices</Link>
        <Link to="/session-notes">Session Notes</Link>
        <button
          onClick={signOut}
          style={{ background: 'rgba(255,255,255,0.2)', marginLeft: '1rem' }}
        >
          Log out
        </button>
      </nav>

      <div className="container">
        <h1>Dashboard</h1>

        <div className="grid" style={{ marginBottom: '2rem' }}>
          <div className="card" style={{ borderLeft: '4px solid #2563eb' }}>
            <p style={{ color: '#6b7280', fontSize: '0.85rem', marginBottom: '0.5rem' }}>
              Today's appointments
            </p>
            <p style={{ fontSize: '2rem', fontWeight: 700 }}>{appointments.length}</p>
          </div>
          <div className="card" style={{ borderLeft: '4px solid #dc2626' }}>
            <p style={{ color: '#6b7280', fontSize: '0.85rem', marginBottom: '0.5rem' }}>
              Unpaid invoices
            </p>
            <p style={{ fontSize: '2rem', fontWeight: 700 }}>{invoices.length}</p>
          </div>
          <div className="card" style={{ borderLeft: '4px solid #15803d' }}>
            <p style={{ color: '#6b7280', fontSize: '0.85rem', marginBottom: '0.5rem' }}>
              Outstanding amount
            </p>
            <p style={{ fontSize: '2rem', fontWeight: 700 }}>
              ${unpaidTotal.toFixed(2)}
            </p>
          </div>
        </div>

        <div className="card">
          <h2>Today's appointments</h2>
          {loading ? (
            <p style={{ color: '#6b7280' }}>Loading...</p>
          ) : appointments.length === 0 ? (
            <p style={{ color: '#6b7280' }}>No appointments today.</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Client</th>
                  <th>Time</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {appointments.map(appt => (
                  <tr key={appt.id}>
                    <td>{appt.clients?.full_name}</td>
                    <td>{appt.start_time} — {appt.end_time}</td>
                    <td>
                      <span className={`badge badge-${appt.status}`}>
                        {appt.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="card" style={{ marginTop: '1rem' }}>
          <h2>Unpaid invoices</h2>
          {loading ? (
            <p style={{ color: '#6b7280' }}>Loading...</p>
          ) : invoices.length === 0 ? (
            <p style={{ color: '#6b7280' }}>No outstanding invoices.</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Client</th>
                  <th>Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map(inv => (
                  <tr key={inv.id}>
                    <td>{inv.clients?.full_name}</td>
                    <td>${inv.total?.toFixed(2)}</td>
                    <td>
                      <span className={`badge badge-${inv.status}`}>
                        {inv.status}
                      </span>
                    </td>
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