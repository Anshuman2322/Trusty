export function KpiCard({ isDark, title, value, tone = 'slate', subtitle }) {
  const toneClass = {
    slate: 'tw-bg-blue-500',
    blue: 'tw-bg-blue-500',
    green: 'tw-bg-[#22C55E]',
    amber: 'tw-bg-[#F59E0B]',
    rose: 'tw-bg-[#EF4444]',
  }

  return (
    <div className={[
      'tw-group tw-relative tw-overflow-hidden tw-rounded-2xl tw-border tw-bg-white tw-p-5 tw-shadow-soft tw-transition-all tw-duration-200 hover:-tw-translate-y-0.5',
      isDark ? 'tw-border-[#233650] tw-bg-[#111f34]' : 'tw-border-[#d6e4f2] tw-bg-white',
    ].join(' ')}>
      <span className={[
        'tw-absolute tw-left-0 tw-top-0 tw-h-full tw-w-1.5',
        toneClass[tone] || toneClass.slate,
      ].join(' ')} />
      <p className={['tw-pl-2 tw-text-sm tw-font-semibold', isDark ? 'tw-text-slate-400' : 'tw-text-[#4b5f79]'].join(' ')}>{title}</p>
      <p className={['tw-mt-2 tw-pl-2 tw-text-3xl tw-font-bold tw-tracking-tight tw-leading-none', isDark ? 'tw-text-slate-100' : 'tw-text-[#0f172a]'].join(' ')}>{value}</p>
      {subtitle ? <p className={['tw-mt-2 tw-pl-2 tw-text-xs tw-font-medium', isDark ? 'tw-text-slate-400' : 'tw-text-[#4b5f79]'].join(' ')}>{subtitle}</p> : null}
    </div>
  )
}

export function StatusBadge({ status }) {
  const normalized = String(status || '').toLowerCase()
  const cls =
    normalized === 'trusted'
      ? 'tw-bg-emerald-50 tw-text-emerald-700 tw-ring-1 tw-ring-emerald-200'
      : normalized === 'medium'
        ? 'tw-bg-amber-50 tw-text-amber-700 tw-ring-1 tw-ring-amber-200'
        : normalized === 'terminated'
          ? 'tw-bg-rose-50 tw-text-rose-700 tw-ring-1 tw-ring-rose-200'
          : 'tw-bg-red-50 tw-text-red-700 tw-ring-1 tw-ring-red-200'

  return (
    <span className={['tw-inline-flex tw-items-center tw-rounded-full tw-px-2.5 tw-py-1 tw-text-xs tw-font-semibold tw-capitalize', cls].join(' ')}>
      {status}
    </span>
  )
}

export function SectionCard({ title, subtitle, actions, children }) {
  return (
    <section className="tw-rounded-xl tw-border tw-border-[var(--admin-card-border,#d6e4f2)] tw-bg-[var(--admin-card-bg,#fff)] tw-shadow-soft tw-transition-all tw-duration-200 hover:-tw-translate-y-0.5">
      <div className="tw-flex tw-flex-wrap tw-items-start tw-justify-between tw-gap-2 tw-border-b tw-border-[var(--admin-card-border,#d6e4f2)] tw-px-4 tw-py-3">
        <div>
          <h2 className="tw-text-lg tw-font-semibold tw-tracking-tight tw-text-[var(--admin-text-primary,#0f172a)]">{title}</h2>
          {subtitle ? <p className="tw-mt-0.5 tw-text-sm tw-font-medium tw-text-[var(--admin-text-secondary,#4b5f79)]">{subtitle}</p> : null}
        </div>
        {actions ? <div className="tw-flex tw-flex-wrap tw-items-center tw-gap-2">{actions}</div> : null}
      </div>
      <div className="tw-p-4 md:tw-p-4 lg:tw-p-5">{children}</div>
    </section>
  )
}

