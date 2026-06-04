// client/src/pages/Login.tsx
// Updated to add "Create account" link to Register page

import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../context/AuthContext'

export default function Login() {
  const navigate = useNavigate()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [totpCode, setTotpCode] = useState('')
  const [step, setStep]         = useState<'login' | 'totp'>('login')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { data, error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    if (data.session?.user.factors && data.session.user.factors.length > 0) {
      setStep('totp')
      setLoading(false)
      return
    }

    navigate('/')
    setLoading(false)
  }

  const handleTotp = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { data: factorsData } = await supabase.auth.mfa.listFactors()
    const totpFactor = factorsData?.totp?.[0]

    if (!totpFactor) {
      setError('No 2FA factor found')
      setLoading(false)
      return
    }

    const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
      factorId: totpFactor.id
    })

    if (challengeError || !challengeData) {
      setError(challengeError?.message || 'Challenge failed')
      setLoading(false)
      return
    }

    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId: totpFactor.id,
      challengeId: challengeData.id,
      code: totpCode
    })

    if (verifyError) {
      setError(verifyError.message)
      setLoading(false)
      return
    }

    navigate('/')
    setLoading(false)
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f5f5' }}>
      <div className="card" style={{ width: '100%', maxWidth: '400px' }}>
        <h1 style={{ marginBottom: '0.25rem' }}>NDIS Care Manager</h1>
        <p style={{ color: '#6b7280', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
          {step === 'login' ? 'Sign in to your account' : 'Enter your authenticator code'}
        </p>

        {error && <p className="error">{error}</p>}

        {step === 'login' ? (
          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="eliza@example.com"
                required
              />
            </div>
            <div className="form-group">
              <label>Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>
            <button type="submit" style={{ width: '100%' }} disabled={loading}>
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleTotp}>
            <div className="form-group">
              <label>Authenticator code</label>
              <input
                type="text"
                value={totpCode}
                onChange={e => setTotpCode(e.target.value)}
                placeholder="000000"
                maxLength={6}
                required
              />
            </div>
            <button type="submit" style={{ width: '100%' }} disabled={loading}>
              {loading ? 'Verifying...' : 'Verify'}
            </button>
            <button
              type="button"
              className="secondary"
              style={{ width: '100%', marginTop: '0.5rem' }}
              onClick={() => setStep('login')}
            >
              Back to login
            </button>
          </form>
        )}

        {step === 'login' && (
          <p style={{ textAlign: 'center', marginTop: '1.25rem', fontSize: '0.85rem', color: '#6b7280' }}>
            Don't have an account?{' '}
            <Link to="/register" style={{ color: '#2563eb', textDecoration: 'none', fontWeight: 500 }}>
              Create account
            </Link>
          </p>
        )}
      </div>
    </div>
  )
}