import { useEffect, useMemo, useState } from 'react'
import { apiGet, apiPost } from '../../lib/api'
import { setSession } from '../../lib/session'
import { BusinessDetailsForm } from './BusinessDetailsForm'
import { ContactForm } from './ContactForm'
import { DescriptionBox } from './DescriptionBox'
import { LocationForm } from './LocationForm'
import { ProfilePreviewCard } from './ProfilePreviewCard'
import { PublicVisibilityControls } from './PublicVisibilityControls'
import { emptyProfile, normalizeProfile } from './constants'

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim())
}

function isValidPhone(value) {
  return /^\+?[0-9()\-.\s]{7,20}$/.test(String(value || '').trim())
}

function isValidWebsite(value) {
  if (!String(value || '').trim()) return true
  try {
    const raw = String(value).trim()
    const normalized = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`
    const parsed = new URL(normalized)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

function normalizeWebsite(value) {
  const raw = String(value || '').trim()
  if (!raw) return ''
  return /^https?:\/\//i.test(raw) ? raw : `https://${raw}`
}

function validateForm(values) {
  const errors = {}

  if (!String(values.businessName || '').trim()) errors.businessName = 'Business name is required'

  const businessEmail = String(values.businessEmail || '').trim()
  if (!businessEmail) errors.businessEmail = 'Business email is required'
  else if (!isValidEmail(businessEmail)) errors.businessEmail = 'Please enter a valid email address'

  if (!String(values.businessCategory || '').trim()) {
    errors.businessCategory = 'Business category is required'
  }

  if (!isValidWebsite(values.businessWebsite)) {
    errors.businessWebsite = 'Please provide a valid website URL'
  }

  if (!String(values.country || '').trim()) errors.country = 'Country is required'
  if (!String(values.city || '').trim()) errors.city = 'City is required'

  const phone = String(values.phoneNumber || '').trim()
  if (phone && !isValidPhone(phone)) errors.phoneNumber = 'Please enter a valid phone number'

  const supportEmail = String(values.supportEmail || '').trim()
  if (supportEmail && !isValidEmail(supportEmail)) errors.supportEmail = 'Please enter a valid support email'

  if (String(values.businessId || '').trim().length > 120) {
    errors.businessId = 'Business ID is too long'
  }

  if (String(values.description || '').trim().length > 1500) {
    errors.description = 'Description must be 1500 characters or less'
  }

  return errors
}

function ProfileIcon({ kind }) {
  if (kind === 'business') {
    return (
      <svg className="tw-h-5 tw-w-5 tw-block" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <rect x="4" y="4" width="16" height="16" rx="2.5" stroke="currentColor" strokeWidth="1.9" />
        <path d="M8 9h8M8 13h8M8 17h5" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
      </svg>
    )
  }

  if (kind === 'location') {
    return (
      <svg className="tw-h-5 tw-w-5 tw-block" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M12 21s7-5.8 7-11a7 7 0 10-14 0c0 5.2 7 11 7 11z" stroke="currentColor" strokeWidth="1.9" strokeLinejoin="round" />
        <circle cx="12" cy="10" r="2.4" stroke="currentColor" strokeWidth="1.9" />
      </svg>
    )
  }

  if (kind === 'contact') {
    return (
      <svg className="tw-h-5 tw-w-5 tw-block" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="8.5" r="3" stroke="currentColor" strokeWidth="1.9" />
        <path d="M5 19a7 7 0 0114 0" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
      </svg>
    )
  }

  if (kind === 'description') {
    return (
      <svg className="tw-h-5 tw-w-5 tw-block" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M5 6h14v12H8l-3 3V6z" stroke="currentColor" strokeWidth="1.9" strokeLinejoin="round" />
        <path d="M9 10h7M9 14h5" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
      </svg>
    )
  }

  if (kind === 'preview') {
    return (
      <svg className="tw-h-5 tw-w-5 tw-block" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M2.5 12s3.4-6 9.5-6 9.5 6 9.5 6-3.4 6-9.5 6-9.5-6-9.5-6z" stroke="currentColor" strokeWidth="1.9" strokeLinejoin="round" />
        <circle cx="12" cy="12" r="2.4" stroke="currentColor" strokeWidth="1.9" />
      </svg>
    )
  }

  if (kind === 'visibility') {
    return (
      <svg className="tw-h-5 tw-w-5 tw-block" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M2.5 12s3.4-6 9.5-6 9.5 6 9.5 6-3.4 6-9.5 6-9.5-6-9.5-6z" stroke="currentColor" strokeWidth="1.9" strokeLinejoin="round" />
        <circle cx="12" cy="12" r="2.4" stroke="currentColor" strokeWidth="1.9" />
      </svg>
    )
  }

  return (
    <svg className="tw-h-5 tw-w-5 tw-block" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="4" y="4" width="16" height="16" rx="3" stroke="currentColor" strokeWidth="1.9" />
      <path d="M8 12h8M12 8v8" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
    </svg>
  )
}

function SectionCard({ title, subtitle, icon, children }) {
  return (
    <section className="vendorProfileCard tw-rounded-2xl tw-border tw-border-slate-200 tw-bg-white tw-p-5 tw-shadow-soft">
      <header className="tw-mb-4 tw-flex tw-items-start tw-gap-3">
        <div className="tw-flex tw-h-10 tw-w-10 tw-shrink-0 tw-items-center tw-justify-center tw-overflow-hidden tw-rounded-xl tw-bg-cyan-50 tw-text-cyan-700">
          <ProfileIcon kind={icon} />
        </div>
        <div>
          <h3 className="tw-text-base tw-font-bold tw-text-slate-800">{title}</h3>
          {subtitle ? <p className="tw-text-sm tw-text-slate-500">{subtitle}</p> : null}
        </div>
      </header>
      {children}
    </section>
  )
}

function LoadingSkeleton() {
  return (
    <div className="tw-grid tw-gap-4" aria-hidden="true">
      <div className="tw-h-28 tw-animate-pulse tw-rounded-2xl tw-border tw-border-slate-200 tw-bg-slate-100" />
      <div className="tw-h-44 tw-animate-pulse tw-rounded-2xl tw-border tw-border-slate-200 tw-bg-slate-100" />
      <div className="tw-h-44 tw-animate-pulse tw-rounded-2xl tw-border tw-border-slate-200 tw-bg-slate-100" />
    </div>
  )
}

export function ProfilePage({
  vendorId,
  initialProfile = null,
  overviewTrustScore = null,
  onProfileSaved = () => {},
}) {
  const [form, setForm] = useState(() =>
    initialProfile ? normalizeProfile(initialProfile, overviewTrustScore) : emptyProfile()
  )
  const [savedSnapshot, setSavedSnapshot] = useState(() =>
    initialProfile ? normalizeProfile(initialProfile, overviewTrustScore) : emptyProfile()
  )
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(() => !initialProfile)
  const [saving, setSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  const hasUnsavedChanges = useMemo(
    () => JSON.stringify(form) !== JSON.stringify(savedSnapshot),
    [form, savedSnapshot]
  )

  useEffect(() => {
    if (!initialProfile) return

    const normalized = normalizeProfile(initialProfile, overviewTrustScore)
    setForm(normalized)
    setSavedSnapshot(normalized)
    setLoading(false)
  }, [initialProfile, overviewTrustScore])

  useEffect(() => {
    if (!vendorId) return undefined
    if (initialProfile) return undefined

    let cancelled = false

    async function loadProfile() {
      setLoading(true)
      setErrorMessage('')

      try {
        const data = await apiGet(`/api/vendor/${vendorId}/profile`)
        if (cancelled) return

        const normalized = normalizeProfile(data?.profile, overviewTrustScore)
        setForm(normalized)
        setSavedSnapshot(normalized)
      } catch (error) {
        if (cancelled) return
        setErrorMessage(error?.message || 'Failed to load vendor profile')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadProfile()

    return () => {
      cancelled = true
    }
  }, [vendorId, overviewTrustScore, initialProfile])

  function updateField(field, value) {
    setForm((state) => ({ ...state, [field]: value }))
    setErrors((state) => ({ ...state, [field]: '' }))
    setSuccessMessage('')
    setErrorMessage('')
  }

  function updateVisibilityField(field, value) {
    setForm((state) => ({
      ...state,
      publicVisibility: {
        ...(state.publicVisibility || {}),
        [field]: Boolean(value),
      },
    }))
    setSuccessMessage('')
    setErrorMessage('')
  }

  async function handleSave() {
    const nextErrors = validateForm(form)
    setErrors(nextErrors)
    setSuccessMessage('')
    setErrorMessage('')

    if (Object.keys(nextErrors).length) return

    try {
      setSaving(true)
      const payload = {
        ...form,
        businessWebsite: normalizeWebsite(form.businessWebsite),
      }
      const data = await apiPost(`/api/vendor/${vendorId}/profile`, payload)

      const normalized = normalizeProfile(data?.profile, overviewTrustScore)
      setForm(normalized)
      setSavedSnapshot(normalized)
      setSuccessMessage(data?.message || 'Profile updated successfully')

      if (data?.token && data?.user) {
        setSession({ token: data.token, user: data.user })
      }

      onProfileSaved(normalized, data?.user)
    } catch (error) {
      setErrorMessage(error?.message || 'Failed to save profile')
    } finally {
      setSaving(false)
    }
  }

  function handleCancel() {
    setForm(savedSnapshot)
    setErrors({})
    setSuccessMessage('Changes discarded')
    setErrorMessage('')
  }

  const previewTrustScore = Number.isFinite(Number(form.trustScore))
    ? Number(form.trustScore)
    : Number(overviewTrustScore)

  if (loading) {
    return <LoadingSkeleton />
  }

  return (
    <div className="vendorProfilePage tw-grid tw-gap-4">
      <section className="vendorProfileCard tw-rounded-2xl tw-border tw-border-slate-200 tw-bg-white tw-p-5 tw-shadow-soft">
        <div className="tw-flex tw-flex-wrap tw-items-start tw-justify-between tw-gap-3">
          <div>
            <h2 className="tw-text-xl tw-font-extrabold tw-text-slate-900">Vendor Profile</h2>
            <p className="tw-mt-1 tw-text-sm tw-text-slate-500">
              Manage your business identity and contact information.
            </p>
          </div>
          <span
            className={`tw-rounded-full tw-border tw-px-3 tw-py-1 tw-text-xs tw-font-semibold ${
              hasUnsavedChanges
                ? 'tw-border-amber-200 tw-bg-amber-50 tw-text-amber-700'
                : 'tw-border-emerald-200 tw-bg-emerald-50 tw-text-emerald-700'
            }`}
          >
            {hasUnsavedChanges ? 'Unsaved changes' : 'All changes saved'}
          </span>
        </div>
      </section>

      {errorMessage ? (
        <div className="tw-rounded-xl tw-border tw-border-rose-200 tw-bg-rose-50 tw-p-3 tw-text-sm tw-font-medium tw-text-rose-700">
          {errorMessage}
        </div>
      ) : null}

      {successMessage ? (
        <div className="tw-rounded-xl tw-border tw-border-emerald-200 tw-bg-emerald-50 tw-p-3 tw-text-sm tw-font-medium tw-text-emerald-700">
          {successMessage}
        </div>
      ) : null}

      <div className="tw-grid tw-gap-4 xl:tw-grid-cols-3">
        <div className="tw-grid tw-gap-4 xl:tw-col-span-2">
          <SectionCard
            title="Business Details"
            subtitle="Core business identity and registration information"
            icon="business"
          >
            <BusinessDetailsForm values={form} errors={errors} onFieldChange={updateField} />
          </SectionCard>

          <SectionCard
            title="Location Details"
            subtitle="Where your business operates"
            icon="location"
          >
            <LocationForm values={form} errors={errors} onFieldChange={updateField} />
          </SectionCard>

          <SectionCard
            title="Contact Information"
            subtitle="Help customers and partners reach the right person"
            icon="contact"
          >
            <ContactForm values={form} errors={errors} onFieldChange={updateField} />
          </SectionCard>

          <SectionCard
            title="Business Description"
            subtitle="Short, clear summary of your products or services"
            icon="description"
          >
            <DescriptionBox
              value={form.description}
              error={errors.description}
              onChange={(value) => updateField('description', value)}
            />
          </SectionCard>
        </div>

        <div className="tw-grid tw-gap-4 tw-content-start">
          <SectionCard
            title="Public Profile Visibility"
            subtitle="Choose what users can see on your public profile"
            icon="visibility"
          >
            <PublicVisibilityControls
              visibility={form.publicVisibility}
              onToggle={updateVisibilityField}
            />
          </SectionCard>

          <SectionCard
            title="Public Profile Preview"
            subtitle="How your vendor profile appears to users"
            icon="preview"
          >
            <ProfilePreviewCard
              values={form}
              trustScore={previewTrustScore}
              visibility={form.publicVisibility}
            />
          </SectionCard>

          <section className="vendorProfileCard tw-rounded-2xl tw-border tw-border-slate-200 tw-bg-slate-50 tw-p-4 tw-shadow-soft">
            <h3 className="tw-text-sm tw-font-bold tw-text-slate-800">Quick Tips</h3>
            <ul className="tw-mt-2 tw-grid tw-gap-2 tw-text-xs tw-text-slate-600">
              <li>Use a support email customers actively monitor.</li>
              <li>Keep your business description concise and trustworthy.</li>
              <li>Set accurate location details for profile credibility.</li>
            </ul>
          </section>
        </div>
      </div>

      <section className="vendorProfileCard tw-rounded-2xl tw-border tw-border-slate-200 tw-bg-white tw-p-4 tw-shadow-soft">
        <div className="tw-flex tw-flex-wrap tw-items-center tw-justify-end tw-gap-2">
          <button
            type="button"
            className="tw-rounded-xl tw-border tw-border-slate-300 tw-bg-white tw-px-4 tw-py-2 tw-text-sm tw-font-semibold tw-text-slate-700 hover:tw-bg-slate-50"
            onClick={handleCancel}
            disabled={!hasUnsavedChanges || saving}
          >
            Cancel
          </button>
          <button
            type="button"
            className="tw-rounded-xl tw-border tw-border-cyan-600 tw-bg-cyan-600 tw-px-4 tw-py-2 tw-text-sm tw-font-semibold tw-text-white hover:tw-bg-cyan-700 disabled:tw-cursor-not-allowed disabled:tw-opacity-60"
            onClick={handleSave}
            disabled={!hasUnsavedChanges || saving}
          >
            {saving ? 'Saving Changes...' : 'Save Changes'}
          </button>
        </div>
      </section>
    </div>
  )
}
