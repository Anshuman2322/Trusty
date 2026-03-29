import { Bell, Menu, ShieldCheck } from 'lucide-react'

export function TopBar({ isDark, adminEmail, notifications, onLogout, onToggleMobile }) {
  const initials = String(adminEmail || 'AD')
    .split('@')[0]
    .split(/[._-]/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('') || 'AD'

  return (
    <header
      className={[
        'tw-sticky tw-top-0 tw-z-30 tw-px-1 tw-py-2 md:tw-px-2',
        isDark ? 'tw-bg-transparent' : 'tw-bg-transparent',
      ].join(' ')}
    >
      <div
        className={[
          'tw-flex tw-items-center tw-justify-between tw-gap-4 tw-rounded-2xl tw-border tw-px-4 tw-py-3 md:tw-px-6',
          isDark ? 'tw-border-[#233650] tw-bg-[#111f34]' : 'tw-border-[#d6e4f2] tw-bg-white',
        ].join(' ')}
        style={{
          boxShadow: 'var(--admin-shadow)',
          background: isDark
            ? 'radial-gradient(360px 160px at 8% -20%, rgba(34,211,238,0.18), transparent 68%), #111f34'
            : 'radial-gradient(360px 160px at 8% -20%, rgba(2,132,199,0.2), transparent 68%), linear-gradient(180deg, rgba(14,165,183,0.12), rgba(14,165,183,0.03)), #ffffff',
        }}
      >
        <div className="tw-flex tw-items-center tw-gap-3">
          <button
            type="button"
            className={[
              'lg:tw-hidden tw-inline-flex tw-items-center tw-gap-1.5 tw-rounded-xl tw-border tw-px-3 tw-py-1.5 tw-text-sm tw-font-semibold tw-transition-all tw-duration-200 hover:tw-shadow-sm',
              isDark
                ? 'tw-border-[#2b4d81] tw-bg-[#163761] tw-text-slate-100 hover:tw-bg-[#1c4378]'
                : 'tw-border-[#d6e4f2] tw-bg-[#ecfeff] tw-text-[#0f172a] hover:tw-bg-[#dff8ff]',
            ].join(' ')}
            onClick={onToggleMobile}
          >
            <Menu size={15} />
            Menu
          </button>
          <div>
            <div className={['tw-text-xs tw-uppercase tw-tracking-[0.18em] tw-font-semibold', isDark ? 'tw-text-slate-400' : 'tw-text-[#4b5f79]'].join(' ')}>Admin Workspace</div>
            <div className={['tw-text-xl tw-font-semibold', isDark ? 'tw-text-slate-100' : 'tw-text-[#0f172a]'].join(' ')}>Trust Monitoring Console</div>
          </div>
        </div>

        <div className="tw-flex tw-items-center tw-gap-3">
          <div className={[
            'tw-hidden md:tw-inline-flex tw-items-center tw-gap-2 tw-rounded-xl tw-border tw-px-3 tw-py-2 tw-text-sm tw-font-medium',
            isDark ? 'tw-border-emerald-700/40 tw-bg-emerald-500/15 tw-text-emerald-300' : 'tw-border-emerald-200 tw-bg-emerald-50 tw-text-emerald-700',
          ].join(' ')}>
            <ShieldCheck size={14} />
            System Healthy
          </div>

          <button
            type="button"
            className={[
              'tw-relative tw-rounded-xl tw-border tw-p-2.5 tw-transition-all tw-duration-200 hover:tw-scale-[1.03] hover:tw-shadow-sm',
              isDark
                ? 'tw-border-[#2b4d81] tw-bg-[#163761] tw-text-slate-100'
                : 'tw-border-[#d6e4f2] tw-bg-white tw-text-[#0f172a]',
            ].join(' ')}
            aria-label="Notifications"
          >
            <Bell size={18} />
            <span className="tw-absolute -tw-right-1 -tw-top-1 tw-inline-flex tw-min-w-5 tw-items-center tw-justify-center tw-rounded-full tw-bg-rose-600 tw-px-1.5 tw-py-0.5 tw-text-[10px] tw-font-semibold tw-text-white">
              {notifications}
            </span>
          </button>

          <div className={[
            'tw-hidden sm:tw-flex tw-h-10 tw-w-10 tw-items-center tw-justify-center tw-rounded-full tw-text-xs tw-font-bold tw-tracking-wide tw-text-white',
            isDark ? 'tw-bg-slate-700' : 'tw-bg-[#0F172A]',
          ].join(' ')}>
            {initials}
          </div>

          <button
            type="button"
            className="tw-rounded-xl tw-border tw-border-[#0f172a] tw-bg-[#0f172a] tw-px-3 tw-py-2 tw-text-sm tw-font-semibold tw-text-white tw-shadow-sm tw-transition-all tw-duration-200 hover:tw-scale-[1.02] hover:tw-bg-slate-800 hover:tw-shadow-md"
            onClick={onLogout}
          >
            Logout
          </button>
        </div>
      </div>
    </header>
  )
}
