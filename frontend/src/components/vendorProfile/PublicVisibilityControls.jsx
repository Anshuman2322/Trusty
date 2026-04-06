import { useMemo, useState } from 'react'

const VISIBILITY_GROUPS = [
  {
    key: 'basic',
    title: 'Basic Info',
    subtitle: 'Core identity visible on your public profile.',
    fields: [
      {
        key: 'businessName',
        label: 'Business Name',
        description: 'Show your brand name on public profile.',
      },
      {
        key: 'businessCategory',
        label: 'Business Category',
        description: 'Show your business category (Electronics, Services, etc.).',
      },
      {
        key: 'trustScore',
        label: 'Trust Score',
        description: 'Show trust ring and trust level on the preview card.',
      },
    ],
  },
  {
    key: 'contact',
    title: 'Contact Info',
    subtitle: 'How customers and partners can reach your business.',
    fields: [
      {
        key: 'businessEmail',
        label: 'Business Email',
        description: 'Allow public users to see your business email address.',
      },
      {
        key: 'supportEmail',
        label: 'Support Email',
        description: 'Show support contact email for customer communication.',
      },
      {
        key: 'phoneNumber',
        label: 'Phone Number',
        description: 'Show support phone number.',
      },
      {
        key: 'contactPersonName',
        label: 'Contact Person Name',
        description: 'Show a primary contact person on public profile.',
      },
    ],
  },
  {
    key: 'location',
    title: 'Location',
    subtitle: 'Location visibility controls for country and city details.',
    fields: [
      {
        key: 'country',
        label: 'Country',
        description: 'Show your country in location details.',
      },
      {
        key: 'state',
        label: 'State',
        description: 'Show your state in location details.',
      },
      {
        key: 'city',
        label: 'City',
        description: 'Show your city in location details.',
      },
    ],
  },
  {
    key: 'business',
    title: 'Business Info',
    subtitle: 'Detailed company profile visibility options.',
    fields: [
      {
        key: 'businessWebsite',
        label: 'Business Website',
        description: 'Display your business website link.',
      },
      {
        key: 'businessId',
        label: 'GST / Business ID',
        description: 'Expose registration identifier if needed.',
      },
      {
        key: 'description',
        label: 'Business Description',
        description: 'Show your public business description text.',
      },
      {
        key: 'additionalInfo',
        label: 'Additional Information',
        description: 'Show your custom heading and result/details block.',
      },
    ],
  },
]

const GROUP_ACCENT = {
  basic: {
    bar: 'tw-bg-blue-500',
    icon: 'tw-bg-blue-100 tw-text-blue-600',
    ring: 'tw-border-blue-200',
  },
  contact: {
    bar: 'tw-bg-emerald-500',
    icon: 'tw-bg-emerald-100 tw-text-emerald-600',
    ring: 'tw-border-emerald-200',
  },
  location: {
    bar: 'tw-bg-violet-500',
    icon: 'tw-bg-violet-100 tw-text-violet-600',
    ring: 'tw-border-violet-200',
  },
  business: {
    bar: 'tw-bg-orange-500',
    icon: 'tw-bg-orange-100 tw-text-orange-600',
    ring: 'tw-border-orange-200',
  },
}

