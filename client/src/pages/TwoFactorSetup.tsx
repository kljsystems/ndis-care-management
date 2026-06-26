// client/src/pages/TwoFactorSetup.tsx
// ITP126ON4-17 — 2FA setup page using Supabase MFA (TOTP)
// ─────────────────────────────────────────────────────────────────────────────
// Add to App.tsx:
//   import TwoFactorSetup from './pages/TwoFactorSetup'
//   <Route path="/account/2fa" element={<ProtectedRoute><TwoFactorSetup /></ProtectedRoute>} />
//
// Add to nav (Dashboard.tsx etc) or account settings link:
//   <Link to="/account/2fa">Security</Link>

import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Nav from '../components/Nav'
import { supabase } from '../context/AuthContext'

type Step = 'check' | 'already_enabled' | 'enroll' | 'verify' | 'success'

export default function TwoFactorSetup() {

  const navigate = useNavigate()

  const [step, setStep]           = useState<Step>('check')
  const [qrCode, setQrCode]       = useState('')
  const [secret, setSecret]       = useState('')
  const [factorId, setFactorId]   = useState('')
  const [code, setCode]           = useState('')
  const [error, setError]         = useState('')
  const [loading, setLoading]     = useState(false)

  // ── On mount: check if 2FA already enrolled ───────────────────────────────
  useEffect(() => {
    const checkMFA = async () => {
      const { data } = await supabase.auth.mfa.listFactors()
      const verified = data?.totp?.find(f => f.status === 'verified')
      if (verified) {
        setStep('already_enabled')
      } else {
        setStep('enroll')
        startEnrollment()
      }
    }
    checkMFA()
  }, [])

  // ── ITP126ON4-108: enroll() to generate TOTP secret + QR code ────────────
  const startEnrollment = async () => {
    setLoading(true)
    setError('')
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp' })
    if (error || !data) {
      setError(error?.message || 'Failed to start 2FA setup')
      setLoading(false)
      return
    }
    setFactorId(data.id)
    setQrCode(data.totp.qr_code)   // ITP126ON4-109: QR code for scanning
    setSecret(data.totp.secret)    // backup manual entry
    setStep('enroll')
    setLoading(false)
  }

  // ── ITP126ON4-110 + 111: verify TOTP code to activate 2FA ────────────────
  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (!code || code.length !== 6) {
      setError('Please enter the 6-digit code from your authenticator app.')
      setLoading(false)
      return
    }

    // Challenge then verify
    const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({ factorId })
    if (challengeError || !challengeData) {
      setError(challengeError?.message || 'Challenge failed')
      setLoading(false)
      return
    }

    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId,
      challengeId: challengeData.id,
      code
    })

    if (verifyError) {
      setError('Invalid code — please check your authenticator app and try again.')
      setLoading(false)
      return
    }

    setStep('success')
    setLoading(false)
  }

  // ── Disable 2FA (unenroll) ────────────────────────────────────────────────
  const handleDisable = async () => {
    if (!confirm('Are you sure you want to disable two-factor authentication? This will make your account less secure.')) return
    setLoading(true)
    const { data } = await supabase.auth.mfa.listFactors()
    const factor = data?.totp?.[0]
    if (factor) {
      await supabase.auth.mfa.unenroll({ factorId: factor.id })
    }
    setStep('enroll')
    startEnrollment()
  }

  // ── render ────────────────────────────────────────────────────────────────

  return (
    <>
      <Nav />

      <div className="container">
        <Link to="/" style={{ color: '#6b7280', fontSize: '0.9rem', textDecoration: 'none', display: 'inline-block', marginBottom: '1rem' }}>
          ← Back to dashboard
        </Link>

        <h1 style={{ marginBottom: '0.25rem' }}>Two-factor authentication</h1>
        <p style={{ color: '#6b7280', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
          Add an extra layer of security to your account using an authenticator app.
        </p>

        {/* ── Already enabled ── */}
        {step === 'already_enabled' && (
          <div className="card" style={{ maxWidth: '480px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <span style={{ fontSize: '1.5rem' }}>🔒</span>
              <div>
                <p style={{ fontWeight: 600, color: '#15803d' }}>2FA is enabled</p>
                <p style={{ fontSize: '0.85rem', color: '#6b7280' }}>Your account is protected with an authenticator app.</p>
              </div>
            </div>
            <button className="danger" onClick={handleDisable} disabled={loading} style={{ fontSize: '0.85rem' }}>
              {loading ? 'Disabling...' : 'Disable 2FA'}
            </button>
          </div>
        )}

        {/* ── Loading / checking ── */}
        {step === 'check' && (
          <div className="card" style={{ maxWidth: '480px' }}>
            <p style={{ color: '#6b7280' }}>Loading...</p>
          </div>
        )}

        {/* ── Enroll: show QR code ── */}
        {step === 'enroll' && (
          <div className="card" style={{ maxWidth: '480px' }}>
            {loading ? (
              <p style={{ color: '#6b7280' }}>Setting up 2FA...</p>
            ) : (
              <>
                <h2 style={{ marginBottom: '1rem' }}>Step 1 — Scan QR code</h2>
                <p style={{ fontSize: '0.9rem', color: '#374151', marginBottom: '1rem' }}>
                  Open your authenticator app (Google Authenticator, Authy, etc.) and scan this QR code:
                </p>

                {/* ITP126ON4-109: QR code display */}
                {qrCode && (
                  <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
                    <img
                      src={qrCode}
                      alt="2FA QR code"
                      style={{ width: 180, height: 180, border: '4px solid #e5e7eb', borderRadius: '8px' }}
                    />
                  </div>
                )}

                {/* Manual entry fallback */}
                {secret && (
                  <details style={{ marginBottom: '1.25rem' }}>
                    <summary style={{ fontSize: '0.85rem', color: '#6b7280', cursor: 'pointer', marginBottom: '0.5rem' }}>
                      Can't scan? Enter code manually
                    </summary>
                    <div style={{
                      background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '6px',
                      padding: '0.5rem 0.75rem', fontFamily: 'monospace', fontSize: '0.9rem',
                      letterSpacing: '0.1em', wordBreak: 'break-all', color: '#111827'
                    }}>
                      {secret}
                    </div>
                  </details>
                )}

                <h2 style={{ marginBottom: '0.75rem' }}>Step 2 — Enter confirmation code</h2>
                <p style={{ fontSize: '0.9rem', color: '#374151', marginBottom: '1rem' }}>
                  Enter the 6-digit code shown in your authenticator app to confirm setup:
                </p>

                {error && <p className="error" style={{ marginBottom: '0.75rem' }}>{error}</p>}

                {/* ITP126ON4-110: TOTP code input */}
                <form onSubmit={handleVerify}>
                  <div className="form-group">
                    <label>6-digit code *</label>
                    <input
                      type="text"
                      value={code}
                      onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="000000"
                      maxLength={6}
                      style={{ letterSpacing: '0.3em', fontSize: '1.25rem', textAlign: 'center' }}
                      autoComplete="one-time-code"
                      required
                    />
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button type="submit" disabled={loading || code.length !== 6}>
                      {loading ? 'Verifying...' : 'Activate 2FA'}
                    </button>
                    <button type="button" className="secondary" onClick={() => navigate('/')}>
                      Cancel
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        )}

        {/* ── Success ── */}
        {step === 'success' && (
          <div className="card" style={{ maxWidth: '480px', textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎉</div>
            <h2 style={{ marginBottom: '0.5rem' }}>2FA activated!</h2>
            <p style={{ color: '#6b7280', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
              Your account is now protected. You'll be asked for a code from your authenticator app each time you sign in.
            </p>
            <button onClick={() => navigate('/')} style={{ width: '100%' }}>
              Back to dashboard
            </button>
          </div>
        )}
      </div>
    </>
  )
}