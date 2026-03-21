export function FormInput({
  id,
  name,
  label,
  type = 'text',
  value,
  onChange,
  placeholder,
  autoComplete,
  required = false,
  error,
  disabled = false,
  helper,
}) {
  return (
    <div className="field vendorField">
      <label htmlFor={id || name}>{label}</label>
      <input
        id={id || name}
        name={name}
        type={type}
        className={error ? 'input vendorInput vendorInput--error' : 'input vendorInput'}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        autoComplete={autoComplete}
        required={required}
        disabled={disabled}
      />
      {error ? <div className="vendorFieldError">{error}</div> : null}
      {!error && helper ? <div className="vendorFieldHelper">{helper}</div> : null}
    </div>
  )
}
