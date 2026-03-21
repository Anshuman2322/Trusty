import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { apiPost } from '../lib/api'
import { getSession, setSession } from '../lib/session'
import { VendorAuthCard } from '../components/VendorAuthCard'
import { FormInput } from '../components/FormInput'

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
  const [submitting, setSubmitting] = useState(false)
  const signupSuccessMessage = String(location.state?.signupSuccessMessage || '')
  const sessionMessage = String(location.state?.sessionMessage || '')

  const session = getSession()
  if (isAuthedVendor(session)) {
    return <Navigate to="/vendor/dashboard" replace />
  }

  function updateField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }))
    setErrors((prev) => ({ ...prev, [field]: '' }))
  }

  async function onSubmit(event) {
    event.preventDefault()
    const nextErrors = {}
    if (!String(form.email || '').trim()) nextErrors.email = 'Email is required'
    if (!String(form.password || '')) nextErrors.password = 'Password is required'

    setErrors(nextErrors)
    setSubmitError('')
    if (Object.keys(nextErrors).length) return

    try {
      setSubmitting(true)
      const data = await apiPost('/api/vendor/login', {
        email: String(form.email || '').trim(),
        password: form.password,
      })

      setSession({ token: data.token, user: data.user })
      const returnTo = String(location.state?.from || '/vendor/dashboard')
      navigate(returnTo.startsWith('/vendor') ? returnTo : '/vendor/dashboard', { replace: true })
    } catch (error) {
      setSubmitError(error?.message || 'Login failed')
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

        <div className="vendorAuthActions">
          <a
            href="#"
            className="vendorAuthLink"
            onClick={(event) => event.preventDefault()}
          >
            Forgot Password?
          </a>
          <button type="submit" className="btn" disabled={submitting}>
            {submitting ? (
              <span className="vendorBtnLoading">
                <span className="vendorBtnSpinner" aria-hidden="true" />
                <span>Signing in securely...</span>
              </span>
            ) : 'Login'}
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
