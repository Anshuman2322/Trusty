import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiPost } from '../../lib/api'
import { OTPInput } from '../OTPInput'
import { CheckboxField } from './CheckboxField'
import { InputField } from './InputField'
import { SelectField } from './SelectField'

const CATEGORY_OPTIONS = [
  { label: 'Electronics', value: 'Electronics' },
  { label: 'Services', value: 'Services' },
  { label: 'Retail', value: 'Retail' },
  { label: 'Food', value: 'Food' },
  { label: 'Pharmaceutical Exporter', value: 'Pharmaceutical Exporter' },
  { label: 'General Store', value: 'General Store' },
  { label: 'Pharmacy', value: 'Pharmacy' },
  { label: 'Healthcare', value: 'Healthcare' },
  { label: 'AI Engineer', value: 'AI Engineer' },
  { label: 'Developer', value: 'Developer' },
  { label: 'DevOps Engineer', value: 'DevOps Engineer' },
  { label: 'Freelancer', value: 'Freelancer' },
  { label: 'Other', value: 'Other' },
]

const INITIAL_FORM = {
  businessName: '',
  email: '',
  password: '',
  confirmPassword: '',
  category: 'Electronics',
  country: '',
  city: '',
  termsAccepted: false,
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim())
}

function validate(form) {
  const errors = {}

  if (!String(form.businessName || '').trim()) {
    errors.businessName = 'Business name is required'
  }

  const email = String(form.email || '').trim()
  if (!email) errors.email = 'Business email is required'
  else if (!isValidEmail(email)) errors.email = 'Please enter a valid email address'

  const password = String(form.password || '')
  if (!password) errors.password = 'Password is required'
  else if (password.length < 6) errors.password = 'Password must be at least 6 characters'

  const confirmPassword = String(form.confirmPassword || '')
  if (!confirmPassword) errors.confirmPassword = 'Please confirm your password'
  else if (confirmPassword !== password) errors.confirmPassword = 'Passwords do not match'

  if (!String(form.country || '').trim()) errors.country = 'Country is required'
  if (!form.termsAccepted) errors.termsAccepted = 'You must agree to the platform rules'

  return errors
}

