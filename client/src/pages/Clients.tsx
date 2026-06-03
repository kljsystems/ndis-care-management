import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

interface Client {
  id: string
  full_name: string
  ndis_number: string
  phone: string
  email: string
  date_of_birth: string
  address: string
  emergency_contact_name: string
  emergency_contact_phone: string
}

const API = import.meta.env.VITE_API_URL

const RATE_TYPES = [
  'Weekday Daytime',
  'Weekday Evening',
  'Saturday',
  'Sunday',
  'Public Holiday',
  'Overnight Sleepover',
  'Active Overnight',
  'Custom'
]

const emptyForm = {
  full_name: '', ndis_number: '', phone: '', email: '',
  date_of_birth: '', address: '', emergency_contact_name: '',
  emergency_contact_phone: ''
}

export default function Clients() {
  const { signOut } = useAuth()
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [rates, setRates] = useState<{ label: string; rate_type: string; amount_per_hour: string }[]>([
    { label: 'Weekday Daytime', rate_type: 'Weekday Daytime', amount_per_hour: '' }
  ])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [search, setSearch] = useState('')

  const fetchClients = async () => {
    const res = await fetch(`${API}/clients`)
    const data = await res.json()
    setClients(Array.isArray(data) ? data : [])
    setLoading(false)
  }

  useEffect(() => { fetchClients() }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    setSuccess('')

    const res = await fetch(`${API}/clients`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form)
    })
    const client = await res.json()

    if (client.error) {
      setError(client.error)
      setSaving(false)
      return
    }

    if (rates.length > 0) {
      for (const rate of rates) {
        if (rate.amount_per_hour) {
          await fetch(`${API}/clients/${client.id}/rates`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              rate_type: rate.rate_type,
              label: rate.label,
              amount_per_hour: parseFloat(rate.amount_per_hour)
            })
          })
        }
      }
    }

    setSuccess('Client created successfully')
    setShowForm(false)
    setForm(emptyForm)
    setRates([{ label: 'Weekday Daytime', rate_type: 'Weekday Daytime', amount_per_hour: '' }])
    fetchClients()
    setSaving(false)
  }

  const addRate = () => {
    setRates([...rates, { label: '', rate_type: 'Custom', amount_per_hour: '' }])
  }

  const updateRate = (index: number, field: string, value: string) => {
    const updated = [...rates]
    updated[index] = { ...updated[index], [field]: value }
    if (field === 'rate_type') updated[index].label = value
    setRates(updated)
  }

  const removeRate = (index: number) => {
    setRates(rates.filter((_, i) => i !== index))
  }

  const filteredClients = clients.filter(c =>
    c.full_name.toLowerCase().includes(search.toLowerCase())
  )

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
        <button onClick={signOut} style={{ background: 'rgba(255,255,255,0.2)', marginLeft: '1rem' }}>
          Log out
        </button>
      </nav>

      <div className="container">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h1>Clients</h1>
          <button onClick={() => {
            setShowForm(true)
            setForm(emptyForm)
            setSuccess('')
            setError('')
          }}>
            + Add client
          </button>
        </div>

        {success && !showForm && <p className="success" style={{ marginBottom: '1rem' }}>{success}</p>}

        {!showForm && clients.length > 0 && (
          <div style={{ marginBottom: '1rem' }}>
            <input
              placeholder="Search by name..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ maxWidth: '300px' }}
            />
          </div>
        )}

        {showForm && (
          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <h2>Add new client</h2>
            {error && <p className="error">{error}</p>}
            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 1rem' }}>
                <div className="form-group">
                  <label>Full name *</label>
                  <input value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label>NDIS number</label>
                  <input value={form.ndis_number} onChange={e => setForm({ ...form, ndis_number: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Phone</label>
                  <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Email</label>
                  <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Date of birth</label>
                  <input type="date" value={form.date_of_birth} onChange={e => setForm({ ...form, date_of_birth: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Address</label>
                  <input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Emergency contact name</label>
                  <input value={form.emergency_contact_name} onChange={e => setForm({ ...form, emergency_contact_name: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Emergency contact phone</label>
                  <input value={form.emergency_contact_phone} onChange={e => setForm({ ...form, emergency_contact_phone: e.target.value })} />
                </div>
              </div>

              <div style={{ marginTop: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <h2>Hourly rates</h2>
                  <button type="button" className="secondary" onClick={addRate}>+ Add rate</button>
                </div>
                {rates.map((rate, i) => (
                  <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '0.5rem', alignItems: 'end', marginBottom: '0.5rem' }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label>Rate type</label>
                      <select value={rate.rate_type} onChange={e => updateRate(i, 'rate_type', e.target.value)}>
                        {RATE_TYPES.map(t => <option key={t}>{t}</option>)}
                      </select>
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label>Amount per hour ($)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={rate.amount_per_hour}
                        onChange={e => updateRate(i, 'amount_per_hour', e.target.value)}
                        placeholder="0.00"
                      />
                    </div>
                    <button type="button" className="danger" onClick={() => removeRate(i)} style={{ marginBottom: '0.75rem' }}>x</button>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                <button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save client'}</button>
                <button type="button" className="secondary" onClick={() => {
                  setShowForm(false)
                  setError('')
                }}>Cancel</button>
              </div>
            </form>
          </div>
        )}

        {loading ? (
          <p>Loading...</p>
        ) : clients.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', color: '#6b7280' }}>
            <p>No clients yet. Add your first client to get started.</p>
          </div>
        ) : (
          <div className="card">
            {filteredClients.length === 0 ? (
              <p style={{ color: '#6b7280' }}>No clients match your search.</p>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>NDIS number</th>
                    <th>Phone</th>
                    <th>Email</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredClients.map(client => (
                    <tr key={client.id}>
                      <td>
                        <Link to={`/clients/${client.id}`} style={{ color: '#2563eb', textDecoration: 'none' }}>
                          {client.full_name}
                        </Link>
                      </td>
                      <td>{client.ndis_number || '—'}</td>
                      <td>{client.phone || '—'}</td>
                      <td>{client.email || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </>
  )
}