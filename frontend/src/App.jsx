import { Link, NavLink, Navigate, Route, Routes } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import './App.css'

import { PublicView } from './pages/PublicView'
import { VendorDashboard } from './pages/VendorDashboard'
import { AdminDashboard } from './pages/AdminDashboard'
import { apiGet } from './lib/api'

function App() {
  const [vendors, setVendors] = useState([])
  const [vendorsLoading, setVendorsLoading] = useState(true)
  const [vendorsError, setVendorsError] = useState('')

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

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <Link to="/" className="brandLink">
            <div className="brandTitle">TrustLens</div>
            <div className="brandSubtitle">Secure & Transparent Feedback Verification (Demo)</div>
          </Link>
        </div>
        <nav className="nav">
          <NavLink className={({ isActive }) => (isActive ? 'navLink active' : 'navLink')} to="/public">
            Public
          </NavLink>
          <NavLink className={({ isActive }) => (isActive ? 'navLink active' : 'navLink')} to="/vendor">
            Vendor
          </NavLink>
          <NavLink className={({ isActive }) => (isActive ? 'navLink active' : 'navLink')} to="/admin">
            Admin
          </NavLink>
        </nav>
      </header>

      <main className="container">
        {vendorsError ? <div className="alert error">{vendorsError}</div> : null}
        {vendorsLoading ? <div className="muted">Loading vendors…</div> : null}

        <Routes>
          <Route path="/" element={<Navigate to="/public" replace />} />
          <Route
            path="/public"
            element={<PublicView vendors={vendors} defaultVendorId={defaultVendorId} />}
          />
          <Route
            path="/vendor"
            element={<VendorDashboard vendors={vendors} defaultVendorId={defaultVendorId} />}
          />
          <Route path="/admin" element={<AdminDashboard />} />
        </Routes>
      </main>

      <footer className="footer">
        <div className="muted">
          Public is open. Vendor/Admin require login.
        </div>
      </footer>
    </div>
  )
}

export default App
