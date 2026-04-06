import { useEffect, useMemo, useState } from 'react'
import { apiGet, apiPost } from '../../lib/api'
import { setSession } from '../../lib/session'
import { BusinessDetailsForm } from './BusinessDetailsForm'
import { ContactForm } from './ContactForm'
import { DescriptionBox } from './DescriptionBox'
import { AdditionalInfoBox } from './AdditionalInfoBox'
import { BrandAssetsBox } from './BrandAssetsBox'
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

  const additionalInfoHeading = String(values.additionalInfoHeading || '').trim()
  const additionalInfoResult = String(values.additionalInfoResult || '').trim()

  if (additionalInfoHeading.length > 120) {
    errors.additionalInfoHeading = 'Heading must be 120 characters or less'
  }

  if (additionalInfoResult.length > 1500) {
    errors.additionalInfoResult = 'Result/details must be 1500 characters or less'
  }

  if (additionalInfoResult && !additionalInfoHeading) {
    errors.additionalInfoHeading = 'Please add a heading for this information'
  }

  const businessLogo = String(values.businessLogo || '').trim()
  if (businessLogo && !/^data:image\/(png|svg\+xml);base64,[A-Za-z0-9+/=\s]+$/i.test(businessLogo)) {
    errors.businessLogo = 'Logo must be a valid PNG or SVG file'
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

  if (kind === 'additional') {
    return (
      <svg className="tw-h-5 tw-w-5 tw-block" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M12 8v4m0 4h.01" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
        <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.9" />
      </svg>
    )
  }

  if (kind === 'assets') {
    return (
      <svg className="tw-h-5 tw-w-5 tw-block" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <rect x="4" y="5" width="16" height="14" rx="2.5" stroke="currentColor" strokeWidth="1.9" />
        <path d="M8 14l2.4-2.4a1 1 0 011.4 0L14 14l1.8-1.8a1 1 0 011.4 0L19 14" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="9" cy="10" r="1.2" fill="currentColor" />
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
    <section className="vendorProfileCard tw-rounded-2xl tw-border tw-border-slate-200 tw-bg-white tw-p-4 tw-shadow-soft md:tw-p-5">
      <header className="tw-mb-3 tw-flex tw-items-center tw-gap-3">
        <div className="tw-flex tw-h-10 tw-w-10 tw-shrink-0 tw-items-center tw-justify-center tw-overflow-hidden tw-rounded-xl tw-bg-cyan-50 tw-text-cyan-700">
          <ProfileIcon kind={icon} />
        </div>
        <div className="tw-min-w-0">
          <h3 className="tw-m-0 tw-text-base tw-font-bold tw-leading-6 tw-text-slate-800">{title}</h3>
          {subtitle ? <p className="tw-mb-0 tw-mt-1 tw-text-sm tw-text-slate-500">{subtitle}</p> : null}
        </div>
      </header>
      {children}
    </section>
  )
}

function LoadingSkeleton() {
  return (
    <div className="tw-grid tw-gap-3" aria-hidden="true">
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
  const [showSaveToast, setShowSaveToast] = useState(false)

  const hasUnsavedChanges = useMemo(
    () => JSON.stringify(form) !== JSON.stringify(savedSnapshot),
    [form, savedSnapshot]
  )

  const completion = useMemo(() => {
    const required = [
      'businessName',
      'businessEmail',
      'businessCategory',
      'country',
      'city',
    ]
    const recommended = [
      'businessWebsite',
      'phoneNumber',
      'supportEmail',
      'description',
      'state',
      'contactPersonName',
      'businessId',
    ]

    const hasValue = (key) => Boolean(String(form?.[key] || '').trim())
    const filledRequired = required.filter(hasValue).length
    const filledRecommended = recommended.filter(hasValue).length
    const score = Math.round(((filledRequired + filledRecommended) / (required.length + recommended.length)) * 100)

    const suggestions = []
    if (!hasValue('businessWebsite')) suggestions.push('Add website to improve trust visibility.')
    if (!hasValue('supportEmail')) suggestions.push('Add support email for customer confidence.')
    if (!hasValue('state')) suggestions.push('Complete state details for better location context.')

    return {
      score,
      filledRequired,
      totalRequired: required.length,
      suggestions: suggestions.slice(0, 2),
    }
  }, [form])

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

  useEffect(() => {
    if (!hasUnsavedChanges) return undefined

    const handleBeforeUnload = (event) => {
      event.preventDefault()
      event.returnValue = 'You have unsaved profile changes. Are you sure you want to leave?'
      return event.returnValue
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [hasUnsavedChanges])

  useEffect(() => {
    if (!showSaveToast) return undefined
    const timer = window.setTimeout(() => setShowSaveToast(false), 1800)
    return () => window.clearTimeout(timer)
  }, [showSaveToast])

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

  function handleLogoClear() {
    updateField('businessLogo', '')
  }

  function handleLogoPick(file) {
    if (!file) return

    const allowedTypes = new Set(['image/png', 'image/svg+xml'])
    if (!allowedTypes.has(String(file.type || '').toLowerCase())) {
      setErrors((state) => ({ ...state, businessLogo: 'Only PNG or SVG files are allowed' }))
      setErrorMessage('')
      setSuccessMessage('')
      return
    }

    const maxBytes = 2 * 1024 * 1024
    if (file.size > maxBytes) {
      setErrors((state) => ({ ...state, businessLogo: 'File size must be 2MB or less' }))
      setErrorMessage('')
      setSuccessMessage('')
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      const result = String(reader.result || '')
      if (!result.startsWith('data:image/')) {
        setErrors((state) => ({ ...state, businessLogo: 'Failed to process selected logo' }))
        return
      }
      updateField('businessLogo', result)
    }

    reader.onerror = () => {
      setErrors((state) => ({ ...state, businessLogo: 'Failed to read selected logo' }))
      setErrorMessage('')
      setSuccessMessage('')
    }

    reader.readAsDataURL(file)
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
      setShowSaveToast(true)

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
    if (hasUnsavedChanges) {
      const confirmed = window.confirm('Discard unsaved profile changes?')
      if (!confirmed) return
    }
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
    <div className="vendorProfilePage tw-grid tw-gap-3">
      <section className="vendorProfileCard tw-rounded-2xl tw-border tw-border-slate-200 tw-bg-white tw-pb-4 tw-pr-4 tw-pt-3 tw-pl-3 tw-shadow-soft md:tw-pb-5 md:tw-pr-5 md:tw-pt-3 md:tw-pl-3">
        <div className="tw-flex tw-flex-wrap tw-items-start tw-justify-between tw-gap-3">
          <div className="tw-flex-1 tw-min-w-[260px] tw-text-left">
            <h2 className="tw-m-0 tw-text-xl tw-font-extrabold tw-text-slate-900">Vendor Profile</h2>
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
        <div className="tw-mt-3 tw-w-full">
          <div className="tw-mb-1 tw-flex tw-items-center tw-justify-between tw-text-xs tw-font-semibold tw-text-slate-600">
            <span>Profile {completion.score}% complete</span>
            <span>{completion.filledRequired}/{completion.totalRequired} required</span>
          </div>
          <div className="tw-h-2 tw-w-full tw-overflow-hidden tw-rounded-full tw-bg-slate-200">
            <div
              className="tw-h-full tw-rounded-full tw-bg-cyan-600 tw-transition-all tw-duration-500"
              style={{ width: `${completion.score}%` }}
            />
          </div>
          {completion.suggestions.length ? (
            <ul className="tw-mt-2 tw-grid tw-gap-1 tw-text-xs tw-text-slate-500">
              {completion.suggestions.map((tip) => <li key={tip}>{tip}</li>)}
            </ul>
          ) : null}
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

      <div className="tw-grid tw-gap-3 xl:tw-grid-cols-5">
        <div className="tw-grid tw-content-start tw-gap-3 xl:tw-col-span-3">
          <SectionCard
            title="Brand Assets"
            subtitle="Upload your company logo for profile and public page"
            icon="assets"
          >
            <BrandAssetsBox
              logoValue={form.businessLogo}
              error={errors.businessLogo}
              onPickFile={handleLogoPick}
              onClear={handleLogoClear}
            />
          </SectionCard>

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

          <SectionCard
            title="Additional Category / Information"
            subtitle="Add any custom category with its heading and result details"
            icon="additional"
          >
            <AdditionalInfoBox
              headingValue={form.additionalInfoHeading}
              resultValue={form.additionalInfoResult}
              headingError={errors.additionalInfoHeading}
              resultError={errors.additionalInfoResult}
              onHeadingChange={(value) => updateField('additionalInfoHeading', value)}
              onResultChange={(value) => updateField('additionalInfoResult', value)}
            />
          </SectionCard>
        </div>

        <div className="tw-grid tw-content-start tw-gap-3 xl:tw-col-span-2">
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
            title="Live Preview"
            subtitle="Updates instantly as you edit your profile"
            icon="preview"
          >
            <div className="xl:tw-sticky xl:tw-top-[100px]">
              <ProfilePreviewCard
                values={form}
                trustScore={previewTrustScore}
                visibility={form.publicVisibility}
              />
            </div>
          </SectionCard>

          <section className="vendorProfileCard tw-rounded-2xl tw-border tw-border-slate-200 tw-bg-slate-50 tw-p-3.5 tw-shadow-soft">
            <h3 className="tw-text-sm tw-font-bold tw-text-slate-800">Quick Tips</h3>
            <ul className="tw-mt-1.5 tw-grid tw-gap-1.5 tw-text-xs tw-text-slate-600">
              <li>Use a support email customers actively monitor.</li>
              <li>Keep your business description concise and trustworthy.</li>
              <li>Set accurate location details for profile credibility.</li>
            </ul>
          </section>
        </div>
      </div>

      <section className="vendorProfileCard tw-sticky tw-bottom-3 tw-z-20 tw-rounded-2xl tw-border tw-border-slate-200 tw-bg-white/95 tw-p-3 tw-shadow-soft tw-backdrop-blur">
        <div className="tw-flex tw-flex-wrap tw-items-center tw-justify-between tw-gap-2">
          <div className="tw-text-xs tw-font-medium tw-text-slate-500">
            {saving ? 'Saving...' : hasUnsavedChanges ? 'You have unsaved changes' : 'All changes saved'}
          </div>
          <div className="tw-flex tw-flex-wrap tw-items-center tw-gap-2">
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
        </div>
      </section>

      {showSaveToast ? (
        <div className="tw-fixed tw-bottom-4 tw-right-4 tw-z-30 tw-rounded-lg tw-border tw-border-emerald-200 tw-bg-emerald-50 tw-px-3 tw-py-2 tw-text-xs tw-font-semibold tw-text-emerald-700 tw-shadow-lg">
          All changes saved
        </div>
      ) : null}
    </div>
  )
}