function BadgeIcon({ state }) {
  if (state === 'full') {
    return (
      <svg className="tw-h-3.5 tw-w-3.5" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <path d="M4.5 10.5l3.2 3.2L15.5 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  }

  if (state === 'partial') {
    return (
      <svg className="tw-h-3.5 tw-w-3.5" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <path d="M10 5.5v5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <circle cx="10" cy="13.5" r="1" fill="currentColor" />
      </svg>
    )
  }

  return (
    <svg className="tw-h-3.5 tw-w-3.5" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M6 6l8 8M14 6l-8 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

function getVisibilityBadge(enabled, total) {
  if (enabled <= 0) {
    return {
      label: 'Hidden',
      state: 'hidden',
      className: 'tw-border-slate-300 tw-bg-slate-100 tw-text-slate-600',
    }
  }

  if (enabled >= total) {
    return {
      label: 'Fully Visible',
      state: 'full',
      className: 'tw-border-emerald-200 tw-bg-emerald-50 tw-text-emerald-700',
    }
  }

  return {
    label: 'Partially Visible',
    state: 'partial',
    className: 'tw-border-amber-200 tw-bg-amber-50 tw-text-amber-700',
  }
}

function GroupGlyph({ kind }) {
  if (kind === 'basic') {
    return (
      <svg className="tw-h-3.5 tw-w-3.5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <rect x="4" y="4" width="16" height="16" rx="3" stroke="currentColor" strokeWidth="1.8" />
        <path d="M8 10h8M8 14h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    )
  }

  if (kind === 'contact') {
    return (
      <svg className="tw-h-3.5 tw-w-3.5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="8.5" r="3" stroke="currentColor" strokeWidth="1.8" />
        <path d="M5 19a7 7 0 0114 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    )
  }

  if (kind === 'location') {
    return (
      <svg className="tw-h-3.5 tw-w-3.5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M12 21s7-5.8 7-11a7 7 0 10-14 0c0 5.2 7 11 7 11z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
        <circle cx="12" cy="10" r="2.1" stroke="currentColor" strokeWidth="1.8" />
      </svg>
    )
  }

  return (
    <svg className="tw-h-3.5 tw-w-3.5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M5 6h14v12H8l-3 3V6z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M9 10h7M9 14h5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

function VisibilityToggle({ label, description, checked, onChange }) {
  return (
    <label className="tw-flex tw-cursor-pointer tw-items-start tw-justify-between tw-gap-2 tw-rounded-lg tw-border tw-border-slate-200 tw-bg-white tw-p-1.5 hover:tw-border-cyan-300">
      <span className="tw-grid tw-gap-0.5 tw-pr-2">
        <span className="tw-text-xs tw-font-semibold tw-text-slate-800">{label}</span>
        <span className="tw-text-[11px] tw-leading-4 tw-text-slate-500">{description}</span>
      </span>

      <span
        className={`tw-relative tw-inline-flex tw-h-5 tw-w-9 tw-shrink-0 tw-items-center tw-rounded-full tw-transition ${
          checked ? 'tw-bg-cyan-600' : 'tw-bg-slate-300'
        }`}
        aria-hidden="true"
      >
        <span
          className={`tw-inline-block tw-h-4 tw-w-4 tw-rounded-full tw-bg-white tw-shadow tw-transition-transform ${
            checked ? 'tw-translate-x-4' : 'tw-translate-x-1'
          }`}
        />
      </span>

      <input
        type="checkbox"
        className="tw-sr-only"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
    </label>
  )
}

export function PublicVisibilityControls({ visibility = {}, onToggle }) {
  const [openGroup, setOpenGroup] = useState('basic')

  const enabledCounts = useMemo(() => {
    const counts = {}
    for (const group of VISIBILITY_GROUPS) {
      counts[group.key] = group.fields.filter((field) => Boolean(visibility?.[field.key])).length
    }
    return counts
  }, [visibility])

  return (
    <div className="tw-grid tw-gap-1.5">
      <div className="tw-rounded-lg tw-border tw-border-cyan-100 tw-bg-gradient-to-r tw-from-cyan-50 tw-to-sky-50 tw-px-2.5 tw-py-1 tw-text-[11px] tw-font-medium tw-text-cyan-700">
        Choose exactly which profile fields are visible in your public preview.
      </div>

      <div className="tw-grid tw-gap-1">
        {VISIBILITY_GROUPS.map((group) => {
          const isOpen = openGroup === group.key
          const enabled = enabledCounts[group.key] || 0
          const accent = GROUP_ACCENT[group.key] || GROUP_ACCENT.basic
          const badge = getVisibilityBadge(enabled, group.fields.length)

          return (
            <section
              key={group.key}
              className={`tw-relative tw-overflow-hidden tw-rounded-xl tw-border tw-bg-gradient-to-r tw-from-gray-50 tw-to-white tw-transition-all tw-duration-200 hover:tw--translate-y-1 hover:tw-shadow-md ${
                isOpen ? `${accent.ring} tw-shadow-sm` : 'tw-border-slate-200'
              }`}
            >
              <span className={`tw-absolute tw-left-0 tw-top-0 tw-h-full tw-w-0.5 ${accent.bar}`} aria-hidden="true" />
              <button
                type="button"
                onClick={() => setOpenGroup((prev) => (prev === group.key ? '' : group.key))}
                className="tw-flex tw-w-full tw-items-start tw-justify-between tw-gap-2 tw-pl-2.5 tw-pr-2.5 tw-py-2 tw-text-left"
              >
                <div className="tw-grid tw-grid-cols-[auto_1fr] tw-items-center tw-gap-x-2 tw-gap-y-0">
                  <span className={`tw-inline-flex tw-h-6 tw-w-6 tw-items-center tw-justify-center tw-rounded-lg ${accent.icon}`}>
                    <GroupGlyph kind={group.key} />
                  </span>
                  <h4 className="tw-text-sm tw-font-bold tw-leading-5 tw-text-slate-800">{group.title}</h4>
                  <p className="tw-col-start-2 tw--mt-0.5 tw-text-xs tw-leading-4 tw-text-slate-500">{group.subtitle}</p>
                </div>
                <div className="tw-mt-0.5 tw-flex tw-items-center tw-gap-1.5 tw-self-start">
                  <span className={`tw-inline-flex tw-items-center tw-gap-1 tw-whitespace-nowrap tw-rounded-full tw-border tw-px-1.5 tw-py-0.5 tw-text-[10px] tw-font-semibold ${badge.className}`}>
                    <BadgeIcon state={badge.state} />
                    {badge.label}
                  </span>
                  <span className={`tw-inline-flex tw-h-5 tw-w-5 tw-items-center tw-justify-center tw-rounded-md tw-border tw-border-slate-200 tw-bg-white tw-text-[11px] tw-font-bold tw-shadow-sm tw-transition-transform tw-duration-200 ${isOpen ? 'tw-text-slate-800 tw-rotate-90' : 'tw-text-slate-600'}`}>›</span>
                </div>
              </button>

              {isOpen ? (
                <div className="tw-border-t tw-border-slate-100 tw-bg-white/80 tw-p-1">
                  <div className="tw-grid tw-gap-1 md:tw-grid-cols-1">
                    {group.fields.map((item) => (
                      <VisibilityToggle
                        key={item.key}
                        label={item.label}
                        description={item.description}
                        checked={Boolean(visibility?.[item.key])}
                        onChange={(nextValue) => onToggle(item.key, nextValue)}
                      />
                    ))}
                  </div>
                </div>
              ) : null}
            </section>
          )
        })}
      </div>
    </div>
  )
}