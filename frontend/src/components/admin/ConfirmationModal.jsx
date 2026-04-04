import { useEffect } from 'react'

export function ConfirmationModal({
  isDark = false,
  open,
  title,
  description,
  bullets = [],
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  danger = false,
  loading = false,
  onConfirm,
  onCancel,
}) {
  useEffect(() => {
    if (!open || typeof window === 'undefined') return undefined

    const onKeyDown = (event) => {
      if (event.key === 'Escape') onCancel?.()
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, onCancel])

  if (!open) return null

  return (
    <div className={[
      'tw-fixed tw-inset-0 tw-z-[70] tw-flex tw-items-center tw-justify-center tw-p-4 tw-backdrop-blur-md',
      isDark ? 'tw-bg-slate-950/70' : 'tw-bg-slate-950/50',
    ].join(' ')} onClick={onCancel}>
      <div
        className={[
          'tw-w-full tw-max-w-xl tw-rounded-2xl tw-shadow-2xl tw-ring-1',
          isDark ? 'tw-bg-slate-900 tw-ring-slate-700' : 'tw-bg-white tw-ring-slate-200',
        ].join(' ')}
        onClick={(event) => event.stopPropagation()}
      >
        <div className={['tw-border-b tw-px-6 tw-py-4', isDark ? 'tw-border-slate-700' : 'tw-border-slate-200'].join(' ')}>
          <h3 className={['tw-text-lg tw-font-semibold', isDark ? 'tw-text-slate-100' : 'tw-text-slate-900'].join(' ')}>{title}</h3>
        </div>

        <div className="tw-space-y-3 tw-px-6 tw-py-4">
          <p className={['tw-text-sm tw-leading-relaxed', isDark ? 'tw-text-slate-300' : 'tw-text-slate-600'].join(' ')}>{description}</p>
          {bullets.length ? (
            <ul className={['tw-space-y-2 tw-text-sm', isDark ? 'tw-text-slate-300' : 'tw-text-slate-700'].join(' ')}>
              {bullets.map((item) => (
                <li key={item} className="tw-flex tw-items-start tw-gap-2">
                  <span className={['tw-mt-1 tw-h-1.5 tw-w-1.5 tw-rounded-full', isDark ? 'tw-bg-slate-500' : 'tw-bg-slate-400'].join(' ')} />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        <div className={['tw-flex tw-justify-end tw-gap-3 tw-border-t tw-px-6 tw-py-4', isDark ? 'tw-border-slate-700' : 'tw-border-slate-200'].join(' ')}>
          <button
            type="button"
            className={[
              'tw-rounded-xl tw-border tw-px-4 tw-py-2 tw-text-sm tw-font-semibold',
              isDark
                ? 'tw-border-slate-600 tw-bg-slate-800 tw-text-slate-200 hover:tw-bg-slate-700'
                : 'tw-border-slate-300 tw-bg-white tw-text-slate-700 hover:tw-bg-slate-50',
            ].join(' ')}
            onClick={onCancel}
            disabled={loading}
          >
            {cancelText}
          </button>
          <button
            type="button"
            className={[
              'tw-rounded-xl tw-px-4 tw-py-2 tw-text-sm tw-font-semibold tw-text-white',
              danger ? 'tw-bg-rose-600 hover:tw-bg-rose-700' : 'tw-bg-slate-900 hover:tw-bg-slate-800',
              loading ? 'tw-opacity-70 tw-cursor-not-allowed' : '',
            ].join(' ')}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? 'Working...' : confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}
