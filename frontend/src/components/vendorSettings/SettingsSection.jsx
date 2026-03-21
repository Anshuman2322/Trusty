export function SettingsSection({ title, subtitle, icon, children }) {
  return (
    <section className="vendorSettingsCard tw-rounded-2xl tw-border tw-border-slate-200 tw-bg-white tw-p-5 tw-shadow-soft">
      <header className="tw-mb-4 tw-flex tw-items-start tw-gap-3">
        {icon ? (
          <div className="tw-flex tw-h-10 tw-w-10 tw-shrink-0 tw-items-center tw-justify-center tw-overflow-hidden tw-rounded-xl tw-bg-cyan-50 tw-text-cyan-700">
            {icon}
          </div>
        ) : null}

        <div>
          <h3 className="tw-text-base tw-font-bold tw-text-slate-800">{title}</h3>
          {subtitle ? <p className="tw-text-sm tw-text-slate-500">{subtitle}</p> : null}
        </div>
      </header>

      <div className="tw-grid tw-gap-3">{children}</div>
    </section>
  )
}
