const VISIBILITY_OPTIONS = [
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
    key: 'contactPersonName',
    label: 'Contact Person Name',
    description: 'Show a primary contact person on public profile.',
  },
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
  {
    key: 'description',
    label: 'Business Description',
    description: 'Show your public business description text.',
  },
]

function VisibilityToggle({ label, description, checked, onChange }) {
  return (
    <label className="tw-flex tw-cursor-pointer tw-items-start tw-justify-between tw-gap-3 tw-rounded-xl tw-border tw-border-slate-200 tw-bg-white tw-p-3 hover:tw-border-cyan-300">
      <span className="tw-grid tw-gap-0.5">
        <span className="tw-text-sm tw-font-semibold tw-text-slate-800">{label}</span>
        <span className="tw-text-xs tw-text-slate-500">{description}</span>
      </span>

      <span
        className={`tw-relative tw-inline-flex tw-h-6 tw-w-11 tw-shrink-0 tw-items-center tw-rounded-full tw-transition ${
          checked ? 'tw-bg-cyan-600' : 'tw-bg-slate-300'
        }`}
        aria-hidden="true"
      >
        <span
          className={`tw-inline-block tw-h-5 tw-w-5 tw-rounded-full tw-bg-white tw-shadow tw-transition-transform ${
            checked ? 'tw-translate-x-5' : 'tw-translate-x-1'
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
  return (
    <div className="tw-grid tw-gap-3">
      <div className="tw-rounded-xl tw-border tw-border-cyan-100 tw-bg-cyan-50 tw-p-3 tw-text-xs tw-font-medium tw-text-cyan-700">
        Choose exactly which profile fields are visible in your public preview.
      </div>

      <div className="tw-grid tw-gap-2 md:tw-grid-cols-2">
        {VISIBILITY_OPTIONS.map((item) => (
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
  )
}