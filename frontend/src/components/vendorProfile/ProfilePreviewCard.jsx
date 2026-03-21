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
    <div className="tw-rounded-lg tw-border tw-border-slate-200 tw-bg-white tw-p-2.5">
      <p className="tw-text-[11px] tw-font-semibold tw-uppercase tw-tracking-wide tw-text-slate-500">{label}</p>
      <p className="tw-mt-0.5 tw-text-sm tw-font-medium tw-text-slate-700">{value}</p>
    </div>
  )
}

export function ProfilePreviewCard({ values, trustScore, visibility }) {
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
  const showName = publicVisibility.businessName
  const showCategory = publicVisibility.businessCategory
  const hasVisibleLocation = Boolean(location)
  const hasVisibleContent =
    showName ||
    showCategory ||
    showTrustScore ||
    hasVisibleLocation ||
    detailRows.length > 0 ||
    showDescription

  return (
    <article className="tw-rounded-2xl tw-border tw-border-cyan-100 tw-bg-gradient-to-br tw-from-cyan-50 tw-to-white tw-p-4 tw-shadow-soft">
      <div className="tw-flex tw-items-start tw-justify-between tw-gap-3">
        <div>
          <p className="tw-text-xs tw-font-semibold tw-uppercase tw-tracking-wide tw-text-cyan-700">Public Profile Preview</p>
          <h3 className="tw-mt-1 tw-text-lg tw-font-bold tw-text-slate-800">
            {showName ? textValue(values.businessName, 'Business Name') : 'Private Vendor'}
          </h3>
        </div>

        {showCategory ? (
          <span className="tw-rounded-full tw-border tw-border-cyan-200 tw-bg-cyan-50 tw-px-2.5 tw-py-1 tw-text-xs tw-font-semibold tw-text-cyan-700">
            {textValue(values.businessCategory, 'Other')}
          </span>
        ) : null}
      </div>

      {!hasVisibleContent ? (
        <div className="tw-mt-4 tw-rounded-xl tw-border tw-border-dashed tw-border-slate-300 tw-bg-white tw-p-3 tw-text-sm tw-text-slate-600">
          All fields are currently hidden from public profile.
        </div>
      ) : null}

      <div className="tw-mt-4 tw-grid tw-gap-3">
        <div className="tw-grid tw-gap-3 sm:tw-grid-cols-[auto_1fr] sm:tw-items-center">
          {showTrustScore ? (
            <div
              className="tw-grid tw-h-[78px] tw-w-[78px] tw-place-items-center tw-rounded-full"
              style={{ background: `conic-gradient(${ringColor} ${safeScore ?? 0}%, #e2e8f0 0)` }}
              aria-label="Trust score ring"
            >
              <div className="tw-grid tw-h-[62px] tw-w-[62px] tw-place-items-center tw-rounded-full tw-bg-white tw-text-center tw-shadow-inner">
                <strong className={`tw-text-xl tw-font-extrabold ${toneClass(safeScore)}`}>
                  {hasTrustScore ? safeScore : '--'}
                </strong>
              </div>
            </div>
          ) : (
            <div className="tw-rounded-lg tw-border tw-border-slate-200 tw-bg-white tw-px-3 tw-py-2 tw-text-xs tw-font-semibold tw-text-slate-500">
              Trust Score Hidden
            </div>
          )}

          <div className="tw-grid tw-gap-2">
            <div>
              <p className="tw-text-xs tw-font-semibold tw-uppercase tw-tracking-wide tw-text-slate-500">Location</p>
              <p className="tw-text-sm tw-font-medium tw-text-slate-700">
                {hasVisibleLocation ? location : 'Location Hidden'}
              </p>
            </div>

            {showTrustScore ? (
              <div>
                <p className="tw-text-xs tw-font-semibold tw-uppercase tw-tracking-wide tw-text-slate-500">Trust Score</p>
                <p className={`tw-text-sm tw-font-semibold ${toneClass(safeScore)}`}>{trustLabel(safeScore)}</p>
              </div>
            ) : null}
          </div>
        </div>

        {detailRows.length > 0 ? (
          <div className="tw-grid tw-gap-2 sm:tw-grid-cols-2">
            {detailRows.map((row) => (
              <DetailRow key={row.key} label={row.label} value={row.value} />
            ))}
          </div>
        ) : null}

        {showDescription ? (
          <div className="tw-rounded-lg tw-border tw-border-slate-200 tw-bg-white tw-p-2.5">
            <p className="tw-text-[11px] tw-font-semibold tw-uppercase tw-tracking-wide tw-text-slate-500">Business Description</p>
            <p className="tw-mt-1 tw-text-sm tw-text-slate-700">{textValue(values.description)}</p>
          </div>
        ) : null}
      </div>
    </article>
  )
}
