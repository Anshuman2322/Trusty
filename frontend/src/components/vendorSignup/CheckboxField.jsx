export function CheckboxField({ id, name, checked, onChange, onBlur, label, error }) {
  const safeId = id || name

  return (
    <div className="tw-grid tw-gap-1.5">
      <label htmlFor={safeId} className="tw-flex tw-cursor-pointer tw-items-start tw-gap-2.5 tw-text-sm tw-text-slate-700">
        <input
          id={safeId}
          name={name}
          type="checkbox"
          checked={checked}
          onChange={onChange}
          onBlur={onBlur}
          className="tw-mt-0.5 tw-h-4 tw-w-4 tw-rounded tw-border-slate-300 tw-text-cyan-600 focus:tw-ring-cyan-200"
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${safeId}-error` : undefined}
        />
        <span>{label}</span>
      </label>

      {error ? (
        <p id={`${safeId}-error`} className="tw-text-xs tw-font-medium tw-text-rose-600">
          {error}
        </p>
      ) : null}
    </div>
  )
}
