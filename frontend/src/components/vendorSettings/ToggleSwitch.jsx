export function ToggleSwitch({
  id,
  label,
  description,
  checked,
  onChange,
  disabled = false,
}) {
  const safeId = id || `toggle-${String(label || 'setting').toLowerCase().replace(/\s+/g, '-')}`

  return (
    <label
      htmlFor={safeId}
      className="vendorSettingsControl vendorToggleSwitch tw-flex tw-cursor-pointer tw-items-start tw-justify-between tw-gap-4 tw-rounded-xl tw-border tw-border-slate-200 tw-bg-white tw-p-3 hover:tw-border-cyan-300"
    >
      <div className="tw-grid tw-gap-0.5">
        <span className="tw-text-sm tw-font-semibold tw-text-slate-800">{label}</span>
        {description ? <span className="tw-text-xs tw-text-slate-500">{description}</span> : null}
      </div>

      <span
        className={`tw-relative tw-inline-flex tw-h-6 tw-w-11 tw-shrink-0 tw-items-center tw-rounded-full tw-transition ${
          checked ? 'tw-bg-cyan-600' : 'tw-bg-slate-300'
        } ${disabled ? 'tw-opacity-60' : ''}`}
        aria-hidden="true"
      >
        <span
          className={`tw-inline-block tw-h-5 tw-w-5 tw-rounded-full tw-bg-white tw-shadow tw-transition-transform ${
            checked ? 'tw-translate-x-5' : 'tw-translate-x-1'
          }`}
        />
      </span>

      <input
        id={safeId}
        type="checkbox"
        className="tw-sr-only"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        disabled={disabled}
      />
    </label>
  )
}
