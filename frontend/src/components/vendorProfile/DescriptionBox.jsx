function FieldError({ message }) {
  if (!message) return null
  return <p className="tw-mt-1 tw-text-xs tw-font-medium tw-text-rose-600">{message}</p>
}

const TEXTAREA_CLASS =
  'tw-min-h-[96px] tw-w-full tw-rounded-xl tw-border tw-border-slate-300 tw-bg-white tw-px-3 tw-py-2 tw-text-sm tw-text-slate-700 tw-outline-none focus:tw-border-cyan-500 focus:tw-ring-2 focus:tw-ring-cyan-100'

function fieldClass(error, value) {
  if (error) {
    return `${TEXTAREA_CLASS} tw-border-rose-400 focus:tw-border-rose-500 focus:tw-ring-rose-100`
  }

  if (String(value || '').trim()) {
    return `${TEXTAREA_CLASS} tw-border-emerald-300`
  }

  return TEXTAREA_CLASS
}

export function DescriptionBox({ value, error, onChange }) {
  return (
    <div>
      <label className="tw-mb-1 tw-block tw-text-sm tw-font-semibold tw-text-slate-700">Business Description</label>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={fieldClass(error, value)}
        placeholder="Describe your business, products, or services."
      />
      <p className="tw-mt-1 tw-text-xs tw-text-slate-500">Clear details help customers trust your profile quickly.</p>
      <div className="tw-mt-1 tw-flex tw-items-center tw-justify-between">
        <FieldError message={error} />
        <p className="tw-text-xs tw-text-slate-500">{value.length}/1500</p>
      </div>
    </div>
  )
}
