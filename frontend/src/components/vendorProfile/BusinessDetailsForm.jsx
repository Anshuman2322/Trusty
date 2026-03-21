import { BUSINESS_CATEGORIES } from './constants'

function FieldError({ message }) {
  if (!message) return null
  return <p className="tw-mt-1 tw-text-xs tw-font-medium tw-text-rose-600">{message}</p>
}

const INPUT_CLASS =
  'tw-w-full tw-rounded-xl tw-border tw-border-slate-300 tw-bg-white tw-px-3 tw-py-2.5 tw-text-sm tw-text-slate-700 tw-outline-none focus:tw-border-cyan-500 focus:tw-ring-2 focus:tw-ring-cyan-100'

export function BusinessDetailsForm({ values, errors, onFieldChange }) {
  return (
    <div className="tw-grid tw-gap-4 md:tw-grid-cols-2">
      <div className="md:tw-col-span-2">
        <label className="tw-mb-1 tw-block tw-text-sm tw-font-semibold tw-text-slate-700">Business Name *</label>
        <input
          type="text"
          value={values.businessName}
          onChange={(event) => onFieldChange('businessName', event.target.value)}
          className={INPUT_CLASS}
          placeholder="Enter business name"
        />
        <FieldError message={errors.businessName} />
      </div>

      <div>
        <label className="tw-mb-1 tw-block tw-text-sm tw-font-semibold tw-text-slate-700">Business Email *</label>
        <input
          type="email"
          value={values.businessEmail}
          onChange={(event) => onFieldChange('businessEmail', event.target.value)}
          className={INPUT_CLASS}
          placeholder="support@business.com"
        />
        <FieldError message={errors.businessEmail} />
      </div>

      <div>
        <label className="tw-mb-1 tw-block tw-text-sm tw-font-semibold tw-text-slate-700">Business Category *</label>
        <select
          value={values.businessCategory}
          onChange={(event) => onFieldChange('businessCategory', event.target.value)}
          className={INPUT_CLASS}
        >
          {BUSINESS_CATEGORIES.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
        <FieldError message={errors.businessCategory} />
      </div>

      <div>
        <label className="tw-mb-1 tw-block tw-text-sm tw-font-semibold tw-text-slate-700">Business Website</label>
        <input
          type="text"
          value={values.businessWebsite}
          onChange={(event) => onFieldChange('businessWebsite', event.target.value)}
          className={INPUT_CLASS}
          placeholder="https://example.com"
        />
        <FieldError message={errors.businessWebsite} />
      </div>

      <div>
        <label className="tw-mb-1 tw-block tw-text-sm tw-font-semibold tw-text-slate-700">GST / Business ID</label>
        <input
          type="text"
          value={values.businessId}
          onChange={(event) => onFieldChange('businessId', event.target.value)}
          className={INPUT_CLASS}
          placeholder="Optional registration ID"
        />
        <FieldError message={errors.businessId} />
      </div>
    </div>
  )
}
