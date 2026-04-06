import { COUNTRY_OPTIONS } from './constants'

function FieldError({ message }) {
  if (!message) return null
  return <p className="tw-mt-1 tw-text-xs tw-font-medium tw-text-rose-600">{message}</p>
}

const INPUT_CLASS =
  'tw-w-full tw-rounded-xl tw-border tw-border-slate-300 tw-bg-white tw-px-3 tw-py-2 tw-text-sm tw-text-slate-700 tw-outline-none focus:tw-border-cyan-500 focus:tw-ring-2 focus:tw-ring-cyan-100'

function fieldClass(error, value) {
  if (error) {
    return `${INPUT_CLASS} tw-border-rose-400 focus:tw-border-rose-500 focus:tw-ring-rose-100`
  }

  if (String(value || '').trim()) {
    return `${INPUT_CLASS} tw-border-emerald-300`
  }

  return INPUT_CLASS
}

export function LocationForm({ values, errors, onFieldChange }) {
  return (
    <div className="tw-grid tw-gap-3 md:tw-grid-cols-3">
      <div>
        <label className="tw-mb-1 tw-block tw-text-sm tw-font-semibold tw-text-slate-700">Country *</label>
        <select
          value={values.country}
          onChange={(event) => onFieldChange('country', event.target.value)}
          className={fieldClass(errors.country, values.country)}
        >
          {COUNTRY_OPTIONS.map((country) => (
            <option key={country} value={country}>
              {country}
            </option>
          ))}
        </select>
        <FieldError message={errors.country} />
      </div>

      <div>
        <label className="tw-mb-1 tw-block tw-text-sm tw-font-semibold tw-text-slate-700">State</label>
        <input
          type="text"
          value={values.state}
          onChange={(event) => onFieldChange('state', event.target.value)}
          className={fieldClass(errors.state, values.state)}
          placeholder="Optional state"
        />
        <FieldError message={errors.state} />
      </div>

      <div>
        <label className="tw-mb-1 tw-block tw-text-sm tw-font-semibold tw-text-slate-700">City *</label>
        <input
          type="text"
          value={values.city}
          onChange={(event) => onFieldChange('city', event.target.value)}
          className={fieldClass(errors.city, values.city)}
          placeholder="City"
        />
        <p className="tw-mt-1 tw-text-xs tw-text-slate-500">City and country improve location trust context for users.</p>
        <FieldError message={errors.city} />
      </div>
    </div>
  )
}
