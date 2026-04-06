import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'

export function AdminLayout({
  isDark,
  children,
  activeSection,
  onSectionChange,
  collapsed,
  mobileOpen,
  adminEmail,
  notifications,
  onToggleCollapse,
  onToggleMobile,
  onCloseMobile,
  onLogout,
}) {
  const themeVars = isDark
    ? {
        '--admin-card-bg': '#111f34',
        '--admin-card-border': '#233650',
        '--admin-text-primary': '#e2e8f0',
        '--admin-text-secondary': '#a4bad2',
        '--admin-page-bg': '#081226',
        '--admin-shadow': '0 28px 42px -30px rgba(2, 6, 23, 0.88)',
      }
    : {
        '--admin-card-bg': '#ffffff',
        '--admin-card-border': '#d6e4f2',
        '--admin-text-primary': '#0f172a',
        '--admin-text-secondary': '#4b5f79',
        '--admin-page-bg': '#eef4fb',
        '--admin-shadow': '0 18px 34px -24px rgba(15, 23, 42, 0.34)',
      }

  return (
    <div
      className={[
        'tw-relative tw-min-h-screen tw-overflow-x-hidden',
        isDark ? 'tw-bg-[#081226] tw-text-slate-100' : 'tw-bg-[#eef4fb] tw-text-[#0f172a]',
      ].join(' ')}
      style={{ ...themeVars, backgroundColor: 'var(--admin-page-bg)' }}
    >
      <div
        className="tw-pointer-events-none tw-absolute tw-inset-0"
        style={{
          background: isDark
            ? 'radial-gradient(950px 420px at 10% -12%, rgba(56,189,248,0.13), transparent 60%), radial-gradient(860px 380px at 100% -14%, rgba(37,99,235,0.18), transparent 62%)'
            : 'radial-gradient(920px 420px at 5% -14%, rgba(2,132,199,0.16), transparent 60%), radial-gradient(860px 360px at 100% -14%, rgba(14,165,183,0.12), transparent 62%)',
        }}
      />

      <Sidebar
        isDark={isDark}
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        active={activeSection}
        onSelect={onSectionChange}
        onCloseMobile={onCloseMobile}
        onToggleCollapse={onToggleCollapse}
        alertCount={notifications}
      />

      <div className={[
        'tw-relative tw-z-[1]',
        collapsed ? 'lg:tw-ml-[88px] tw-transition-[margin] tw-duration-300' : 'lg:tw-ml-[244px] tw-transition-[margin] tw-duration-300',
      ].join(' ')}>
        <div className={[
          'tw-fixed tw-top-0 tw-right-0 tw-z-50 tw-transition-[left] tw-duration-300',
          collapsed ? 'lg:tw-left-[88px]' : 'lg:tw-left-[244px]',
          'tw-left-0',
        ].join(' ')}>
          <TopBar
            isDark={isDark}
            adminEmail={adminEmail}
            notifications={notifications}
            onLogout={onLogout}
            onToggleMobile={onToggleMobile}
          />
        </div>

        <main className="tw-px-3 tw-pt-20 tw-pb-4 md:tw-px-4 md:tw-pt-22 md:tw-pb-5 lg:tw-px-5 lg:tw-pt-22 lg:tw-pb-6">
          <div className="tw-mx-auto tw-w-full tw-max-w-7xl">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
