import { Link, NavLink, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import './App.css'

import { HomePage } from './pages/HomePage'
import { HowItWorksPage } from './pages/HowItWorksPage'
import { AboutPage } from './pages/AboutPage'
import { TransparencyPage } from './pages/TransparencyPage'
import { VendorPage } from './pages/VendorPage'
import { VendorLoginPage } from './pages/VendorLoginPage'
import { VendorSignupPage } from './pages/VendorSignupPage'
import { ForgotPasswordPage } from './pages/ForgotPasswordPage'
import { PublicView } from './pages/PublicView'
import { VendorDashboard } from './pages/VendorDashboard'
import { VendorAnalyticsPage } from './pages/VendorAnalyticsPage'
import { AdminDashboard } from './pages/AdminDashboard'
import { Chatbot } from './components/Chatbot'
import { apiGet } from './lib/api'
import { getSession } from './lib/session'

function getInitialTheme() {
  if (typeof window === 'undefined') return 'light'
  const stored = window.localStorage.getItem('trusty-theme')
  if (stored === 'light' || stored === 'dark') return stored
  return 'light'
}

function isVendorSession(session) {
  return Boolean(session?.token) && session?.user?.role === 'VENDOR' && Boolean(session?.user?.vendorId)
}

function RequireVendorAuth({ children }) {
  const location = useLocation()
  const session = getSession()

  if (!isVendorSession(session)) {
    return <Navigate to="/vendor/login" replace state={{ from: location.pathname }} />
  }

  return children
}

function App() {
  const location = useLocation()
  const [vendors, setVendors] = useState([])
  const [vendorsLoading, setVendorsLoading] = useState(true)
  const [vendorsError, setVendorsError] = useState('')
  const [theme, setTheme] = useState(getInitialTheme)
  const [topbarMenuOpen, setTopbarMenuOpen] = useState(false)
  const isMarketingRoute = ['/', '/how-it-works', '/vendor', '/public', '/about', '/transparency'].includes(location.pathname)
  const isVendorWorkspaceRoute = location.pathname.startsWith('/vendor/dashboard') || location.pathname.startsWith('/vendor/analytics')
  const isAdminWorkspaceRoute = location.pathname.startsWith('/admin')

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        setVendorsLoading(true)
        setVendorsError('')
        const data = await apiGet('/api/public/vendors')
        if (!cancelled) setVendors(data.vendors || [])
      } catch (e) {
        if (!cancelled) setVendorsError(e?.message || 'Failed to load vendors')
      } finally {
        if (!cancelled) setVendorsLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  const defaultVendorId = useMemo(() => {
    return vendors?.[0]?._id || ''
  }, [vendors])

  useEffect(() => {
    document.body.dataset.theme = theme
    window.localStorage.setItem('trusty-theme', theme)
  }, [theme])

  useEffect(() => {
    if (typeof window === 'undefined') return undefined

    const onThemeChange = (event) => {
      const nextTheme = String(event?.detail?.theme || '')
      if (nextTheme !== 'light' && nextTheme !== 'dark') return
      setTheme(nextTheme)
    }

    window.addEventListener('trusty-theme-change', onThemeChange)
    return () => window.removeEventListener('trusty-theme-change', onThemeChange)
  }, [])

  useEffect(() => {
    setTopbarMenuOpen(false)
  }, [location.pathname, location.search])

  function onToggleTheme() {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))
  }

  return (
    <div className="app">
      {!isAdminWorkspaceRoute ? (
        <header className="topbar">
        <div className="brand">
          <Link to="/" className="brandLink">
            <div className="brandTitle">Trusty</div>
            <div className="brandSubtitle">Privacy-safe AI verification with blockchain proof</div>
          </Link>
        </div>

        <button
          type="button"
          className="topbarMenuButton"
          aria-label={topbarMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
          aria-expanded={topbarMenuOpen}
          aria-controls="topbar-actions"
          onClick={() => setTopbarMenuOpen((prev) => !prev)}
        >
          {topbarMenuOpen ? '×' : '☰'}
        </button>

        <div id="topbar-actions" className={topbarMenuOpen ? 'topbarActions is-open' : 'topbarActions'}>
          <nav className="nav">
            <NavLink className={({ isActive }) => (isActive ? 'navLink active' : 'navLink')} to="/" onClick={() => setTopbarMenuOpen(false)}>
              Home
            </NavLink>
            <NavLink className={({ isActive }) => (isActive ? 'navLink active' : 'navLink')} to="/how-it-works" onClick={() => setTopbarMenuOpen(false)}>
              How It Works
            </NavLink>
            <NavLink className={({ isActive }) => (isActive ? 'navLink active' : 'navLink')} to="/public" onClick={() => setTopbarMenuOpen(false)}>
              Reviews
            </NavLink>
            <NavLink className={({ isActive }) => (isActive ? 'navLink active' : 'navLink')} to="/vendor" onClick={() => setTopbarMenuOpen(false)}>
              Vendors
            </NavLink>
            <NavLink className={({ isActive }) => (isActive ? 'navLink active' : 'navLink')} to="/transparency" onClick={() => setTopbarMenuOpen(false)}>
              Transparency
            </NavLink>
            <NavLink className={({ isActive }) => (isActive ? 'navLink active' : 'navLink')} to="/about" onClick={() => setTopbarMenuOpen(false)}>
              About
            </NavLink>
          </nav>
          <button type="button" className="themeToggle" onClick={onToggleTheme} aria-label="Toggle color theme">
            <span className={theme === 'light' ? 'themeIcon active' : 'themeIcon'}>☀️</span>
            <span className="themeDivider">/</span>
            <span className={theme === 'dark' ? 'themeIcon active' : 'themeIcon'}>🌙</span>
          </button>
        </div>
        </header>
      ) : null}

      <main className={isAdminWorkspaceRoute ? '' : isMarketingRoute ? 'container container--landing' : isVendorWorkspaceRoute ? 'container container--workspace' : 'container'}>
        {vendorsError ? <div className="alert error">{vendorsError}</div> : null}
        {vendorsLoading ? <div className="muted">Loading vendors…</div> : null}

        <Routes>
          <Route
            path="/"
            element={<HomePage vendors={vendors} defaultVendorId={defaultVendorId} />}
          />
          <Route path="/how-it-works" element={<HowItWorksPage />} />
          <Route path="/vendor" element={<VendorPage />} />
          <Route path="/vendor/login" element={<VendorLoginPage />} />
          <Route path="/vendor/signup" element={<VendorSignupPage />} />
          <Route path="/vendor/forgot-password" element={<ForgotPasswordPage />} />
          <Route
            path="/public"
            element={<PublicView vendors={vendors} defaultVendorId={defaultVendorId} />}
          />
          <Route path="/transparency" element={<TransparencyPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route
            path="/vendor/dashboard"
            element={(
              <RequireVendorAuth>
                <VendorDashboard />
              </RequireVendorAuth>
            )}
          />
          <Route
            path="/vendor/analytics"
            element={(
              <RequireVendorAuth>
                <VendorAnalyticsPage />
              </RequireVendorAuth>
            )}
          />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      {!isAdminWorkspaceRoute ? (
        <footer className="footer">
        <div className="muted">Public pages are open. Vendor and Admin dashboards require login.</div>
        </footer>
      ) : null}

      {!isAdminWorkspaceRoute ? <Chatbot /> : null}
    </div>
  )
}

export default App
