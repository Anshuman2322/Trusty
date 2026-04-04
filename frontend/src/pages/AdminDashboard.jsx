import { useCallback, useEffect, useMemo, useState } from 'react'
import { apiGet, apiGetBlob, apiPost } from '../lib/api'
import { clearSession, getSession, setSession } from '../lib/session'
import { AdminLayout } from '../components/admin/AdminLayout'
import { ConfirmationModal } from '../components/admin/ConfirmationModal'
import { DashboardPage } from './admin/DashboardPage'
import { VendorsPage } from './admin/VendorsPage'
import { VendorDetailPage } from './admin/VendorDetailPage'
import { VendorProfilePage } from './admin/VendorProfilePage'
import { FeedbackPage } from './admin/FeedbackPage'
import { RiskAlertsPage } from './admin/RiskAlertsPage'
import { AnalyticsPage } from './admin/AnalyticsPage'
import { PatternsPage } from './admin/PatternsPage'
import { ReportsPage } from './admin/ReportsPage'
import { SettingsPage } from './admin/SettingsPage'
import { TicketsPage } from './admin/TicketsPage'

const FEEDBACK_PREVIEW_LIMIT = 300
const ADMIN_THEME_MODE_KEY = 'trusty.admin.themeMode'

const initialSettings = {
  trustThresholds: { trustedMin: 71, mediumMin: 40 },
  fraudSensitivity: 'MEDIUM',
  alerts: {
    repeatedDeviceMin: 3,
    networkReviewMin: 3,
    duplicateClusterMin: 2,
    vendorSpikeMin: 8,
  },
}

