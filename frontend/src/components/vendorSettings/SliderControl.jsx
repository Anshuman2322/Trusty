export function SliderControl({
  id,
  label,
  value,
  min = 0,
  max = 100,
  step = 1,
  onChange,
  helper,
}) {
  const safeId = id || `slider-${String(label || 'value').toLowerCase().replace(/\s+/g, '-')}`

  return (
    <div className="vendorSettingsControl vendorSlider tw-rounded-xl tw-border tw-border-slate-200 tw-bg-white tw-p-3">
      <div className="tw-flex tw-items-center tw-justify-between tw-gap-2">
        <label htmlFor={safeId} className="tw-text-sm tw-font-semibold tw-text-slate-800">
          {label}
        </label>
        <span className="tw-rounded-md tw-bg-cyan-50 tw-px-2 tw-py-0.5 tw-text-xs tw-font-bold tw-text-cyan-700">
          {value}
        </span>
      </div>
      {helper ? <p className="tw-mt-1 tw-text-xs tw-text-slate-500">{helper}</p> : null}
      <input
        id={safeId}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="tw-mt-2 tw-w-full"
      />
      <div className="tw-flex tw-justify-between tw-text-[11px] tw-text-slate-400">
        <span>{min}</span>
        <span>{max}</span>
      </div>
    </div>
  )
}