export function SignupForm() {
  const navigate = useNavigate()
  const [form, setForm] = useState(INITIAL_FORM)
  const [touched, setTouched] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [otpValue, setOtpValue] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const [otpSending, setOtpSending] = useState(false)
  const [otpVerifying, setOtpVerifying] = useState(false)
  const [otpVerified, setOtpVerified] = useState(false)
  const [verificationToken, setVerificationToken] = useState('')
  const [otpError, setOtpError] = useState('')
  const [otpSuccess, setOtpSuccess] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const errors = useMemo(() => validate(form), [form])
  const isFormValid = Object.keys(errors).length === 0

  function setField(field, value) {
    const nextValue = field === 'email' ? String(value || '').trim() : value

    setForm((prev) => ({ ...prev, [field]: value }))
    setSubmitError('')

    if (field === 'email') {
      setOtpSent(false)
      setOtpVerified(false)
      setOtpValue('')
      setVerificationToken('')
      setOtpError('')
      setOtpSuccess('')

      if (!nextValue) return
    }
  }

  function markTouched(field) {
    setTouched((prev) => ({ ...prev, [field]: true }))
  }

  function fieldError(name) {
    return touched[name] ? errors[name] : ''
  }

  async function sendOtp() {
    const email = String(form.email || '').trim().toLowerCase()
    if (!isValidEmail(email)) {
      setTouched((prev) => ({ ...prev, email: true }))
      setOtpError('Please enter a valid business email before sending OTP.')
      setOtpSuccess('')
      return
    }

    try {
      setOtpSending(true)
      setOtpError('')
      setOtpSuccess('')
      setOtpVerified(false)
      setVerificationToken('')
      setOtpValue('')

      await apiPost('/api/auth/send-otp', {
        email,
        purpose: 'SIGNUP',
      })

      setOtpSent(true)
      setOtpSuccess('Verification code sent to your email. It is valid for 5 minutes.')
    } catch (error) {
      setOtpError(error?.message || 'Failed to send OTP')
    } finally {
      setOtpSending(false)
    }
  }

  async function verifyOtp() {
    const email = String(form.email || '').trim().toLowerCase()
    if (!otpSent) return
    if (String(otpValue || '').length !== 6) {
      setOtpError('Please enter the 6-digit OTP.')
      setOtpSuccess('')
      return
    }

    try {
      setOtpVerifying(true)
      setOtpError('')
      setOtpSuccess('')

      const data = await apiPost('/api/auth/verify-otp', {
        email,
        otp: otpValue,
        purpose: 'SIGNUP',
      })

      setOtpVerified(true)
      setVerificationToken(String(data?.verificationToken || ''))
      setOtpSuccess('Email verified successfully. You can now create your account.')
    } catch (error) {
      setOtpVerified(false)
      setVerificationToken('')
      setOtpError(error?.message || 'OTP verification failed')
    } finally {
      setOtpVerifying(false)
    }
  }

  async function onSubmit(event) {
    event.preventDefault()

    if (!isFormValid) {
      setTouched({
        businessName: true,
        email: true,
        password: true,
        confirmPassword: true,
        category: true,
        country: true,
        city: true,
        termsAccepted: true,
      })
      return
    }

    try {
      setSubmitting(true)
      setSubmitError('')

      const payload = {
        businessName: String(form.businessName || '').trim(),
        email: String(form.email || '').trim().toLowerCase(),
        password: form.password,
        category: form.category,
        country: String(form.country || '').trim(),
        city: String(form.city || '').trim(),
        verificationToken,
      }

      const data = await apiPost('/api/auth/vendor-signup', payload)

      navigate('/vendor/login', {
        replace: true,
        state: {
          signupEmail: payload.email,
          signupSuccessMessage:
            data.onboardingMessage || 'Account created successfully. Please login to continue.',
        },
      })
    } catch (error) {
      setSubmitError(error?.message || 'Signup failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form className="tw-grid tw-gap-4" onSubmit={onSubmit} noValidate>
      {submitError ? <div className="alert error">{submitError}</div> : null}

      <section className="tw-grid tw-gap-3">
        <div>
          <h2 className="tw-text-sm tw-font-bold tw-text-slate-800">Step 1: Basic Details</h2>
        </div>

        <InputField
          name="businessName"
          label="Business Name"
          value={form.businessName}
          onChange={(event) => setField('businessName', event.target.value)}
          onBlur={() => markTouched('businessName')}
          placeholder="Acme Retail Pvt Ltd"
          autoComplete="organization"
          required
          error={fieldError('businessName')}
        />

        <InputField
          name="email"
          label="Business Email"
          type="email"
          value={form.email}
          onChange={(event) => setField('email', event.target.value)}
          onBlur={() => markTouched('email')}
          placeholder="owner@business.com"
          autoComplete="email"
          helper="Use your official business email address."
          required
          error={fieldError('email')}
        />

        <div className="tw-flex tw-flex-wrap tw-items-center tw-gap-2">
          <button
            type="button"
            className="btn secondary tw-min-h-[40px]"
            onClick={sendOtp}
            disabled={otpSending || submitting}
          >
            {otpSending ? 'Sending OTP...' : otpVerified ? 'Resend OTP' : 'Send OTP'}
          </button>
          <span className="tw-text-xs tw-text-slate-500">We send a 6-digit verification code to your email.</span>
        </div>

        {otpError ? <div className="alert error">{otpError}</div> : null}
        {otpSuccess ? <div className="alert">{otpSuccess}</div> : null}

        {otpSent ? (
          <div className="tw-grid tw-gap-2 tw-rounded-lg tw-border tw-border-slate-200 tw-bg-slate-50 tw-p-3">
            <p className="tw-text-sm tw-font-semibold tw-text-slate-700">Enter OTP</p>
            <OTPInput
              value={otpValue}
              onChange={setOtpValue}
              autoFocus
              disabled={otpVerifying || submitting}
            />
            <button
              type="button"
              className="btn secondary tw-w-fit tw-min-h-[40px]"
              onClick={verifyOtp}
              disabled={otpVerifying || submitting || otpValue.length !== 6}
            >
              {otpVerifying ? 'Verifying...' : otpVerified ? 'Verified' : 'Verify OTP'}
            </button>
          </div>
        ) : null}

        <InputField
          name="password"
          label="Password"
          type={showPassword ? 'text' : 'password'}
          value={form.password}
          onChange={(event) => setField('password', event.target.value)}
          onBlur={() => markTouched('password')}
          placeholder="Minimum 6 characters"
          autoComplete="new-password"
          helper="At least 6 characters."
          required
          error={fieldError('password')}
          rightElement={(
            <button
              type="button"
              className="tw-text-xs tw-font-semibold tw-text-cyan-700 hover:tw-text-cyan-800"
              onClick={() => setShowPassword((prev) => !prev)}
            >
              {showPassword ? 'Hide' : 'Show'}
            </button>
          )}
        />

        <InputField
          name="confirmPassword"
          label="Confirm Password"
          type={showConfirmPassword ? 'text' : 'password'}
          value={form.confirmPassword}
          onChange={(event) => setField('confirmPassword', event.target.value)}
          onBlur={() => markTouched('confirmPassword')}
          placeholder="Re-enter password"
          autoComplete="new-password"
          required
          error={fieldError('confirmPassword')}
          rightElement={(
            <button
              type="button"
              className="tw-text-xs tw-font-semibold tw-text-cyan-700 hover:tw-text-cyan-800"
              onClick={() => setShowConfirmPassword((prev) => !prev)}
            >
              {showConfirmPassword ? 'Hide' : 'Show'}
            </button>
          )}
        />
      </section>

      <section className="tw-grid tw-gap-3 tw-border-t tw-border-slate-200 tw-pt-3">
        <div>
          <h2 className="tw-text-sm tw-font-bold tw-text-slate-800">Step 2: Business Info</h2>
        </div>

        <SelectField
          name="category"
          label="Business Category"
          value={form.category}
          onChange={(event) => setField('category', event.target.value)}
          onBlur={() => markTouched('category')}
          options={CATEGORY_OPTIONS}
          helper="Choose the category that best describes your business."
        />

        <InputField
          name="country"
          label="Country"
          value={form.country}
          onChange={(event) => setField('country', event.target.value)}
          onBlur={() => markTouched('country')}
          placeholder="India"
          required
          error={fieldError('country')}
        />

        <InputField
          name="city"
          label="City"
          value={form.city}
          onChange={(event) => setField('city', event.target.value)}
          onBlur={() => markTouched('city')}
          placeholder="Optional"
        />
      </section>

      <section className="tw-grid tw-gap-2 tw-rounded-lg tw-border tw-border-slate-200 tw-bg-slate-50 tw-p-3">
        <p className="tw-text-sm tw-font-bold tw-text-slate-800">Trusty Platform Rules:</p>
        <ul className="tw-grid tw-gap-1 tw-pl-4 tw-text-sm tw-text-slate-600">
          <li>Vendors cannot edit customer feedback</li>
          <li>Vendors cannot delete reviews</li>
          <li>Trust scores are system generated</li>
        </ul>
      </section>

      <CheckboxField
        name="termsAccepted"
        checked={form.termsAccepted}
        onChange={(event) => setField('termsAccepted', event.target.checked)}
        onBlur={() => markTouched('termsAccepted')}
        label="I agree to the platform rules"
        error={fieldError('termsAccepted')}
      />

      <button
        type="submit"
        className="btn tw-w-full tw-rounded-lg tw-py-3 tw-text-base tw-font-semibold"
        disabled={!isFormValid || !otpVerified || !verificationToken || submitting}
      >
        {submitting ? 'Creating account...' : 'Create Vendor Account'}
      </button>

      {!otpVerified ? (
        <p className="tw-text-center tw-text-xs tw-text-slate-500">Please verify your email OTP before creating account.</p>
      ) : null}
    </form>
  )
}