export function AdminDashboard() {
  const [themeMode, setThemeMode] = useState(() => {
    if (typeof window === 'undefined') return 'light'
    const stored = String(window.localStorage.getItem(ADMIN_THEME_MODE_KEY) || '').toLowerCase()
    return stored === 'dark' ? 'dark' : 'light'
  })
  const isDark = themeMode === 'dark'
  const [sessionState, setSessionState] = useState(() => getSession())
  const isAuthedAdmin = Boolean(sessionState?.token) && sessionState?.user?.role === 'ADMIN'

  const [activeSection, setActiveSection] = useState('dashboard')
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  const [overview, setOverview] = useState(null)
  const [vendors, setVendors] = useState([])
  const [alerts, setAlerts] = useState([])
  const [feedbacks, setFeedbacks] = useState([])
  const [analytics, setAnalytics] = useState(null)
  const [patterns, setPatterns] = useState(null)
  const [settings, setSettings] = useState(initialSettings)
  const [vendorDetail, setVendorDetail] = useState(null)
  const [vendorProfile, setVendorProfile] = useState(null)
  const [logs, setLogs] = useState([])
  const [tickets, setTickets] = useState([])
  const [ticketStatusFilter, setTicketStatusFilter] = useState('all')
  const [ticketLastSyncedAt, setTicketLastSyncedAt] = useState('')
  const [ticketReplyDrafts, setTicketReplyDrafts] = useState({})
  const [ticketReplyingId, setTicketReplyingId] = useState('')
  const [ticketStatusBusyId, setTicketStatusBusyId] = useState('')

  const [feedbackFilters, setFeedbackFilters] = useState({
    trust: 'ALL',
    anonymous: false,
    duplicate: false,
    vendorId: '',
  })

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [exporting, setExporting] = useState('')
  const [savingSettings, setSavingSettings] = useState(false)
  const [actionBusy, setActionBusy] = useState(false)

  const [modalState, setModalState] = useState({
    open: false,
    type: 'terminate',
    vendorId: '',
    title: '',
    description: '',
    bullets: [],
  })

  const [loginForm, setLoginForm] = useState({ email: '', password: '', otp: '' })
  const [otpRequired, setOtpRequired] = useState(false)
  const [authHint, setAuthHint] = useState('')
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false)

  const notificationCount = useMemo(
    () => alerts.filter((item) => item.severity === 'HIGH' || item.severity === 'MEDIUM').length,
    [alerts]
  )

  async function loadBootstrap() {
    setLoading(true)
    setError('')
    try {
      const [
        overviewRes,
        vendorsRes,
        alertsRes,
        feedbackRes,
        analyticsRes,
        patternsRes,
        settingsRes,
        logsRes,
        ticketsRes,
      ] =
        await Promise.all([
          apiGet('/api/admin/overview'),
          apiGet('/api/admin/vendors'),
          apiGet('/api/admin/alerts'),
          apiGet(`/api/admin/feedbacks?limit=${FEEDBACK_PREVIEW_LIMIT}`),
          apiGet('/api/admin/analytics'),
          apiGet('/api/admin/patterns'),
          apiGet('/api/admin/settings'),
          apiGet('/api/admin/logs?limit=12'),
          apiGet('/api/support/admin/tickets'),
        ])

      setOverview(overviewRes.overview || null)
      setVendors(vendorsRes.vendors || [])
      setAlerts(alertsRes.alerts || [])
      setFeedbacks(feedbackRes.feedbacks || [])
      setAnalytics(analyticsRes.analytics || null)
      setPatterns(patternsRes.patterns || null)
      setSettings(settingsRes.settings || initialSettings)
      setLogs(logsRes.logs || [])
      setTickets(ticketsRes.tickets || [])
    } catch (e) {
      setError(e?.message || 'Failed to load admin dashboard')
    } finally {
      setLoading(false)
    }
  }

  async function onLogin(event) {
    event.preventDefault()
    try {
      setError('')
      setAuthHint('')
      const data = await apiPost('/api/auth/login', loginForm)
      if (data?.requiresOtp) {
        setOtpRequired(true)
        setAuthHint(data?.message || 'OTP sent to your email. Enter it to continue login.')
        return
      }
      setSession({ token: data.token, user: data.user })
      setSessionState({ token: data.token, user: data.user })
    } catch (e) {
      setError(e?.message || 'Login failed')
    }
  }

  function onLogout() {
    clearSession()
    setSessionState(null)
    setOverview(null)
    setVendors([])
    setAlerts([])
    setFeedbacks([])
    setAnalytics(null)
    setPatterns(null)
    setVendorDetail(null)
    setVendorProfile(null)
    setLogs([])
    setTickets([])
    setTicketReplyDrafts({})
    setTicketReplyingId('')
    setTicketStatusBusyId('')
    setActiveSection('dashboard')
  }

  function requestLogout() {
    setLogoutConfirmOpen(true)
  }

  function cancelLogout() {
    setLogoutConfirmOpen(false)
  }

  function confirmLogout() {
    setLogoutConfirmOpen(false)
    onLogout()
  }

  function changeSection(next) {
    if (next === 'logout') {
      requestLogout()
      return
    }
    setActiveSection(next)
    setMobileOpen(false)
  }

  async function refreshCollections() {
    const [vendorsRes, alertsRes, overviewRes] = await Promise.all([
      apiGet('/api/admin/vendors'),
      apiGet('/api/admin/alerts'),
      apiGet('/api/admin/overview'),
    ])
    setVendors(vendorsRes.vendors || [])
    setAlerts(alertsRes.alerts || [])
    setOverview(overviewRes.overview || null)
  }

  async function onFlagVendor(vendorId) {
    try {
      setActionBusy(true)
      await apiPost(`/api/admin/vendors/${vendorId}/flag`, {
        reason: 'Flagged from admin risk panel',
      })
      await refreshCollections()
    } catch (e) {
      setError(e?.message || 'Failed to flag vendor')
    } finally {
      setActionBusy(false)
    }
  }

  function openTerminateModal(vendorId) {
    setModalState({
      open: true,
      type: 'terminate',
      vendorId,
      title: 'Are you sure you want to terminate this vendor account?',
      description: 'This action immediately places the account under enforcement and removes active vendor access.',
      bullets: [
        'Vendor will lose dashboard access.',
        'Vendor cannot create new orders.',
        'Existing data remains read-only for audit trail.',
      ],
    })
  }

  async function onConfirmModalAction() {
    if (!modalState.vendorId) return

    try {
      setActionBusy(true)
      if (modalState.type === 'terminate') {
        await apiPost(`/api/admin/vendors/${modalState.vendorId}/terminate`, {
          reason: 'Terminated by admin after risk review',
        })
      } else if (modalState.type === 'reactivate') {
        await apiPost(`/api/admin/vendors/${modalState.vendorId}/reactivate`, {
          reason: 'Reactivated by admin after review',
        })
      }
      await refreshCollections()
      setModalState((prev) => ({ ...prev, open: false }))
    } catch (e) {
      setError(e?.message || 'Failed to update vendor status')
    } finally {
      setActionBusy(false)
    }
  }

  function openReactivateModal(vendorId) {
    setModalState({
      open: true,
      type: 'reactivate',
      vendorId,
      title: 'Reactivate this vendor account?',
      description: 'This re-enables vendor authentication and dashboard operations.',
      bullets: [
        'Vendor can sign in again.',
        'Vendor can create and manage orders.',
        'All previous enforcement logs remain preserved.',
      ],
    })
  }

  async function onViewVendorDetails(vendorId) {
    try {
      setActionBusy(true)
      const data = await apiGet(`/api/admin/vendors/${vendorId}/details`)
      setVendorDetail(data.detail || null)
      setActiveSection('vendor-detail')
    } catch (e) {
      setError(e?.message || 'Failed to load vendor detail')
    } finally {
      setActionBusy(false)
    }
  }

  async function onViewVendorProfile(vendorId) {
    try {
      setActionBusy(true)
      const data = await apiGet(`/api/admin/vendors/${vendorId}/profile`)
      setVendorProfile(data.profile || null)
      setActiveSection('vendor-profile')
    } catch (e) {
      setError(e?.message || 'Failed to load vendor profile')
    } finally {
      setActionBusy(false)
    }
  }

  function onViewVendorFeedback(vendorId) {
    setFeedbackFilters((prev) => ({ ...prev, vendorId }))
    setActiveSection('feedbacks')
  }

  async function onSaveSettings() {
    try {
      setSavingSettings(true)
      const data = await apiPost('/api/admin/settings', settings)
      setSettings(data.settings || settings)
    } catch (e) {
      setError(e?.message || 'Failed to save admin settings')
    } finally {
      setSavingSettings(false)
    }
  }

  async function onExportReport(type) {
    try {
      setExporting(type)
      const blob = await apiGetBlob(`/api/admin/reports/export?type=${encodeURIComponent(type)}`)
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download =
        type === 'vendor' ? 'vendor-report.csv' : type === 'analytics' ? 'analytics-report.csv' : 'feedback-report.csv'
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (e) {
      setError(e?.message || 'Failed to export report')
    } finally {
      setExporting('')
    }
  }

  const refreshTickets = useCallback(async (status = ticketStatusFilter) => {
    const query = status && status !== 'all' ? `?status=${encodeURIComponent(status)}` : ''
    const data = await apiGet(`/api/support/admin/tickets${query}`)
    setTickets(data?.tickets || [])
    setTicketLastSyncedAt(new Date().toISOString())
  }, [ticketStatusFilter])

  async function onTicketStatusFilterChange(next) {
    try {
      setTicketStatusFilter(next)
      await refreshTickets(next)
    } catch (e) {
      setError(e?.message || 'Failed to filter tickets')
    }
  }

  function onTicketReplyDraftChange(ticketId, text) {
    setTicketReplyDrafts((prev) => ({ ...prev, [ticketId]: text }))
  }

  async function onReplyTicket(ticketId, replyText) {
    try {
      setTicketReplyingId(ticketId)
      await apiPost(`/api/support/admin/tickets/${ticketId}/reply`, { reply: replyText })
      setTicketReplyDrafts((prev) => ({ ...prev, [ticketId]: '' }))
      await refreshTickets(ticketStatusFilter)
    } catch (e) {
      setError(e?.message || 'Failed to reply ticket')
    } finally {
      setTicketReplyingId('')
    }
  }

  async function onUpdateTicketStatus(ticketId, status) {
    try {
      setTicketStatusBusyId(ticketId)
      await apiPost(`/api/support/admin/tickets/${ticketId}/status`, { status })
      await refreshTickets(ticketStatusFilter)
    } catch (e) {
      setError(e?.message || 'Failed to update ticket status')
    } finally {
      setTicketStatusBusyId('')
    }
  }

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(ADMIN_THEME_MODE_KEY, themeMode)

    // Keep global theme and body surface aligned with admin workspace mode.
    window.localStorage.setItem('trusty-theme', themeMode)
    document.body.dataset.theme = themeMode
    window.dispatchEvent(new CustomEvent('trusty-theme-change', { detail: { theme: themeMode } }))
  }, [themeMode])

  useEffect(() => {
    if (!isAuthedAdmin) return
    loadBootstrap()
  }, [isAuthedAdmin])

  useEffect(() => {
    if (!isAuthedAdmin || activeSection !== 'tickets') return undefined

    const tick = () => {
      refreshTickets(ticketStatusFilter).catch(() => {
        // Ignore transient auto-refresh failures.
      })
    }

    tick()
    const timer = window.setInterval(tick, 15000)
    return () => window.clearInterval(timer)
  }, [activeSection, isAuthedAdmin, ticketStatusFilter, refreshTickets])

  if (!isAuthedAdmin) {
    return (
      <div className={[
        'tw-mx-auto tw-max-w-md tw-rounded-3xl tw-border tw-p-6 tw-shadow-md',
        isDark ? 'tw-border-slate-700 tw-bg-slate-900' : 'tw-border-slate-200 tw-bg-white',
      ].join(' ')}>
        <h1 className={['tw-text-xl tw-font-semibold', isDark ? 'tw-text-slate-100' : 'tw-text-slate-900'].join(' ')}>Admin Login</h1>
        <p className={['tw-mt-1 tw-text-sm tw-font-medium', isDark ? 'tw-text-slate-300' : 'tw-text-slate-600'].join(' ')}>Secure auditor access for TrustLens control panel.</p>

        {error ? <div className="tw-mt-4 tw-rounded-xl tw-bg-rose-50 tw-p-3 tw-text-sm tw-text-rose-700">{error}</div> : null}
        {authHint ? <div className={['tw-mt-4 tw-rounded-xl tw-p-3 tw-text-sm', isDark ? 'tw-bg-emerald-950/60 tw-text-emerald-200' : 'tw-bg-emerald-50 tw-text-emerald-700'].join(' ')}>{authHint}</div> : null}

        <form className="tw-mt-5 tw-space-y-3" onSubmit={onLogin}>
          <label className={['tw-block tw-text-sm tw-font-medium', isDark ? 'tw-text-slate-200' : 'tw-text-slate-700'].join(' ')}>
            Email
            <input
              className={[
                'tw-mt-1 tw-w-full tw-rounded-xl tw-border tw-px-3 tw-py-2 tw-outline-none tw-ring-offset-0 focus:tw-ring-2',
                isDark
                  ? 'tw-border-slate-700 tw-bg-slate-800 tw-text-slate-100 focus:tw-ring-sky-900'
                  : 'tw-border-slate-300 tw-bg-white tw-text-slate-900 focus:tw-ring-sky-100',
              ].join(' ')}
              value={loginForm.email}
              onChange={(event) => setLoginForm((prev) => ({ ...prev, email: event.target.value }))}
              placeholder="trustylens@gmail.com"
            />
          </label>

          <label className={['tw-block tw-text-sm tw-font-medium', isDark ? 'tw-text-slate-200' : 'tw-text-slate-700'].join(' ')}>
            Password
            <input
              type="password"
              className={[
                'tw-mt-1 tw-w-full tw-rounded-xl tw-border tw-px-3 tw-py-2 tw-outline-none tw-ring-offset-0 focus:tw-ring-2',
                isDark
                  ? 'tw-border-slate-700 tw-bg-slate-800 tw-text-slate-100 focus:tw-ring-sky-900'
                  : 'tw-border-slate-300 tw-bg-white tw-text-slate-900 focus:tw-ring-sky-100',
              ].join(' ')}
              value={loginForm.password}
              onChange={(event) => setLoginForm((prev) => ({ ...prev, password: event.target.value }))}
              placeholder="Anshu@2322"
            />
          </label>

          {otpRequired ? (
            <label className={['tw-block tw-text-sm tw-font-medium', isDark ? 'tw-text-slate-200' : 'tw-text-slate-700'].join(' ')}>
              Gmail OTP
              <input
                className={[
                  'tw-mt-1 tw-w-full tw-rounded-xl tw-border tw-px-3 tw-py-2 tw-outline-none tw-ring-offset-0 focus:tw-ring-2',
                  isDark
                    ? 'tw-border-slate-700 tw-bg-slate-800 tw-text-slate-100 focus:tw-ring-sky-900'
                    : 'tw-border-slate-300 tw-bg-white tw-text-slate-900 focus:tw-ring-sky-100',
                ].join(' ')}
                value={loginForm.otp}
                onChange={(event) => setLoginForm((prev) => ({ ...prev, otp: event.target.value }))}
                placeholder="Enter 6-digit OTP"
              />
            </label>
          ) : null}

          <button
            type="submit"
            className="tw-w-full tw-rounded-xl tw-bg-slate-900 tw-px-3 tw-py-2 tw-text-sm tw-font-semibold tw-text-white hover:tw-bg-slate-800"
          >
            {otpRequired ? 'Verify OTP & Login' : 'Send OTP'}
          </button>
        </form>
      </div>
    )
  }

  const filteredFeedbacks = feedbacks.filter((item) => {
    if (feedbackFilters.vendorId && String(item.vendorId) !== String(feedbackFilters.vendorId)) return false
    return true
  })

  return (
    <>
      <AdminLayout
        isDark={isDark}
        activeSection={activeSection}
        onSectionChange={changeSection}
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        adminEmail={sessionState?.user?.email || 'admin'}
        notifications={notificationCount}
        onToggleCollapse={() => setCollapsed((prev) => !prev)}
        onToggleMobile={() => setMobileOpen((prev) => !prev)}
        onCloseMobile={() => setMobileOpen(false)}
        onLogout={requestLogout}
      >
        {error ? (
          <div
            className={[
              'tw-mb-4 tw-rounded-xl tw-p-3 tw-text-sm',
              isDark ? 'tw-bg-rose-950/60 tw-text-rose-200' : 'tw-bg-rose-50 tw-text-rose-700',
            ].join(' ')}
          >
            {error}
          </div>
        ) : null}
        {loading ? <div className={['tw-mb-4 tw-text-sm', isDark ? 'tw-text-slate-300' : 'tw-text-slate-600'].join(' ')}>Loading admin data...</div> : null}
        {actionBusy ? <div className={['tw-mb-4 tw-text-sm', isDark ? 'tw-text-slate-300' : 'tw-text-slate-600'].join(' ')}>Applying action...</div> : null}

        {activeSection === 'dashboard' ? (
          <DashboardPage isDark={isDark} overview={overview} alerts={alerts} analytics={analytics} logs={logs} />
        ) : null}

        {activeSection === 'vendors' ? (
          <VendorsPage
            isDark={isDark}
            vendors={vendors}
            onViewDetails={onViewVendorDetails}
            onViewProfile={onViewVendorProfile}
            onViewFeedback={onViewVendorFeedback}
            onFlag={onFlagVendor}
            onTerminate={openTerminateModal}
            onReactivate={openReactivateModal}
          />
        ) : null}

        {activeSection === 'vendor-detail' ? <VendorDetailPage isDark={isDark} detail={vendorDetail} /> : null}

        {activeSection === 'vendor-profile' ? <VendorProfilePage isDark={isDark} profile={vendorProfile} /> : null}

        {activeSection === 'feedbacks' ? (
          <FeedbackPage
            isDark={isDark}
            feedbacks={filteredFeedbacks}
            filters={feedbackFilters}
            onFilterChange={setFeedbackFilters}
          />
        ) : null}

        {activeSection === 'alerts' ? <RiskAlertsPage isDark={isDark} alerts={alerts} onFlagVendor={onFlagVendor} /> : null}

        {activeSection === 'analytics' ? <AnalyticsPage isDark={isDark} analytics={analytics} /> : null}

        {activeSection === 'patterns' ? <PatternsPage isDark={isDark} patterns={patterns} /> : null}

        {activeSection === 'reports' ? <ReportsPage isDark={isDark} onExport={onExportReport} exporting={exporting} /> : null}

        {activeSection === 'tickets' ? (
          <TicketsPage
            isDark={isDark}
            tickets={tickets}
            statusFilter={ticketStatusFilter}
            lastSyncedAt={ticketLastSyncedAt}
            onFilterChange={onTicketStatusFilterChange}
            replyDrafts={ticketReplyDrafts}
            onReplyDraftChange={onTicketReplyDraftChange}
            replyingId={ticketReplyingId}
            statusBusyId={ticketStatusBusyId}
            onReply={onReplyTicket}
            onStatus={onUpdateTicketStatus}
            onRefresh={() => refreshTickets(ticketStatusFilter)}
          />
        ) : null}

        {activeSection === 'settings' ? (
          <SettingsPage
            isDark={isDark}
            themeMode={themeMode}
            onThemeModeChange={setThemeMode}
            settings={settings}
            onChange={setSettings}
            onSave={onSaveSettings}
            saving={savingSettings}
          />
        ) : null}
      </AdminLayout>

      <ConfirmationModal
        isDark={isDark}
        open={modalState.open}
        title={modalState.title}
        description={modalState.description}
        bullets={modalState.bullets}
        confirmText={modalState.type === 'terminate' ? 'Confirm Termination' : 'Confirm Reactivation'}
        cancelText="Cancel"
        danger={modalState.type === 'terminate'}
        loading={actionBusy}
        onCancel={() => setModalState((prev) => ({ ...prev, open: false }))}
        onConfirm={onConfirmModalAction}
      />

      <ConfirmationModal
        isDark={isDark}
        open={logoutConfirmOpen}
        title="Log out of Admin Workspace?"
        description="You are about to end this secure admin session on this device."
        bullets={[
          'You will need to verify email, password, and OTP to sign in again.',
          'Any unsaved dashboard changes will be lost.',
        ]}
        confirmText="Yes, Log Out"
        cancelText="Stay Logged In"
        danger
        onCancel={cancelLogout}
        onConfirm={confirmLogout}
      />
    </>
  )
}
