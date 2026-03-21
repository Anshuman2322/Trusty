export function SelectField({
  id,
  name,
  label,
  value,
  onChange,
  onBlur,
  options,
  required = false,
  helper,
  error,
}) {
  const safeId = id || name

  return (
    <div className="tw-grid tw-gap-1.5">
      <label htmlFor={safeId} className="tw-text-sm tw-font-semibold tw-text-slate-800">
        {label} {required ? <span className="tw-text-rose-600">*</span> : null}
      </label>

      <select
        id={safeId}
        name={name}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        className={`tw-w-full tw-rounded-lg tw-border tw-bg-white tw-px-3 tw-py-2.5 tw-text-sm tw-text-slate-800 tw-outline-none tw-transition ${
          error
            ? 'tw-border-rose-300 focus:tw-border-rose-500 focus:tw-ring-2 focus:tw-ring-rose-100'
            : 'tw-border-slate-300 focus:tw-border-cyan-500 focus:tw-ring-2 focus:tw-ring-cyan-100'
        }`}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${safeId}-error` : helper ? `${safeId}-helper` : undefined}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      {error ? (
        <p id={`${safeId}-error`} className="tw-text-xs tw-font-medium tw-text-rose-600">
          {error}
        </p>
      ) : helper ? (
        <p id={`${safeId}-helper`} className="tw-text-xs tw-text-slate-500">
          {helper}
        </p>
      ) : null}
    </div>
  )
}
