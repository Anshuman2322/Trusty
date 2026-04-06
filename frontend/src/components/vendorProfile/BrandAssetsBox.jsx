import { useRef } from 'react'

function UploadIcon() {
  return (
    <svg className="tw-h-8 tw-w-8" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 15V6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M8.5 9.5L12 6l3.5 3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="4" y="15" width="16" height="5" rx="1.8" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  )
}

function FieldError({ message }) {
  if (!message) return null
  return <p className="tw-mt-2 tw-text-xs tw-font-medium tw-text-rose-600">{message}</p>
}

export function BrandAssetsBox({ logoValue, error, onPickFile, onClear }) {
  const fileInputRef = useRef(null)
  const hasLogo = Boolean(String(logoValue || '').trim())

  function handlePickClick() {
    fileInputRef.current?.click()
  }

  function handleFileChange(event) {
    const file = event.target.files?.[0]
    onPickFile(file)
    event.target.value = ''
  }

  return (
    <div className="tw-grid tw-gap-2.5">
      <div className="tw-flex tw-items-start tw-justify-between tw-gap-3">
        <p className="tw-m-0 tw-text-sm tw-font-semibold tw-text-slate-700">Upload logo (PNG, SVG, max 2MB)</p>
        {hasLogo ? (
          <button
            type="button"
            className="tw-rounded-lg tw-border tw-border-slate-300 tw-bg-white tw-px-2.5 tw-py-1 tw-text-xs tw-font-semibold tw-text-slate-600 hover:tw-bg-slate-50"
            onClick={onClear}
          >
            Remove
          </button>
        ) : null}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".png,.svg,image/png,image/svg+xml"
        className="tw-hidden"
        onChange={handleFileChange}
      />

      <button
        type="button"
        onClick={handlePickClick}
        className="tw-grid tw-min-h-[128px] tw-w-full tw-place-items-center tw-rounded-xl tw-border-2 tw-border-dashed tw-border-slate-300 tw-bg-slate-50 tw-px-4 tw-py-5 tw-text-center tw-text-slate-500 hover:tw-border-cyan-300 hover:tw-bg-cyan-50/50 hover:tw-text-cyan-700"
      >
        {hasLogo ? (
          <div className="tw-grid tw-place-items-center tw-gap-2">
            <img
              src={logoValue}
              alt="Company logo preview"
              className="tw-h-16 tw-w-16 tw-rounded-lg tw-border tw-border-slate-200 tw-bg-white tw-object-contain tw-p-1"
            />
            <span className="tw-text-xs tw-font-semibold">Click to replace logo</span>
          </div>
        ) : (
          <div className="tw-grid tw-place-items-center tw-gap-2">
            <span className="tw-text-slate-400">
              <UploadIcon />
            </span>
            <span className="tw-text-sm tw-font-medium">Upload logo (PNG, SVG, max 2MB)</span>
          </div>
        )}
      </button>

      <p className="tw-m-0 tw-text-xs tw-text-slate-500">
        This logo appears in your profile preview and public vendor profile.
      </p>
      <FieldError message={error} />
    </div>
  )
}
