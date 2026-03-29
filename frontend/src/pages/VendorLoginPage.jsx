import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { apiPost } from '../lib/api'
import { getSession, setSession } from '../lib/session'
import { VendorAuthCard } from '../components/VendorAuthCard'
import { FormInput } from '../components/FormInput'
import { OTPInput } from '../components/OTPInput'

function isAuthedVendor(session) {
  return Boolean(session?.token) && session?.user?.role === 'VENDOR' && Boolean(session?.user?.vendorId)
}

export function VendorLoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [form, setForm] = useState(() => ({
    email: String(location.state?.signupEmail || ''),
    password: '',
  }))
  const [errors, setErrors] = useState({})
  const [submitError, setSubmitError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [otpSent, setOtpSent] = useState(false)
  const [otpValue, setOtpValue] = useState('')
  const signupSuccessMessage = String(location.state?.signupSuccessMessage || '')
  const sessionMessage = String(location.state?.sessionMessage || '')

  const session = getSession()
  if (isAuthedVendor(session)) {
    return <Navigate to="/vendor/dashboard" replace />
  }

  function updateField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }))
    setErrors((prev) => ({ ...prev, [field]: '' }))
    setSubmitError('')
  }

  async function onSubmit(event) {
    event.preventDefault()
    const nextErrors = {}
    if (!String(form.email || '').trim()) nextErrors.email = 'Email is required'
    if (!String(form.password || '')) nextErrors.password = 'Password is required'

    setErrors(nextErrors)
    setSubmitError('')
    setSuccessMessage('')
    if (Object.keys(nextErrors).length) return

    try {
      setSubmitting(true)
      const data = await apiPost('/api/vendor/login', {
        email: String(form.email || '').trim(),
        password: form.password,
        ...(otpSent ? { otp: otpValue } : {}),
      })

      if (data?.requiresOtp) {
        setOtpSent(true)
        setOtpValue('')
        setSuccessMessage(data?.message || 'OTP sent. Enter it to continue.')
        return
      }

      setSession({ token: data.token, user: data.user })
      const returnTo = String(location.state?.from || '/vendor/dashboard')
      navigate(returnTo.startsWith('/vendor') ? returnTo : '/vendor/dashboard', { replace: true })
    } catch (error) {
      setSubmitError(error?.message || 'Login failed')
    } finally {
      setSubmitting(false)
    }
  }

  async function onResendOtp() {
    try {
      setSubmitting(true)
      setSubmitError('')
      setSuccessMessage('')

      const data = await apiPost('/api/vendor/login', {
        email: String(form.email || '').trim(),
        password: form.password,
      })

      if (data?.requiresOtp) {
        setOtpSent(true)
        setOtpValue('')
        setSuccessMessage(data?.message || 'A new OTP has been sent to your email.')
      }
    } catch (error) {
      setSubmitError(error?.message || 'Failed to resend OTP')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <VendorAuthCard
      title="Vendor Login"
      subtitle="Public is free; vendor dashboard requires login."
      footer={(
        <span>
          New vendor? <Link className="vendorAuthLink" to="/vendor/signup">Create your account</Link>
        </span>
      )}
      badgeText="Vendor Login"
    >
      {signupSuccessMessage ? <div className="alert">{signupSuccessMessage}</div> : null}
      {sessionMessage ? <div className="alert">{sessionMessage}</div> : null}
      {successMessage ? <div className="alert">{successMessage}</div> : null}
      {submitError ? <div className="alert error">{submitError}</div> : null}

      <form className="vendorAuthForm" onSubmit={onSubmit} noValidate>
        <FormInput
          name="email"
          label="Email"
          type="email"
          value={form.email}
          onChange={(event) => updateField('email', event.target.value)}
          placeholder="vendor.tech@trustlens.local"
          autoComplete="email"
          required
          error={errors.email}
        />

        <FormInput
          name="password"
          label="Password"
          type="password"
          value={form.password}
          onChange={(event) => updateField('password', event.target.value)}
          placeholder="Vendor123"
          autoComplete="current-password"
          required
          error={errors.password}
        />

        {otpSent ? (
          <div className="card" style={{ borderRadius: 12, border: '1px solid #d7e3ef', padding: 12, display: 'grid', gap: 10 }}>
            <strong style={{ fontSize: '0.9rem' }}>Email OTP</strong>
            <OTPInput
              value={otpValue}
              onChange={(value) => {
                setOtpValue(value)
                setSubmitError('')
              }}
              autoFocus
              disabled={submitting}
            />
            <div style={{ fontSize: '0.82rem', color: '#475569' }}>
              Enter the 6-digit code sent to your email to finish login.
            </div>
          </div>
        ) : null}

        <div className="vendorAuthActions">
          <Link to="/vendor/forgot-password" className="vendorAuthLink">
            Forgot Password?
          </Link>
          {otpSent ? (
            <button type="button" className="btn secondary" onClick={onResendOtp} disabled={submitting}>
              Resend OTP
            </button>
          ) : null}
          <button type="submit" className="btn" disabled={submitting || (otpSent && otpValue.length !== 6)}>
            {submitting ? (
              <span className="vendorBtnLoading">
                <span className="vendorBtnSpinner" aria-hidden="true" />
                <span>{otpSent ? 'Verifying OTP...' : 'Signing in securely...'}</span>
              </span>
            ) : otpSent ? 'Verify OTP & Login' : 'Login'}
          </button>
        </div>
      </form>

      <div className="vendorAuthDemo">
        <strong>Demo credentials (after running seed):</strong>
        <div>
          <a className="vendorAuthLink" href="mailto:vendor.tech@trustlens.local">vendor.tech@trustlens.local</a>
        </div>
        <div>Password: Vendor123</div>
      </div>
    </VendorAuthCard>
  )
}
