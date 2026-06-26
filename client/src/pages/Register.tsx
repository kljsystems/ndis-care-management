// client/src/pages/Register.tsx
// ITP126ON4-15 — User registration with email, password, validation & errors

import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../context/AuthContext'

// ── password strength scorer ──────────────────────────────────────────────────

function getStrength(password: string): { score: number; label: string; color: string } {
  let score = 0
  if (password.length >= 8)  score++
  if (password.length >= 12) score++
  if (/[A-Z]/.test(password)) score++
  if (/[0-9]/.test(password)) score++
  if (/[^A-Za-z0-9]/.test(password)) score++

  if (score <= 1) return { score, label: 'Weak',   color: '#dc2626' }
  if (score <= 3) return { score, label: 'Fair',   color: '#d97706' }
  if (score === 4) return { score, label: 'Good',  color: '#2563eb' }
  return              { score, label: 'Strong', color: '#15803d' }
}

export default function Register() {
  const [email, setEmail]           = useState('')
  const [password, setPassword]     = useState('')
  const [confirm, setConfirm]       = useState('')
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState('')
  const [success, setSuccess]       = useState(false)

  const strength = getStrength(password)

  // ── validation ──────────────────────────────────────────────────────────────

  const getValidationError = (): string => {
    if (!email)    return 'Email is required.'
    if (!password) return 'Password is required.'
    if (password.length < 8) return 'Password must be at least 8 characters.'
    if (strength.score < 2) return 'Password is too weak. Add uppercase letters, numbers or symbols.'
    if (!confirm)  return 'Please confirm your password.'
    if (password !== confirm) return 'Passwords do not match.'
    return ''
  }

  // ── submit ──────────────────────────────────────────────────────────────────

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const validationError = getValidationError()
    if (validationError) { setError(validationError); return }

    setLoading(true)

    const { error: signUpError } = await supabase.auth.signUp({ email, password })

    if (signUpError) {
      setError(signUpError.message)
      setLoading(false)
      return
    }

    setSuccess(true)
    setLoading(false)
  }

  // ── success screen ──────────────────────────────────────────────────────────

  if (success) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f5f5' }}>
        <div className="card" style={{ width: '100%', maxWidth: '400px', textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✅</div>
          <h2 style={{ marginBottom: '0.5rem' }}>Check your email</h2>
          <p style={{ color: '#6b7280', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
            We sent a confirmation link to <strong>{email}</strong>. Click it to activate your account, then sign in.
          </p>
          <Link to="/login">
            <button style={{ width: '100%' }}>Go to sign in</button>
          </Link>
        </div>
      </div>
    )
  }

  // ── form ────────────────────────────────────────────────────────────────────

  const passwordsMatch = confirm && password === confirm
  const passwordsMismatch = confirm && password !== confirm

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f5f5' }}>
      <div className="card" style={{ width: '100%', maxWidth: '400px' }}>
        <h1 style={{ marginBottom: '0.25rem' }}>NDIS Care Manager</h1>
        <p style={{ color: '#6b7280', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
          Create your account
        </p>

        {error && <p className="error" style={{ marginBottom: '1rem' }}>{error}</p>}

        <form onSubmit={handleRegister} noValidate>

          {/* Email */}
          <div className="form-group">
            <label>Email *</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              autoComplete="email"
            />
          </div>

          {/* Password */}
          <div className="form-group">
            <label>Password *</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete="new-password"
            />

            {/* Strength meter */}
            {password && (
              <div style={{ marginTop: '0.4rem' }}>
                <div style={{ display: 'flex', gap: '4px', marginBottom: '0.25rem' }}>
                  {[1, 2, 3, 4, 5].map(i => (
                    <div
                      key={i}
                      style={{
                        flex: 1, height: '4px', borderRadius: '2px',
                        background: i <= strength.score ? strength.color : '#e5e7eb',
                        transition: 'background 0.2s'
                      }}
                    />
                  ))}
                </div>
                <p style={{ fontSize: '0.75rem', color: strength.color, fontWeight: 500 }}>
                  {strength.label} password
                  {strength.score < 3 && ' — add uppercase, numbers or symbols'}
                </p>
              </div>
            )}
          </div>

          {/* Confirm password */}
          <div className="form-group">
            <label>Confirm password *</label>
            <input
              type="password"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete="new-password"
              style={{
                borderColor: passwordsMismatch ? '#dc2626' : passwordsMatch ? '#15803d' : undefined
              }}
            />
            {passwordsMismatch && (
              <p style={{ fontSize: '0.75rem', color: '#dc2626', marginTop: '0.25rem' }}>
                Passwords do not match
              </p>
            )}
            {passwordsMatch && (
              <p style={{ fontSize: '0.75rem', color: '#15803d', marginTop: '0.25rem' }}>
                ✓ Passwords match
              </p>
            )}
          </div>

          <button
            type="submit"
            style={{ width: '100%', marginTop: '0.5rem' }}
            disabled={loading}
          >
            {loading ? 'Creating account...' : 'Create account'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '1.25rem', fontSize: '0.85rem', color: '#6b7280' }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: '#2563eb', textDecoration: 'none', fontWeight: 500 }}>
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}