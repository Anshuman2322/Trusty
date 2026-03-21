export function FormSelect({
  id,
  name,
  label,
  value,
  onChange,
  options,
  required = false,
  error,
  disabled = false,
}) {
  return (
    <div className="field vendorField">
      <label htmlFor={id || name}>{label}</label>
      <select
        id={id || name}
        name={name}
        className={error ? 'select vendorInput vendorInput--error' : 'select vendorInput'}
        value={value}
        onChange={onChange}
        required={required}
        disabled={disabled}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error ? <div className="vendorFieldError">{error}</div> : null}
    </div>
  )
}
