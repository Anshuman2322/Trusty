import { useEffect, useMemo, useState } from 'react'
import { normalizePublicVisibility } from './constants'

function toneClass(score) {
  if (!Number.isFinite(score)) return 'tw-text-slate-500'
  if (score >= 70) return 'tw-text-emerald-600'
  if (score >= 40) return 'tw-text-amber-600'
  return 'tw-text-rose-600'
}

function trustLabel(score) {
  if (!Number.isFinite(score)) return 'Unavailable'
  if (score >= 70) return 'High Trust'
  if (score >= 40) return 'Medium Trust'
  return 'Low Trust'
}

function textValue(value, fallback = 'Not set') {
  const normalized = String(value || '').trim()
  return normalized || fallback
}

function buildPublicLocation(values, visibility) {
  const parts = []

  if (visibility.city) {
    const city = String(values?.city || '').trim()
    if (city) parts.push(city)
  }

  if (visibility.state) {
    const state = String(values?.state || '').trim()
    if (state) parts.push(state)
  }

  if (visibility.country) {
    const country = String(values?.country || '').trim()
    if (country) parts.push(country)
  }

  return parts.join(', ')
}

function DetailRow({ label, value }) {
  return (
    <div className="tw-rounded-lg tw-border tw-border-slate-200 tw-bg-white tw-p-2 tw-shadow-[0_1px_0_rgba(15,23,42,0.02)]">
      <p className="tw-text-[11px] tw-font-semibold tw-uppercase tw-tracking-wide tw-text-slate-500">{label}</p>
      <p className="tw-mt-0.5 tw-break-words tw-text-sm tw-font-medium tw-leading-snug tw-text-slate-700">{value}</p>
    </div>
  )
}

