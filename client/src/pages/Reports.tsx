import { useState } from 'react'
import Nav from '../components/Nav'

interface RateBreakdown {
  label: string
  hours: number
  amount: number
}

interface EarningsData {
  total_hours: number
  total_amount: number
  by_rate: RateBreakdown[]
}

const API = import.meta.env.VITE_API_URL

function getWeekRange() {
  const now = new Date()
  const day = now.getDay()
  const mon = new Date(now); mon.setDate(now.getDate() - (day === 0 ? 6 : day - 1))
  const sun = new Date(mon); sun.setDate(mon.getDate() + 6)
  return { from: mon.toISOString().split('T')[0], to: sun.toISOString().split('T')[0] }
}

function getMonthRange() {
  const now = new Date()
  const from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
  const to   = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]
  return { from, to }
}

export default function Reports() {

  const [preset, setPreset] = useState<'week' | 'month' | 'custom'>('month')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo]   = useState('')
  const [data, setData]           = useState<EarningsData | null>(null)
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState('')

  const getRange = () => {
    if (preset === 'week')   return getWeekRange()
    if (preset === 'month')  return getMonthRange()
    return { from: customFrom, to: customTo }
  }

  const handleFetch = async () => {
    const { from, to } = getRange()
    if (!from || !to) { setError('Please set a date range.'); return }
    if (from > to)    { setError('From date must be before To date.'); return }
    setError('')
    setLoading(true)
    try {
      const res = await fetch(`${API}/reports/earnings?from=${from}&to=${to}`)
      const json = await res.json()
      if (json.error) setError(json.error)
      else setData(json)
    } catch {
      setError('Failed to load report.')
    }
    setLoading(false)
  }

  const fmtDate = (d: string) => new Date(d + 'T00:00:00').toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric' })
  const { from, to } = getRange()

  return (
    <>
      <Nav />

      <div className="container">
        <h1>Earnings report</h1>

        {/* Range selector */}
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <h2 style={{ marginBottom: '1rem' }}>Select date range</h2>

          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
            {(['week', 'month', 'custom'] as const).map(p => (
              <button
                key={p}
                onClick={() => setPreset(p)}
                className={preset === p ? '' : 'secondary'}
                style={{ padding: '0.3rem 0.9rem', fontSize: '0.85rem' }}
              >
                {p === 'week' ? 'This week' : p === 'month' ? 'This month' : 'Custom'}
              </button>
            ))}
          </div>

          {preset === 'custom' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 1rem', marginBottom: '1rem' }}>
              <div className="form-group" style={{ marginBottom: '0.5rem' }}>
                <label>From</label>
                <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)} />
              </div>
              <div className="form-group" style={{ marginBottom: '0.5rem' }}>
                <label>To</label>
                <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)} />
              </div>
            </div>
          )}

          {preset !== 'custom' && from && to && (
            <p style={{ fontSize: '0.85rem', color: '#6b7280', marginBottom: '1rem' }}>
              {fmtDate(from)} — {fmtDate(to)}
            </p>
          )}

          {error && <p className="error" style={{ marginBottom: '0.75rem' }}>{error}</p>}

          <button onClick={handleFetch} disabled={loading}>
            {loading ? 'Loading...' : 'Generate report'}
          </button>
        </div>

        {/* Results */}
        {data && (
          <>
            {/* Summary cards */}
            <div className="grid" style={{ marginBottom: '1.5rem' }}>
              <div className="card" style={{ borderLeft: '4px solid #2563eb' }}>
                <p style={{ color: '#6b7280', fontSize: '0.85rem', marginBottom: '0.5rem' }}>Total hours</p>
                <p style={{ fontSize: '2rem', fontWeight: 700 }}>{data.total_hours.toFixed(2)}h</p>
              </div>
              <div className="card" style={{ borderLeft: '4px solid #15803d' }}>
                <p style={{ color: '#6b7280', fontSize: '0.85rem', marginBottom: '0.5rem' }}>Total billed</p>
                <p style={{ fontSize: '2rem', fontWeight: 700 }}>${data.total_amount.toFixed(2)}</p>
              </div>
              <div className="card" style={{ borderLeft: '4px solid #6b7280' }}>
                <p style={{ color: '#6b7280', fontSize: '0.85rem', marginBottom: '0.5rem' }}>Rate types</p>
                <p style={{ fontSize: '2rem', fontWeight: 700 }}>{data.by_rate.length}</p>
              </div>
            </div>

            {/* Breakdown by rate type */}
            <div className="card">
              <h2 style={{ marginBottom: '1rem' }}>Breakdown by rate type</h2>
              {data.by_rate.length === 0 ? (
                <p style={{ color: '#6b7280' }}>No invoiced appointments in this period.</p>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>Rate type</th>
                      <th>Hours</th>
                      <th>Amount</th>
                      <th style={{ width: '140px' }}>% of total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.by_rate.map(row => {
                      const pct = data.total_amount > 0 ? Math.round((row.amount / data.total_amount) * 100) : 0
                      return (
                        <tr key={row.label}>
                          <td style={{ fontWeight: 500 }}>{row.label}</td>
                          <td>{row.hours.toFixed(2)}h</td>
                          <td style={{ fontWeight: 600, color: '#15803d' }}>${row.amount.toFixed(2)}</td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <div style={{ flex: 1, background: '#e5e7eb', borderRadius: '3px', height: '8px', overflow: 'hidden' }}>
                                <div style={{ width: `${pct}%`, background: '#2563eb', height: '100%', borderRadius: '3px' }} />
                              </div>
                              <span style={{ fontSize: '0.8rem', color: '#6b7280', minWidth: '32px' }}>{pct}%</span>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td style={{ fontWeight: 700, borderBottom: 'none' }}>Total</td>
                      <td style={{ fontWeight: 700, borderBottom: 'none' }}>{data.total_hours.toFixed(2)}h</td>
                      <td style={{ fontWeight: 700, color: '#2563eb', borderBottom: 'none' }}>${data.total_amount.toFixed(2)}</td>
                      <td style={{ borderBottom: 'none' }}></td>
                    </tr>
                  </tfoot>
                </table>
              )}
            </div>
          </>
        )}
      </div>
    </>
  )
}
