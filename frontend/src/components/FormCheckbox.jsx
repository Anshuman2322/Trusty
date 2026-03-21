export function FormCheckbox({ id, name, checked, onChange, label, error, disabled = false }) {
  return (
    <div className="vendorCheckboxWrap">
      <label htmlFor={id || name} className="vendorCheckboxLabel">
        <input
          id={id || name}
          name={name}
          type="checkbox"
          checked={checked}
          onChange={onChange}
          disabled={disabled}
        />
        <span>{label}</span>
      </label>
      {error ? <div className="vendorFieldError">{error}</div> : null}
    </div>
  )
}
