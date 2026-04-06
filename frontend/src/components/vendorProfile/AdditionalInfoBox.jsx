function FieldError({ message }) {
  if (!message) return null
  return <p className="tw-mt-1 tw-text-xs tw-font-medium tw-text-rose-600">{message}</p>
}

const INPUT_CLASS =
  'tw-w-full tw-rounded-xl tw-border tw-border-slate-300 tw-bg-white tw-px-3 tw-py-2 tw-text-sm tw-text-slate-700 tw-outline-none focus:tw-border-cyan-500 focus:tw-ring-2 focus:tw-ring-cyan-100'

const TEXTAREA_CLASS =
  'tw-min-h-[92px] tw-w-full tw-rounded-xl tw-border tw-border-slate-300 tw-bg-white tw-px-3 tw-py-2 tw-text-sm tw-text-slate-700 tw-outline-none focus:tw-border-cyan-500 focus:tw-ring-2 focus:tw-ring-cyan-100'

function fieldClass(baseClass, error, value) {
  if (error) {
    return `${baseClass} tw-border-rose-400 focus:tw-border-rose-500 focus:tw-ring-rose-100`
  }

  if (String(value || '').trim()) {
    return `${baseClass} tw-border-emerald-300`
  }

  return baseClass
}

export function AdditionalInfoBox({
  headingValue,
  resultValue,
  headingError,
  resultError,
  onHeadingChange,
  onResultChange,
}) {
  return (
    <div className="tw-grid tw-gap-3">
      <div>
        <label className="tw-mb-1 tw-block tw-text-sm tw-font-semibold tw-text-slate-700">Heading</label>
        <input
          type="text"
          value={headingValue}
          onChange={(event) => onHeadingChange(event.target.value)}
          className={fieldClass(INPUT_CLASS, headingError, headingValue)}
          placeholder="Example: Sustainability Certifications"
        />
        <p className="tw-mt-1 tw-text-xs tw-text-slate-500">Add a clear title for your custom category or information.</p>
        <div className="tw-mt-1 tw-flex tw-items-center tw-justify-between">
          <FieldError message={headingError} />
          <p className="tw-text-xs tw-text-slate-500">{String(headingValue || '').length}/120</p>
        </div>
      </div>

      <div>
        <label className="tw-mb-1 tw-block tw-text-sm tw-font-semibold tw-text-slate-700">Result / Details</label>
        <textarea
          value={resultValue}
          onChange={(event) => onResultChange(event.target.value)}
          className={fieldClass(TEXTAREA_CLASS, resultError, resultValue)}
          placeholder="Share the details, outcome, or any extra information you want to publish."
        />
        <p className="tw-mt-1 tw-text-xs tw-text-slate-500">This box is for your final details or result text.</p>
        <div className="tw-mt-1 tw-flex tw-items-center tw-justify-between">
          <FieldError message={resultError} />
          <p className="tw-text-xs tw-text-slate-500">{String(resultValue || '').length}/1500</p>
        </div>
      </div>
    </div>
  )
}
