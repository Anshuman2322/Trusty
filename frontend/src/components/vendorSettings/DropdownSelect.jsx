export function DropdownSelect({
  id,
  label,
  value,
  onChange,
  options,
  helper,
  disabled = false,
}) {
  const safeId = id || `select-${String(label || 'option').toLowerCase().replace(/\s+/g, '-')}`

  return (
    <div className="vendorSettingsControl vendorDropdown tw-rounded-xl tw-border tw-border-slate-200 tw-bg-white tw-p-3">
      <label htmlFor={safeId} className="tw-block tw-text-sm tw-font-semibold tw-text-slate-800">
        {label}
      </label>
      {helper ? <p className="tw-mt-1 tw-text-xs tw-text-slate-500">{helper}</p> : null}
      <select
        id={safeId}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        className="tw-mt-2 tw-w-full tw-rounded-lg tw-border tw-border-slate-300 tw-bg-white tw-px-3 tw-py-2 tw-text-sm tw-text-slate-700 tw-outline-none focus:tw-border-cyan-500 focus:tw-ring-2 focus:tw-ring-cyan-100"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  )
}
