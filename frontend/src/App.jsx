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
import { Footer } from './components/Footer'
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
  const session = getSession()
  const [vendors, setVendors] = useState([])
  const [vendorsLoading, setVendorsLoading] = useState(true)
  const [vendorsError, setVendorsError] = useState('')
  const [theme, setTheme] = useState(getInitialTheme)
  const [topbarMenuOpen, setTopbarMenuOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)
  const isMarketingRoute = ['/', '/how-it-works', '/vendor', '/public', '/about', '/transparency'].includes(location.pathname)
  const isVendorWorkspaceRoute =
    location.pathname.startsWith('/vendor/dashboard') ||
    location.pathname.startsWith('/vendor/analytics') ||
    location.pathname.startsWith('/vendor/app')
  const isAdminWorkspaceRoute = location.pathname.startsWith('/admin')
  const hideTopbar = isAdminWorkspaceRoute || (isVendorWorkspaceRoute && isVendorSession(session))

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

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.scrollTo(0, 0)
  }, [location.pathname, location.search])

  useEffect(() => {
    if (typeof window === 'undefined') return undefined

    const onScroll = () => {
      setIsScrolled(window.scrollY > 10)
    }

    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  function onToggleTheme() {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))
  }

  function onNavItemClick() {
    setTopbarMenuOpen(false)
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
    }
  }

  return (
    <div className={isAdminWorkspaceRoute ? 'app app--admin' : isVendorWorkspaceRoute ? 'app app--vendor-workspace' : 'app'}>
      {!hideTopbar ? (
        <header
          className={`topbar sticky top-0 z-50 !min-h-[64px] !items-center !gap-3 !border-b transition-all duration-300 ${
            isScrolled
              ? '!border-gray-200 !bg-white !shadow-sm'
              : '!border-transparent !bg-white/70 !shadow-none !backdrop-blur-md'
          }`}
          style={{ position: 'sticky', top: 0, zIndex: 50 }}
        >
        <div className="brand">
          <Link to="/" className="brandLink !leading-tight" aria-label="TrustLens home">
            <span className="brandMark" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" className="brandMarkIcon">
                <path d="M12 3l7 3v5c0 5-3.2 8.6-7 10-3.8-1.4-7-5-7-10V6l7-3z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <span className="brandIdentity">
              <span className="brandTitle !font-bold !tracking-[0.02em]">
                Trust<span className="brandAccent">Lens</span>
              </span>
              <span className="brandSubtitle !text-slate-500">Privacy-safe AI verification with blockchain proof</span>
            </span>
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
          <nav className="nav !items-center !gap-4 lg:!gap-[18px]">
            <NavLink
              className={({ isActive }) =>
                `navLink !rounded-full !px-[14px] !py-[6px] !font-medium !text-[#475569] !transition-colors !duration-200 hover:!text-[#0ea5e9] ${
                  isActive ? '!bg-[#e0f2fe] !text-[#0284c7]' : ''
                }`
              }
              to="/"
              onClick={onNavItemClick}
            >
              Home
            </NavLink>
            <NavLink
              className={({ isActive }) =>
                `navLink !rounded-full !px-[14px] !py-[6px] !font-medium !text-[#475569] !transition-colors !duration-200 hover:!text-[#0ea5e9] ${
                  isActive ? '!bg-[#e0f2fe] !text-[#0284c7]' : ''
                }`
              }
              to="/how-it-works"
              onClick={onNavItemClick}
            >
              How It Works
            </NavLink>
            <NavLink
              className={({ isActive }) =>
                `navLink !rounded-full !px-[14px] !py-[6px] !font-medium !text-[#475569] !transition-colors !duration-200 hover:!text-[#0ea5e9] ${
                  isActive ? '!bg-[#e0f2fe] !text-[#0284c7]' : ''
                }`
              }
              to="/public"
              onClick={onNavItemClick}
            >
              Reviews
            </NavLink>
            <NavLink
              className={({ isActive }) =>
                `navLink !rounded-full !px-[14px] !py-[6px] !font-medium !text-[#475569] !transition-colors !duration-200 hover:!text-[#0ea5e9] ${
                  isActive ? '!bg-[#e0f2fe] !text-[#0284c7]' : ''
                }`
              }
              to="/vendor"
              onClick={onNavItemClick}
            >
              Vendors
            </NavLink>
            <NavLink
              className={({ isActive }) =>
                `navLink !rounded-full !px-[14px] !py-[6px] !font-medium !text-[#475569] !transition-colors !duration-200 hover:!text-[#0ea5e9] ${
                  isActive ? '!bg-[#e0f2fe] !text-[#0284c7]' : ''
                }`
              }
              to="/transparency"
              onClick={onNavItemClick}
            >
              Transparency
            </NavLink>
            <NavLink
              className={({ isActive }) =>
                `navLink !rounded-full !px-[14px] !py-[6px] !font-medium !text-[#475569] !transition-colors !duration-200 hover:!text-[#0ea5e9] ${
                  isActive ? '!bg-[#e0f2fe] !text-[#0284c7]' : ''
                }`
              }
              to="/about"
              onClick={onNavItemClick}
            >
              About
            </NavLink>
          </nav>
          <button
            type="button"
            className="themeToggle !rounded-full !border !border-[#e5e7eb] !px-3 !py-1.5 !shadow-[0_1px_2px_rgba(15,23,42,0.08)]"
            onClick={onToggleTheme}
            aria-label="Toggle color theme"
          >
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

      {!isVendorWorkspaceRoute ? <Footer /> : null}

      {!isAdminWorkspaceRoute ? <Chatbot /> : null}
    </div>
  )
}

export default App
