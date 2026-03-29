import {
  BarChart3,
  Building2,
  ChevronLeft,
  ChevronRight,
  FileBarChart2,
  Fingerprint,
  LayoutDashboard,
  LogOut,
  MessageSquareText,
  ScrollText,
  Settings,
  ShieldAlert,
} from 'lucide-react'

const navItems = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'vendors', label: 'Vendors', icon: Building2 },
  { key: 'feedbacks', label: 'Feedbacks', icon: MessageSquareText },
  { key: 'alerts', label: 'Risk Alerts', icon: ShieldAlert },
  { key: 'analytics', label: 'Analytics', icon: BarChart3 },
  { key: 'patterns', label: 'Patterns', icon: Fingerprint },
  { key: 'tickets', label: 'Support Tickets', icon: ScrollText },
  { key: 'reports', label: 'Reports', icon: FileBarChart2 },
  { key: 'settings', label: 'Settings', icon: Settings },
  { key: 'logout', label: 'Logout', icon: LogOut },
]

export function Sidebar({
  isDark,
  collapsed,
  mobileOpen,
  active,
  onSelect,
  onCloseMobile,
  onToggleCollapse,
  alertCount,
}) {
  return (
    <>
      <div
        className={mobileOpen ? 'tw-fixed tw-inset-0 tw-z-40 tw-bg-slate-950/35 lg:tw-hidden' : 'tw-hidden'}
        onClick={onCloseMobile}
      />
      <aside
        className={[
          'tw-fixed tw-z-50 tw-left-3 tw-top-4 tw-bottom-4 tw-border',
          isDark
            ? 'tw-bg-[#111f34] tw-text-[#E2E8F0] tw-border-[#233650]'
            : 'tw-bg-white tw-text-[#0f172a] tw-border-[#d6e4f2]',
          collapsed ? 'tw-w-[88px]' : 'tw-w-[270px]',
          mobileOpen ? 'tw-translate-x-0' : '-tw-translate-x-full lg:tw-translate-x-0',
          'tw-rounded-2xl tw-shadow-soft tw-transition-all tw-duration-300 tw-ease-out',
        ].join(' ')}
        style={{
          boxShadow: 'var(--admin-shadow)',
          background: isDark
            ? 'linear-gradient(170deg, rgba(34,211,238,0.08), rgba(59,130,246,0.04)), #111f34'
            : 'linear-gradient(170deg, rgba(14,165,183,0.08), rgba(79,70,229,0.04)), #ffffff',
        }}
      >
        <div className="tw-h-full tw-flex tw-flex-col">
          <div
            className={[
              'tw-flex tw-items-center tw-border-b tw-py-5',
              collapsed ? 'tw-justify-center tw-px-2' : 'tw-justify-between tw-px-4',
              isDark ? 'tw-border-[#233650]' : 'tw-border-[#d6e4f2]',
            ].join(' ')}
          >
            {collapsed ? (
              <button
                type="button"
                className={[
                  'tw-inline-flex tw-h-9 tw-w-9 tw-items-center tw-justify-center tw-rounded-xl tw-border tw-text-xs tw-font-bold tw-tracking-wide tw-appearance-none',
                  isDark ? 'tw-border-[#2b4d81] tw-bg-[#163761] tw-text-slate-100' : 'tw-border-[#d6e4f2] tw-bg-[#ecfeff] tw-text-slate-700',
                ].join(' ')}
                onClick={() => {
                  onSelect('dashboard')
                  onCloseMobile()
                }}
                aria-label="Open dashboard"
              >
                TL
              </button>
            ) : (
              <button
                type="button"
                className="tw-text-left tw-bg-transparent tw-border-0 tw-p-0 tw-appearance-none"
                onClick={() => {
                  onSelect('dashboard')
                  onCloseMobile()
                }}
              >
                <div className={['tw-text-xs tw-uppercase tw-tracking-[0.2em]', isDark ? 'tw-text-slate-400' : 'tw-text-cyan-700'].join(' ')}>TrustLens</div>
                <div className={['tw-text-sm tw-font-semibold', isDark ? 'tw-text-slate-100' : 'tw-text-[#0f172a]'].join(' ')}>Admin Control</div>
              </button>
            )}
            <button
              type="button"
              onClick={onToggleCollapse}
              className={[
                'tw-rounded-xl tw-border tw-px-2 tw-py-1 tw-text-xs tw-appearance-none tw-transition',
                isDark
                  ? 'tw-border-[#2b4d81] tw-bg-[#163761] tw-text-slate-200 hover:tw-bg-[#1c4378]'
                  : 'tw-border-[#d6e4f2] tw-bg-[#ecfeff] tw-text-slate-700 hover:tw-bg-[#dff8ff]',
              ].join(' ')}
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
            </button>
          </div>

          <nav className="tw-flex-1 tw-overflow-y-auto tw-p-3 tw-space-y-2">
            {navItems.map((item) => {
              const isActive = active === item.key
              const Icon = item.icon
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => {
                    onSelect(item.key)
                    onCloseMobile()
                  }}
                  className={[
                    'tw-w-full tw-flex tw-items-center tw-justify-between tw-rounded-[12px] tw-border tw-px-3 tw-py-2.5 tw-text-left tw-text-sm tw-font-semibold tw-transition-all tw-duration-200 tw-appearance-none tw-outline-none focus:tw-ring-2 focus:tw-ring-blue-500/40',
                    isActive
                      ? isDark
                        ? 'tw-border-[#2b4d81] tw-bg-[#163761] tw-text-white'
                        : 'tw-border-[rgba(14,165,183,0.45)] tw-bg-[rgba(14,165,183,0.14)] tw-text-[#0f172a]'
                      : isDark
                        ? 'tw-border-[#233650] tw-bg-[#111f34] tw-text-slate-200 hover:tw-border-[#2b4d81] hover:tw-bg-[#163761] hover:tw-text-white'
                        : 'tw-border-transparent tw-bg-transparent tw-text-[#0f172a] hover:tw-border-[#d6e4f2] hover:tw-bg-[rgba(14,165,183,0.09)] hover:-tw-translate-y-0.5',
                  ].join(' ')}
                >
                  <span className={['tw-flex tw-items-center tw-gap-2.5', collapsed ? 'tw-mx-auto' : ''].join(' ')}>
                    <Icon size={16} />
                    {!collapsed ? item.label : null}
                  </span>
                  {item.key === 'alerts' && !collapsed ? (
                    <span className={[
                      'tw-inline-flex tw-min-w-6 tw-items-center tw-justify-center tw-rounded-full tw-px-2 tw-py-0.5 tw-text-[11px] tw-font-semibold',
                      isDark ? 'tw-bg-rose-500/20 tw-text-rose-100' : 'tw-bg-rose-100 tw-text-rose-700 tw-ring-1 tw-ring-rose-200 tw-shadow-sm',
                    ].join(' ')}>
                      {alertCount}
                    </span>
                  ) : null}
                </button>
              )
            })}
          </nav>

          <div className={['tw-border-t tw-p-4 tw-text-xs', isDark ? 'tw-border-[#233650] tw-text-slate-300/80' : 'tw-border-[#d6e4f2] tw-text-[#4b5f79]'].join(' ')}>
            {!collapsed ? 'Auditor mode: read-only for feedback content, full monitoring control.' : 'Audit'}
          </div>
        </div>
      </aside>
    </>
  )
}