export function InsightsCard({ isDark, icon: Icon, title, message, tone = 'blue' }) {
  const toneClass = {
    blue: 'tw-text-blue-700 tw-bg-blue-50 tw-border-blue-200',
    amber: 'tw-text-amber-700 tw-bg-amber-50 tw-border-amber-200',
    rose: 'tw-text-rose-700 tw-bg-rose-50 tw-border-rose-200',
    green: 'tw-text-emerald-700 tw-bg-emerald-50 tw-border-emerald-200',
  }

  return (
    <article
      className={[
        'tw-rounded-2xl tw-border tw-p-4 tw-shadow-soft tw-transition-all tw-duration-200 hover:-tw-translate-y-0.5',
        isDark ? 'tw-border-[#233650] tw-bg-[#111f34]' : 'tw-border-[#d6e4f2] tw-bg-white',
      ].join(' ')}
    >
      <div className="tw-flex tw-items-start tw-gap-3">
        <span className={['tw-inline-flex tw-h-8 tw-w-8 tw-items-center tw-justify-center tw-rounded-lg tw-border', toneClass[tone] || toneClass.blue].join(' ')}>
          {Icon ? <Icon size={16} /> : null}
        </span>
        <div>
          <h3 className={['tw-text-sm tw-font-semibold', isDark ? 'tw-text-slate-100' : 'tw-text-[#0f172a]'].join(' ')}>{title}</h3>
          <p className={['tw-mt-1 tw-text-xs tw-font-medium', isDark ? 'tw-text-slate-400' : 'tw-text-[#4b5f79]'].join(' ')}>{message}</p>
        </div>
      </div>
    </article>
  )
}

export function AlertCard({ isDark, title, description, severity = 'LOW', relatedVendor }) {
  const normalized = String(severity || 'LOW').toUpperCase()
  const severityClass = isDark
    ? normalized === 'HIGH'
      ? 'tw-border-l-4 tw-border-l-[#EF4444] tw-border-rose-900/50 tw-bg-rose-950/30'
      : normalized === 'MEDIUM'
        ? 'tw-border-l-4 tw-border-l-[#F59E0B] tw-border-amber-900/50 tw-bg-amber-950/30'
        : 'tw-border-l-4 tw-border-l-[#22C55E] tw-border-emerald-900/50 tw-bg-emerald-950/25'
    : normalized === 'HIGH'
      ? 'tw-border-l-4 tw-border-l-[#EF4444] tw-border-[#FECACA] tw-bg-red-50'
      : normalized === 'MEDIUM'
        ? 'tw-border-l-4 tw-border-l-[#F59E0B] tw-border-[#FDE68A] tw-bg-orange-50'
        : 'tw-border-l-4 tw-border-l-[#22C55E] tw-border-[#BBF7D0] tw-bg-emerald-50'

  const badgeClass = isDark
    ? normalized === 'HIGH'
      ? 'tw-bg-rose-900/40 tw-text-rose-200'
      : normalized === 'MEDIUM'
        ? 'tw-bg-amber-900/40 tw-text-amber-200'
        : 'tw-bg-emerald-900/35 tw-text-emerald-200'
    : normalized === 'HIGH'
      ? 'tw-bg-[#FEE2E2] tw-text-[#B91C1C]'
      : normalized === 'MEDIUM'
        ? 'tw-bg-[#FEF3C7] tw-text-[#B45309]'
        : 'tw-bg-[#DCFCE7] tw-text-[#166534]'

  return (
    <article className={['tw-rounded-2xl tw-border tw-p-4 tw-shadow-soft tw-transition-all tw-duration-200 hover:-tw-translate-y-0.5', severityClass].join(' ')}>
      <div className="tw-flex tw-items-center tw-justify-between tw-gap-2">
        <h3 className={['tw-text-sm tw-font-semibold', isDark ? 'tw-text-slate-100' : 'tw-text-[#0F172A]'].join(' ')}>{title}</h3>
        <span className={['tw-rounded-full tw-px-2 tw-py-0.5 tw-text-[11px] tw-font-semibold', badgeClass].join(' ')}>{normalized}</span>
      </div>
      <p className={['tw-mt-1 tw-text-sm tw-font-medium', isDark ? 'tw-text-slate-200' : 'tw-text-[#0f172a]'].join(' ')}>{description}</p>
      <p className={['tw-mt-2 tw-text-xs tw-font-semibold', isDark ? 'tw-text-slate-400' : 'tw-text-[#4b5f79]'].join(' ')}>Related vendor: {relatedVendor || 'Unknown'}</p>
    </article>
  )
}

export function AnalyticsChart({ isDark, children }) {
  return (
    <div className={[
      'tw-h-72 tw-w-full tw-rounded-2xl tw-border tw-p-3 tw-shadow-soft',
      isDark ? 'tw-border-[#233650] tw-bg-[#111f34]' : 'tw-border-[#d6e4f2] tw-bg-white',
    ].join(' ')}>
      {children}
    </div>
  )
}
