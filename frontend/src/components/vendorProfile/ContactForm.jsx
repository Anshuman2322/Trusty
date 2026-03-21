function FieldError({ message }) {
  if (!message) return null
  return <p className="tw-mt-1 tw-text-xs tw-font-medium tw-text-rose-600">{message}</p>
}

const INPUT_CLASS =
  'tw-w-full tw-rounded-xl tw-border tw-border-slate-300 tw-bg-white tw-px-3 tw-py-2.5 tw-text-sm tw-text-slate-700 tw-outline-none focus:tw-border-cyan-500 focus:tw-ring-2 focus:tw-ring-cyan-100'

export function ContactForm({ values, errors, onFieldChange }) {
  return (
    <div className="tw-grid tw-gap-4 md:tw-grid-cols-3">
      <div>
        <label className="tw-mb-1 tw-block tw-text-sm tw-font-semibold tw-text-slate-700">Contact Person Name</label>
        <input
          type="text"
          value={values.contactPersonName}
          onChange={(event) => onFieldChange('contactPersonName', event.target.value)}
          className={INPUT_CLASS}
          placeholder="Primary contact"
        />
        <FieldError message={errors.contactPersonName} />
      </div>

      <div>
        <label className="tw-mb-1 tw-block tw-text-sm tw-font-semibold tw-text-slate-700">Phone Number</label>
        <input
          type="text"
          value={values.phoneNumber}
          onChange={(event) => onFieldChange('phoneNumber', event.target.value)}
          className={INPUT_CLASS}
          placeholder="+91 98xxxxxx10"
        />
        <FieldError message={errors.phoneNumber} />
      </div>

      <div>
        <label className="tw-mb-1 tw-block tw-text-sm tw-font-semibold tw-text-slate-700">Support Email</label>
        <input
          type="email"
          value={values.supportEmail}
          onChange={(event) => onFieldChange('supportEmail', event.target.value)}
          className={INPUT_CLASS}
          placeholder="help@business.com"
        />
        <FieldError message={errors.supportEmail} />
      </div>
    </div>
  )
}
