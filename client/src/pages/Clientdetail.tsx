import { useEffect, useState } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import Nav from '../components/Nav'

interface Rate {
  id: string
  rate_type: string
  label: string
  amount_per_hour: number
}

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
  client_rates?: Rate[]
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

export default function ClientDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()


  const [client, setClient] = useState<Client | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [form, setForm] = useState({
    full_name: '', ndis_number: '', phone: '', email: '',
    date_of_birth: '', address: '', emergency_contact_name: '',
    emergency_contact_phone: ''
  })

  const [showAddRate, setShowAddRate] = useState(false)
  const [newRate, setNewRate] = useState({ rate_type: 'Weekday Daytime', label: 'Weekday Daytime', amount_per_hour: '' })
  const [savingRate, setSavingRate] = useState(false)
  const [editingRateId, setEditingRateId] = useState<string | null>(null)
  const [editRate, setEditRate] = useState({ rate_type: '', label: '', amount_per_hour: '' })
  const [deletingRateId, setDeletingRateId] = useState<string | null>(null)

  const fetchClient = async () => {
    const res = await fetch(`${API}/clients/${id}`)
    const data = await res.json()
    setClient(data)
    setForm({
      full_name: data.full_name || '',
      ndis_number: data.ndis_number || '',
      phone: data.phone || '',
      email: data.email || '',
      date_of_birth: data.date_of_birth || '',
      address: data.address || '',
      emergency_contact_name: data.emergency_contact_name || '',
      emergency_contact_phone: data.emergency_contact_phone || ''
    })
    setLoading(false)
  }

  useEffect(() => { fetchClient() }, [id])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    setSuccess('')

    const res = await fetch(`${API}/clients/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form)
    })
    const data = await res.json()

    if (data.error) {
      setError(data.error)
      setSaving(false)
      return
    }

    setSuccess('Client updated successfully')
    fetchClient()
    setSaving(false)
  }

  const startEditRate = (rate: Rate) => {
    setEditingRateId(rate.id)
    setEditRate({ rate_type: rate.rate_type, label: rate.label, amount_per_hour: String(rate.amount_per_hour) })
  }

  const handleEditRate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingRateId) return
    const res = await fetch(`${API}/clients/${id}/rates/${editingRateId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        rate_type: editRate.rate_type,
        label: editRate.label,
        amount_per_hour: parseFloat(editRate.amount_per_hour)
      })
    })
    const data = await res.json()
    if (!data.error) {
      setEditingRateId(null)
      fetchClient()
    }
  }

  const handleDeleteRate = async (rateId: string) => {
    if (!window.confirm('Delete this rate? Any appointments using it will keep their existing rate.')) return
    setDeletingRateId(rateId)
    await fetch(`${API}/clients/${id}/rates/${rateId}`, { method: 'DELETE' })
    setDeletingRateId(null)
    fetchClient()
  }

  const handleAddRate = async (e: React.FormEvent) => {
    e.preventDefault()
    setSavingRate(true)

    const res = await fetch(`${API}/clients/${id}/rates`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        rate_type: newRate.rate_type,
        label: newRate.label,
        amount_per_hour: parseFloat(newRate.amount_per_hour)
      })
    })
    const data = await res.json()

    if (!data.error) {
      setNewRate({ rate_type: 'Weekday Daytime', label: 'Weekday Daytime', amount_per_hour: '' })
      setShowAddRate(false)
      fetchClient()
    }
    setSavingRate(false)
  }

  if (loading) return <p style={{ padding: '2rem' }}>Loading...</p>
  if (!client) return <p style={{ padding: '2rem' }}>Client not found.</p>

  return (
    <>
      <Nav />

      <div className="container">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
        <button className="secondary" onClick={() => navigate('/clients')} style={{ padding: '0.25rem 0.75rem' }}>
            ← Back
        </button>
        <h1>{client.full_name}</h1>
        <Link to={`/clients/${id}/history`}>
            <button className="secondary" style={{ padding: '0.25rem 0.75rem' }}>📋 View history</button>
        </Link>
        </div>

        {success && <p className="success" style={{ marginBottom: '1rem' }}>{success}</p>}
        {error && <p className="error" style={{ marginBottom: '1rem' }}>{error}</p>}

        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <h2 style={{ marginBottom: '1.25rem' }}>Client details</h2>
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
            <button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save changes'}</button>
          </form>
        </div>

        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2>Hourly rates</h2>
            <button className="secondary" onClick={() => setShowAddRate(!showAddRate)}>
              {showAddRate ? 'Cancel' : '+ Add rate'}
            </button>
          </div>

          {showAddRate && (
            <form onSubmit={handleAddRate} style={{ marginBottom: '1.25rem', padding: '1rem', background: '#f9fafb', borderRadius: '6px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '0.5rem', alignItems: 'end' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Rate type</label>
                  <select
                    value={newRate.rate_type}
                    onChange={e => setNewRate({ ...newRate, rate_type: e.target.value, label: e.target.value })}
                  >
                    {RATE_TYPES.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Amount per hour ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newRate.amount_per_hour}
                    onChange={e => setNewRate({ ...newRate, amount_per_hour: e.target.value })}
                    placeholder="0.00"
                    required
                  />
                </div>
                <button type="submit" disabled={savingRate} style={{ marginBottom: '0.75rem' }}>
                  {savingRate ? '...' : 'Add'}
                </button>
              </div>
            </form>
          )}

          {client.client_rates && client.client_rates.length > 0 ? (
            <table>
              <thead>
                <tr>
                  <th>Rate type</th>
                  <th>Amount per hour</th>
                  <th style={{ width: '120px' }}></th>
                </tr>
              </thead>
              <tbody>
                {client.client_rates.map(rate => (
                  editingRateId === rate.id ? (
                    <tr key={rate.id}>
                      <td colSpan={3} style={{ padding: '0.5rem' }}>
                        <form onSubmit={handleEditRate} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto auto', gap: '0.5rem', alignItems: 'center' }}>
                          <select value={editRate.rate_type} onChange={e => setEditRate({ ...editRate, rate_type: e.target.value, label: e.target.value })} style={{ marginBottom: 0 }}>
                            {RATE_TYPES.map(t => <option key={t}>{t}</option>)}
                          </select>
                          <input
                            type="number"
                            step="0.01"
                            value={editRate.amount_per_hour}
                            onChange={e => setEditRate({ ...editRate, amount_per_hour: e.target.value })}
                            placeholder="0.00"
                            required
                            style={{ marginBottom: 0 }}
                          />
                          <button type="submit" style={{ padding: '0.3rem 0.75rem', fontSize: '0.85rem' }}>Save</button>
                          <button type="button" className="secondary" onClick={() => setEditingRateId(null)} style={{ padding: '0.3rem 0.75rem', fontSize: '0.85rem' }}>Cancel</button>
                        </form>
                      </td>
                    </tr>
                  ) : (
                    <tr key={rate.id}>
                      <td>{rate.label}</td>
                      <td>${rate.amount_per_hour.toFixed(2)}/hr</td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.4rem' }}>
                          <button className="secondary" onClick={() => startEditRate(rate)} style={{ padding: '0.2rem 0.5rem', fontSize: '0.78rem' }}>Edit</button>
                          <button
                            className="danger"
                            onClick={() => handleDeleteRate(rate.id)}
                            disabled={deletingRateId === rate.id}
                            style={{ padding: '0.2rem 0.5rem', fontSize: '0.78rem' }}
                          >
                            {deletingRateId === rate.id ? '...' : 'Delete'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                ))}
              </tbody>
            </table>
          ) : (
            <p style={{ color: '#6b7280' }}>No rates set. Add a rate above.</p>
          )}
        </div>
      </div>
    </>
  )
}