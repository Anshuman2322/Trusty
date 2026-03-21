import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiPost } from '../../lib/api'
import { CheckboxField } from './CheckboxField'
import { InputField } from './InputField'
import { SelectField } from './SelectField'

const CATEGORY_OPTIONS = [
  { label: 'Electronics', value: 'Electronics' },
  { label: 'Services', value: 'Services' },
  { label: 'Retail', value: 'Retail' },
  { label: 'Food', value: 'Food' },
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
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const errors = useMemo(() => validate(form), [form])
  const isFormValid = Object.keys(errors).length === 0

  function setField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }))
    setSubmitError('')
  }

  function markTouched(field) {
    setTouched((prev) => ({ ...prev, [field]: true }))
  }

  function fieldError(name) {
    return touched[name] ? errors[name] : ''
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
        termsAccepted: Boolean(form.termsAccepted),
      }

      const data = await apiPost('/api/vendor/signup', payload)

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
        disabled={!isFormValid || submitting}
      >
        {submitting ? 'Creating account...' : 'Create Vendor Account'}
      </button>
    </form>
  )
}