export function ProfilePreviewCard({ values, trustScore, visibility }) {
  const [pulse, setPulse] = useState(false)
  const publicVisibility = normalizePublicVisibility(visibility)
  const hasTrustScore = Number.isFinite(Number(trustScore))
  const safeScore = hasTrustScore ? Math.max(0, Math.min(100, Math.round(Number(trustScore)))) : null
  const showTrustScore = Boolean(publicVisibility.trustScore)
  const location = buildPublicLocation(values, publicVisibility)

  const ringColor = !hasTrustScore
    ? '#94a3b8'
    : safeScore >= 70
      ? '#10b981'
      : safeScore >= 40
        ? '#f59e0b'
        : '#ef4444'

  const detailRows = [
    {
      key: 'businessEmail',
      label: 'Business Email',
      visible: publicVisibility.businessEmail,
      value: textValue(values.businessEmail),
    },
    {
      key: 'supportEmail',
      label: 'Support Email',
      visible: publicVisibility.supportEmail,
      value: textValue(values.supportEmail),
    },
    {
      key: 'phoneNumber',
      label: 'Phone Number',
      visible: publicVisibility.phoneNumber,
      value: textValue(values.phoneNumber),
    },
    {
      key: 'businessWebsite',
      label: 'Website',
      visible: publicVisibility.businessWebsite,
      value: textValue(values.businessWebsite),
    },
    {
      key: 'businessId',
      label: 'GST / Business ID',
      visible: publicVisibility.businessId,
      value: textValue(values.businessId),
    },
    {
      key: 'contactPersonName',
      label: 'Contact Person',
      visible: publicVisibility.contactPersonName,
      value: textValue(values.contactPersonName),
    },
  ].filter((row) => row.visible)

  const showDescription = publicVisibility.description
  const showAdditionalInfo = publicVisibility.additionalInfo
  const additionalInfoHeading = textValue(values.additionalInfoHeading, 'Additional Information')
  const additionalInfoResult = textValue(values.additionalInfoResult)
  const hasAdditionalInfo = Boolean(String(values.additionalInfoHeading || '').trim() || String(values.additionalInfoResult || '').trim())
  const showName = publicVisibility.businessName
  const showCategory = publicVisibility.businessCategory
  const hasVisibleLocation = Boolean(location)
  const hasVisibleContent =
    showName ||
    showCategory ||
    showTrustScore ||
    hasVisibleLocation ||
    detailRows.length > 0 ||
    showDescription ||
    (showAdditionalInfo && hasAdditionalInfo)

  const previewSignature = useMemo(() => {
    return JSON.stringify({
      businessName: values.businessName,
      businessCategory: values.businessCategory,
      city: values.city,
      state: values.state,
      country: values.country,
      supportEmail: values.supportEmail,
      phoneNumber: values.phoneNumber,
      description: values.description,
      additionalInfoHeading: values.additionalInfoHeading,
      additionalInfoResult: values.additionalInfoResult,
      trustScore: safeScore,
      visibility: publicVisibility,
    })
  }, [values, safeScore, publicVisibility])

  useEffect(() => {
    setPulse(true)
    const timer = window.setTimeout(() => setPulse(false), 260)
    return () => window.clearTimeout(timer)
  }, [previewSignature])

  return (
    <article className={`tw-rounded-xl tw-border tw-border-cyan-100 tw-bg-gradient-to-br tw-from-cyan-50 tw-via-cyan-50/60 tw-to-white tw-p-3 tw-shadow-md tw-transition-all hover:tw-shadow-lg ${pulse ? 'tw-scale-[1.01]' : 'tw-scale-100'}`}>
      <div className="tw-flex tw-items-start tw-justify-between tw-gap-3">
        <div>
          <p className="tw-text-xs tw-font-semibold tw-uppercase tw-tracking-wide tw-text-cyan-700">Live Preview</p>
          <h3 className="tw-mt-0.5 tw-text-lg tw-font-bold tw-leading-tight tw-text-slate-800">
            {showName ? textValue(values.businessName, 'Business Name') : 'Private Vendor'}
          </h3>
        </div>

        <div className="tw-flex tw-items-start tw-gap-2">
          {showCategory ? (
            <span className="tw-rounded-full tw-border tw-border-cyan-200 tw-bg-cyan-50 tw-px-2.5 tw-py-1 tw-text-xs tw-font-semibold tw-text-cyan-700">
              {textValue(values.businessCategory, 'Other')}
            </span>
          ) : null}

          {String(values.businessLogo || '').trim() ? (
            <img
              src={values.businessLogo}
              alt="Business logo"
              className="tw-h-10 tw-w-10 tw-rounded-lg tw-border tw-border-slate-200 tw-bg-white tw-object-contain tw-p-1"
            />
          ) : null}
        </div>
      </div>

      {!hasVisibleContent ? (
        <div className="tw-mt-2.5 tw-rounded-xl tw-border tw-border-dashed tw-border-slate-300 tw-bg-white tw-p-2.5 tw-text-sm tw-text-slate-600">
          All fields are currently hidden from public profile.
        </div>
      ) : null}

      <div className="tw-mt-2.5 tw-grid tw-gap-2">
        <div className="tw-grid tw-gap-2 sm:tw-grid-cols-[auto_1fr] sm:tw-items-center">
          {showTrustScore ? (
            <div
              className="tw-grid tw-h-[72px] tw-w-[72px] tw-place-items-center tw-rounded-full"
              style={{ background: `conic-gradient(${ringColor} ${safeScore ?? 0}%, #e2e8f0 0)` }}
              aria-label="Trust score ring"
            >
              <div className="tw-grid tw-h-[58px] tw-w-[58px] tw-place-items-center tw-rounded-full tw-bg-white tw-text-center tw-shadow-inner">
                <strong className={`tw-text-lg tw-font-extrabold ${toneClass(safeScore)}`}>
                  {hasTrustScore ? safeScore : '--'}
                </strong>
              </div>
            </div>
          ) : (
            <div className="tw-rounded-lg tw-border tw-border-slate-200 tw-bg-white tw-px-3 tw-py-2 tw-text-xs tw-font-semibold tw-text-slate-500">
              Trust Score Hidden
            </div>
          )}

          <div className="tw-grid tw-gap-1.5">
            <div>
              <p className="tw-text-xs tw-font-semibold tw-uppercase tw-tracking-wide tw-text-slate-500">Location</p>
              <p className="tw-text-sm tw-font-medium tw-leading-snug tw-text-slate-700">
                {hasVisibleLocation ? location : 'Location Hidden'}
              </p>
            </div>

            {showTrustScore ? (
              <div>
                <p className="tw-text-xs tw-font-semibold tw-uppercase tw-tracking-wide tw-text-slate-500">Trust Score</p>
                <p className={`tw-text-sm tw-font-semibold tw-leading-snug ${toneClass(safeScore)}`}>{trustLabel(safeScore)}</p>
              </div>
            ) : null}
          </div>
        </div>

        {detailRows.length > 0 ? (
          <div className="tw-grid tw-gap-1.5 sm:tw-grid-cols-2">
            {detailRows.map((row) => (
              <DetailRow key={row.key} label={row.label} value={row.value} />
            ))}
          </div>
        ) : null}

        {showDescription ? (
          <div className="tw-rounded-lg tw-border tw-border-slate-200 tw-bg-white tw-p-2">
            <p className="tw-text-[11px] tw-font-semibold tw-uppercase tw-tracking-wide tw-text-slate-500">Business Description</p>
            <p className="tw-mt-0.5 tw-text-sm tw-leading-snug tw-text-slate-700">{textValue(values.description)}</p>
          </div>
        ) : null}

        {showAdditionalInfo && hasAdditionalInfo ? (
          <div className="tw-rounded-lg tw-border tw-border-slate-200 tw-bg-white tw-p-2">
            <p className="tw-text-[11px] tw-font-semibold tw-uppercase tw-tracking-wide tw-text-slate-500">{additionalInfoHeading}</p>
            <p className="tw-mt-0.5 tw-text-sm tw-leading-snug tw-text-slate-700">{additionalInfoResult}</p>
          </div>
        ) : null}
      </div>
    </article>
  )
}
