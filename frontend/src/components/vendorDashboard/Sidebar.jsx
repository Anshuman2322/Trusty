function SidebarIcon({ kind }) {
  if (kind === 'dashboard') {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <rect x="4" y="4" width="7" height="7" rx="1.4" stroke="currentColor" strokeWidth="1.8" />
        <rect x="13" y="4" width="7" height="4" rx="1.4" stroke="currentColor" strokeWidth="1.8" />
        <rect x="13" y="10" width="7" height="10" rx="1.4" stroke="currentColor" strokeWidth="1.8" />
        <rect x="4" y="13" width="7" height="7" rx="1.4" stroke="currentColor" strokeWidth="1.8" />
      </svg>
    )
  }

  if (kind === 'orders') {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M6 6h13l-1.2 8.2a2 2 0 01-2 1.8H9a2 2 0 01-2-1.7L6 6z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
        <path d="M6 6L5 3H3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    )
  }

  if (kind === 'payments') {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <rect x="3" y="6" width="18" height="12" rx="2" stroke="currentColor" strokeWidth="1.8" />
        <path d="M3 10h18" stroke="currentColor" strokeWidth="1.8" />
        <circle cx="16.5" cy="14" r="1.4" fill="currentColor" />
      </svg>
    )
  }

  if (kind === 'feedback') {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M4 6h16v10H8l-4 3V6z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
        <path d="M8 10h8M8 13h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    )
  }

  if (kind === 'messages') {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M4 6h16v9H8l-4 3V6z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
        <path d="M8 10h8M8 13h5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    )
  }

  if (kind === 'leads') {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M5 7h14M5 12h14M5 17h8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <circle cx="17.5" cy="17.5" r="3.5" stroke="currentColor" strokeWidth="1.8" />
      </svg>
    )
  }

  if (kind === 'analytics') {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M4 18V8M10 18V6M16 18v-4M20 18V9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    )
  }

  if (kind === 'customers') {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="9" cy="9" r="3" stroke="currentColor" strokeWidth="1.8" />
        <circle cx="16" cy="10" r="2" stroke="currentColor" strokeWidth="1.8" />
        <path d="M4.5 18a4.5 4.5 0 019 0M13 18a3 3 0 016 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    )
  }

  if (kind === 'profile') {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="8.5" r="3.2" stroke="currentColor" strokeWidth="1.8" />
        <path d="M5 19a7 7 0 0114 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    )
  }

  if (kind === 'settings') {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="12" r="2.4" stroke="currentColor" strokeWidth="1.8" />
        <path d="M19.4 15a1 1 0 00.2 1.1l.1.1a1.9 1.9 0 01-2.7 2.7l-.1-.1a1 1 0 00-1.1-.2 1 1 0 00-.6.9V20a2 2 0 01-4 0v-.2a1 1 0 00-.6-.9 1 1 0 00-1.1.2l-.1.1a1.9 1.9 0 11-2.7-2.7l.1-.1a1 1 0 00.2-1.1 1 1 0 00-.9-.6H4a2 2 0 010-4h.2a1 1 0 00.9-.6 1 1 0 00-.2-1.1l-.1-.1a1.9 1.9 0 012.7-2.7l.1.1a1 1 0 001.1.2h.1a1 1 0 00.6-.9V4a2 2 0 014 0v.2a1 1 0 00.6.9 1 1 0 001.1-.2l.1-.1a1.9 1.9 0 012.7 2.7l-.1.1a1 1 0 00-.2 1.1v.1a1 1 0 00.9.6H20a2 2 0 010 4h-.2a1 1 0 00-.9.6z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      </svg>
    )
  }

  if (kind === 'logout') {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M9 4H6a2 2 0 00-2 2v12a2 2 0 002 2h3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M16 16l4-4-4-4M20 12H9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  }

  return null
}

const MENU_ITEMS = [
  { key: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
  { key: 'orders', label: 'Orders', icon: 'orders' },
  { key: 'payments', label: 'Payments', icon: 'payments' },
  { key: 'feedback', label: 'Feedback', icon: 'feedback' },
  { key: 'messages', label: 'Messages', icon: 'messages' },
  { key: 'leads', label: 'Leads', icon: 'leads' },
  { key: 'analytics', label: 'Analytics', icon: 'analytics' },
  { key: 'customers', label: 'Customers', icon: 'customers' },
  { key: 'profile', label: 'Profile', icon: 'profile' },
  { key: 'settings', label: 'Settings', icon: 'settings' },
]

export function Sidebar({
  collapsed,
  onToggle,
  activeItem,
  onSelect,
  onLogout,
  mobileOpen = false,
  onMobileClose = () => {},
}) {
  const sidebarClass = [
    'vdSidebar',
    collapsed ? 'is-collapsed' : '',
    mobileOpen ? 'is-mobile-open' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <aside className={sidebarClass} id="vendor-sidebar">
      <div className="vdSidebarTop">
        <button className="vdSidebarToggle" type="button" onClick={onToggle} aria-label="Toggle sidebar">
          {collapsed ? '>' : '<'}
        </button>

        <div className="vdBrand">
          <div className="vdBrandTitle">Trusty</div>
          <div className="vdBrandSubtitle">Vendor Workspace</div>
        </div>

        <button className="vdSidebarMobileClose" type="button" onClick={onMobileClose} aria-label="Close sidebar">
          ×
        </button>
      </div>

      <nav className="vdNav" aria-label="Vendor navigation">
        {MENU_ITEMS.map((item) => {
          const active = activeItem === item.key
          return (
            <button
              key={item.key}
              className={active ? 'vdNavItem is-active' : 'vdNavItem'}
              type="button"
              onClick={() => {
                onSelect(item.key)
                onMobileClose()
              }}
            >
              <span className="vdNavIcon" aria-hidden="true">
                <SidebarIcon kind={item.icon} />
              </span>
              <span className="vdNavLabel">{item.label}</span>
            </button>
          )
        })}
      </nav>

      <div className="vdSidebarBottom">
        <button
          className="vdNavItem vdNavItem--logout"
          type="button"
          onClick={() => {
            onMobileClose()
            onLogout()
          }}
        >
          <span className="vdNavIcon" aria-hidden="true">
            <SidebarIcon kind="logout" />
          </span>
          <span className="vdNavLabel">Logout</span>
        </button>
      </div>
    </aside>
  )
}
