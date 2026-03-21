import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { FeedbackExplanation } from '../components/FeedbackExplanation'
import {
  AlertsPanel,
  AnalyticsPage,
  ChartsSection,
  CustomerInsights,
  DashboardCards,
  InsightsPanel,
  OrdersTable,
  Sidebar,
  buildAlerts,
  buildCustomerInsights,
  buildFeedbackDistribution,
  buildOrdersVsFeedback,
  buildQuickInsights,
  buildTrustTrend,
  mapFeedbackByOrderId,
  normalizeScore,
  trustLabel,
} from '../components/vendorDashboard'
import { ProfilePage } from '../components/vendorProfile'
import { SettingsPage } from '../components/vendorSettings'
import { apiGet, apiPost } from '../lib/api'
import { clearSession, getSession } from '../lib/session'
import './VendorDashboard.css'

const DELIVERY_OPTIONS = [
  'CREATED',
  'DISPATCHED',
  'IN_TRANSIT',
  'IN_CUSTOMS',
  'OUT_OF_CUSTOMS',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
]

const DASHBOARD_VIEWS = new Set([
  'dashboard',
  'orders',
  'payments',
  'feedback',
  'analytics',
  'customers',
  'profile',
  'settings',
])

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function normalizeView(value, fallback = 'dashboard') {
  const key = String(value || '').toLowerCase().trim()
  if (DASHBOARD_VIEWS.has(key)) return key
  return fallback
}

function shortId(id) {
  const s = String(id || '')
  if (s.length <= 10) return s
  return `${s.slice(0, 10)}...`
}

function formatDate(iso) {
  if (!iso) return 'N/A'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return 'N/A'
  return d.toLocaleDateString()
}

function formatLocationText(location) {
  if (!location) return 'Location unavailable'
  const parts = [location.city, location.state, location.country || location.countryCode]
    .map((value) => String(value || '').trim())
    .filter(Boolean)
  return parts.length ? parts.join(', ') : 'Location unavailable'
}

function formatFeedbackLocation(feedback) {
  return formatLocationText({
    city: feedback?.ipCity,
    state: feedback?.ipState || feedback?.ipRegion,
    country: feedback?.ipCountryName || feedback?.ipCountry,
  })
}

function feedbackTone(score) {
  const n = normalizeScore(score)
  if (n >= 70) return 'good'
  if (n >= 40) return 'warn'
  return 'danger'
}

function feedbackTagTone(tag) {
  if (tag === 'AI Verified') return 'good'
  if (tag === 'Blockchain Anchored' || tag === 'Blockchain Verified') return 'info'
  if (tag === 'Payment Verified' || tag === 'Verified') return 'good'
  if (tag === 'Delivered') return 'neutral'
  return 'neutral'
}

function applyWorkspaceTheme(isDarkMode) {
  if (typeof document === 'undefined' || typeof window === 'undefined') return
  const theme = isDarkMode ? 'dark' : 'light'
  document.body.dataset.theme = theme
  window.localStorage.setItem('trusty-theme', theme)
  window.dispatchEvent(new CustomEvent('trusty-theme-change', { detail: { theme } }))
}

function FeedbackSection({ feedbacks }) {
  return (
    <section className="vdSection">
      <div className="vdSectionHead">
        <h2>Customer Feedback</h2>
        <p>Read-only feed with trust labels, risk metadata, and explainability traces.</p>
      </div>

      {feedbacks.length === 0 ? <div className="vdTableEmpty">No feedback submitted yet.</div> : null}

      <div className="vdFeedbackList">
        {feedbacks.map((feedback) => (
          <article className="vdFeedbackCard" key={feedback._id}>
            <div className="vdFeedbackScore">
              <strong>{normalizeScore(feedback.trustScore)}</strong>
              <span>{trustLabel(feedback.trustScore)}</span>
            </div>

            <div className="vdFeedbackBody">
              <div className="vdFeedbackMeta">
                <span className={`vdTone vdTone--${feedbackTone(feedback.trustScore)}`}>{feedback.trustLevel || trustLabel(feedback.trustScore)}</span>
                <span className={feedback.codeValid ? 'vdTone vdTone--good' : 'vdTone vdTone--neutral'}>{feedback.codeValid ? 'Verified' : 'Anonymous'}</span>
                {feedback.blockchain?.txRef ? <span className="vdTone vdTone--info">Blockchain Anchored</span> : null}
                {(feedback.tags || [])
                  .filter((tag) => tag !== 'Blockchain Anchored' && tag !== 'Verified')
                  .slice(0, 5)
                  .map((tag) => (
                    <span className={`vdTone vdTone--${feedbackTagTone(tag)}`} key={`${feedback._id}-${tag}`}>
                      {tag}
                    </span>
                  ))}
              </div>

              <p className="vdFeedbackText">{feedback.text}</p>

              <div className="vdFeedbackDetails">
                <span>Location: {formatFeedbackLocation(feedback)}</span>
                <span>Risk: {feedback.ipRiskLevel || 'UNKNOWN'}</span>
                <span>Date: {formatDate(feedback.createdAt)}</span>
                <span>
                  Blockchain: {feedback.blockchain?.txRef ? `${String(feedback.blockchain.txRef).slice(0, 12)}...` : 'N/A'}
                </span>
              </div>

              <FeedbackExplanation feedback={feedback} buttonLabel="Why this score and tags?" />
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}

export function VendorDashboard({ initialView = 'dashboard' }) {
  const navigate = useNavigate()
  const location = useLocation()

  const [sessionState, setSessionState] = useState(() => getSession())
  const vendorId = sessionState?.user?.vendorId || ''
  const [onboardingMessage, setOnboardingMessage] = useState(() => String(location.state?.onboardingMessage || ''))

  const routeDefaultView = location.pathname.startsWith('/vendor/analytics')
    ? 'analytics'
    : normalizeView(initialView)

  const [activeView, setActiveView] = useState(() => {
    const queryView = new URLSearchParams(location.search).get('view')
    return normalizeView(queryView || routeDefaultView, routeDefaultView)
  })
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [sidebarMobileOpen, setSidebarMobileOpen] = useState(false)
  const [isMobileViewport, setIsMobileViewport] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.matchMedia('(max-width: 1023px)').matches
  })

  const [overview, setOverview] = useState(null)
  const [orders, setOrders] = useState([])
  const [feedbacks, setFeedbacks] = useState([])
  const [vendorProfile, setVendorProfile] = useState(null)
  const [vendorSettings, setVendorSettings] = useState(null)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [createOpen, setCreateOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [createResult, setCreateResult] = useState(null)
  const [selectedFeedback, setSelectedFeedback] = useState(null)
  const [createForm, setCreateForm] = useState({
    customerName: '',
    email: '',
    phone: '',
    address: '',
    productName: '',
    productDetails: '',
    price: '',
  })

  useEffect(() => {
    const messageFromState = location.state?.onboardingMessage
    if (!messageFromState) return
    setOnboardingMessage(String(messageFromState))
    navigate(location.pathname + location.search, { replace: true, state: {} })
  }, [location.pathname, location.search, location.state?.onboardingMessage, navigate])

  useEffect(() => {
    const queryView = new URLSearchParams(location.search).get('view')
    const fallback = location.pathname.startsWith('/vendor/analytics') ? 'analytics' : routeDefaultView
    setActiveView(normalizeView(queryView || fallback, fallback))
  }, [location.pathname, location.search, routeDefaultView])

  useEffect(() => {
    if (typeof window === 'undefined') return undefined

    const media = window.matchMedia('(max-width: 1023px)')
    const handleChange = (event) => {
      const nextMatches = Boolean(event.matches)
      setIsMobileViewport(nextMatches)
      if (!nextMatches) setSidebarMobileOpen(false)
    }

    setIsMobileViewport(media.matches)

    if (typeof media.addEventListener === 'function') {
      media.addEventListener('change', handleChange)
      return () => media.removeEventListener('change', handleChange)
    }

    media.addListener(handleChange)
    return () => media.removeListener(handleChange)
  }, [])

  useEffect(() => {
    if (!isMobileViewport) {
      document.body.classList.remove('vd-sidebar-open')
      return undefined
    }

    if (sidebarMobileOpen) document.body.classList.add('vd-sidebar-open')
    else document.body.classList.remove('vd-sidebar-open')

    return () => {
      document.body.classList.remove('vd-sidebar-open')
    }
  }, [isMobileViewport, sidebarMobileOpen])

  useEffect(() => {
    if (!sidebarMobileOpen) return undefined

    const handleEsc = (event) => {
      if (event.key === 'Escape') setSidebarMobileOpen(false)
    }

    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [sidebarMobileOpen])

  async function refresh(options = {}) {
    const allowAuthRetry = options.allowAuthRetry !== false
    if (!vendorId) return

    try {
      setLoading(true)
      setError('')

      let dashboardData = null
      try {
        dashboardData = await apiGet(`/api/vendor/${vendorId}/dashboard-bootstrap`)
      } catch (bootstrapErr) {
        if (bootstrapErr?.status !== 404) throw bootstrapErr

        try {
          const [overviewData, ordersData, feedbackData] = await Promise.all([
            apiGet(`/api/vendor/${vendorId}/overview`),
            apiGet(`/api/vendor/${vendorId}/orders`),
            apiGet(`/api/vendor/${vendorId}/feedbacks`),
          ])

          dashboardData = {
            overview: overviewData?.overview || null,
            orders: ordersData?.orders || [],
            feedbacks: feedbackData?.feedbacks || [],
          }
        } catch (fallbackErr) {
          if (fallbackErr?.status === 404) {
            const staleSessionError = new Error('Your vendor session is out of date. Please sign in again.')
            staleSessionError.status = 404
            staleSessionError.code = 'VENDOR_SESSION_STALE'
            throw staleSessionError
          }
          throw fallbackErr
        }
      }

      setOverview(dashboardData?.overview || null)
      setOrders(dashboardData?.orders || [])
      setFeedbacks(dashboardData?.feedbacks || [])
      setVendorProfile(dashboardData?.profile || null)
      setVendorSettings(dashboardData?.settings || null)
    } catch (e) {
      if (e?.status === 401 || e?.status === 403) {
        const liveSession = getSession()
        const sameVendorSession = String(liveSession?.user?.vendorId || '') === String(vendorId)

        if (allowAuthRetry && liveSession?.token && sameVendorSession) {
          await sleep(180)
          await refresh({ allowAuthRetry: false })
          return
        }

        onLogout()
        return
      }
      if (e?.status === 404 && e?.code === 'VENDOR_SESSION_STALE') {
        onLogout('Your dashboard session expired after data reset. Please log in again.')
        return
      }
      setError(e?.message || 'Failed to load vendor dashboard')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vendorId])

  useEffect(() => {
    if (!vendorSettings?.system || typeof vendorSettings.system.darkMode !== 'boolean') return
    applyWorkspaceTheme(vendorSettings.system.darkMode)
  }, [vendorSettings?.system?.darkMode])

  function onLogout(sessionMessage = '') {
    setSidebarMobileOpen(false)
    clearSession()
    setSessionState(null)
    setOverview(null)
    setOrders([])
    setFeedbacks([])
    setVendorProfile(null)
    setVendorSettings(null)
    setCreateOpen(false)
    setCreateResult(null)
    setSelectedFeedback(null)
    const state = sessionMessage ? { sessionMessage } : undefined
    navigate('/vendor/login', { replace: true, state })
  }

  async function onCreateOrder(event) {
    event.preventDefault()
    if (!vendorId) return

    try {
      setCreating(true)
      setError('')
      setCreateResult(null)

      const productDetails = [createForm.productName?.trim(), createForm.productDetails?.trim()]
        .filter(Boolean)
        .join(' - ')

      const payload = {
        customerName: createForm.customerName,
        email: createForm.email,
        phone: createForm.phone,
        address: createForm.address,
        productDetails,
        price: Number(createForm.price),
      }

      const data = await apiPost(`/api/vendor/${vendorId}/orders`, payload)
      setCreateResult(data.created)
      setCreateOpen(false)
      setCreateForm({
        customerName: '',
        email: '',
        phone: '',
        address: '',
        productName: '',
        productDetails: '',
        price: '',
      })
      await refresh()
    } catch (e) {
      setError(e?.message || 'Order creation failed')
    } finally {
      setCreating(false)
    }
  }

  async function onConfirmPayment(orderId) {
    if (!vendorId) return
    try {
      setError('')
      await apiPost(`/api/vendor/${vendorId}/orders/${orderId}/confirm-payment`, {})
      await refresh()
    } catch (e) {
      setError(e?.message || 'Failed to confirm payment')
    }
  }

  async function onUpdateDelivery(orderId, status, trackingRef) {
    if (!vendorId) return
    try {
      setError('')
      await apiPost(`/api/vendor/${vendorId}/orders/${orderId}/delivery-status`, {
        status,
        trackingRef,
        shareTracking: false,
      })
      await refresh()
    } catch (e) {
      setError(e?.message || 'Failed to update delivery status')
      throw e
    }
  }

  const pendingPayments = useMemo(() => {
    return (orders || []).filter((order) => String(order.paymentStatus || '').toUpperCase() === 'PENDING')
  }, [orders])

  const feedbackByOrderId = useMemo(() => mapFeedbackByOrderId(feedbacks), [feedbacks])

  const trustTrend = useMemo(() => buildTrustTrend(feedbacks), [feedbacks])
  const feedbackDistribution = useMemo(() => buildFeedbackDistribution(feedbacks), [feedbacks])
  const ordersVsFeedback = useMemo(() => buildOrdersVsFeedback(orders, feedbacks), [orders, feedbacks])

  const quickInsights = useMemo(() => {
    return buildQuickInsights({
      orders,
      feedbacks,
      averageTrustScore: overview?.averageTrustScore,
    })
  }, [orders, feedbacks, overview?.averageTrustScore])

  const alerts = useMemo(() => buildAlerts(feedbacks), [feedbacks])
  const customers = useMemo(() => buildCustomerInsights(orders, feedbacks), [orders, feedbacks])

  async function handleMarkDelivered(order) {
    try {
      await onUpdateDelivery(order._id, 'DELIVERED', order?.deliveryHistory?.at(-1)?.trackingRef || '')
    } catch {
      // Error state already managed in onUpdateDelivery.
    }
  }

  async function handleAddTracking(order) {
    const trackingRef = window.prompt('Enter tracking reference', order?.deliveryHistory?.at(-1)?.trackingRef || '')
    if (trackingRef === null) return

    const status = String(order?.deliveryStatus || 'DISPATCHED').toUpperCase()

    try {
      await onUpdateDelivery(order._id, status, trackingRef)
    } catch {
      // Error state already managed in onUpdateDelivery.
    }
  }

  async function handleUpdateOrder(order) {
    const statusInput = window.prompt(
      `Delivery status (${DELIVERY_OPTIONS.join(', ')})`,
      String(order?.deliveryStatus || 'DISPATCHED'),
    )
    if (statusInput === null) return

    const status = String(statusInput).trim().toUpperCase()
    if (!DELIVERY_OPTIONS.includes(status)) {
      setError(`Invalid status. Use one of: ${DELIVERY_OPTIONS.join(', ')}`)
      return
    }

    const trackingInput = window.prompt('Tracking reference (optional)', order?.deliveryHistory?.at(-1)?.trackingRef || '')
    if (trackingInput === null) return

    try {
      await onUpdateDelivery(order._id, status, trackingInput)
    } catch {
      // Error state already managed in onUpdateDelivery.
    }
  }

  function handleViewFeedback(order) {
    const feedback = feedbackByOrderId.get(String(order?._id))
    if (!feedback) {
      setError('No feedback linked to this order yet.')
      return
    }
    setSelectedFeedback(feedback)
  }

  function handleSidebarSelect(item) {
    const normalized = normalizeView(item)
    setError('')
    setActiveView(normalized)
    setSidebarMobileOpen(false)

    navigate(`/vendor/dashboard?view=${normalized}`)
  }

  function handleProfileSaved(nextProfile, nextUser) {
    if (nextProfile) {
      setVendorProfile(nextProfile)
    }

    if (nextUser) {
      setSessionState((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          user: {
            ...prev.user,
            ...nextUser,
            vendorName: nextUser.vendorName || nextProfile?.businessName || prev?.user?.vendorName,
          },
        }
      })
    }
  }

  function handleSettingsSaved(nextSettings) {
    if (nextSettings) setVendorSettings(nextSettings)
  }

  function renderBootLoader() {
    return (
      <section className="vdBootLoader" role="status" aria-live="polite" aria-label="Loading vendor dashboard">
        <div className="vdBootSpinner" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        <h2>Loading your vendor workspace</h2>
        <p>Preparing dashboard cards, orders, feedback insights, and trust analytics.</p>

        <div className="vdSkeletonGrid" aria-hidden="true">
          <div className="vdSkeleton" />
          <div className="vdSkeleton" />
          <div className="vdSkeleton" />
        </div>
      </section>
    )
  }

  function renderActiveView() {
    if (activeView === 'dashboard') {
      return (
        <>
          <DashboardCards overview={overview} />
          <InsightsPanel insights={quickInsights} />
          <ChartsSection
            title="Performance Snapshot"
            subtitle="Track trust trends, review distribution, and order-feedback balance."
            trustTrend={trustTrend}
            feedbackDistribution={feedbackDistribution}
            ordersVsFeedback={ordersVsFeedback}
          />
          <AlertsPanel alerts={alerts} />
          <OrdersTable
            title="Recent Orders"
            subtitle="Search, sort, filter, and take action from one table."
            orders={orders}
            loading={loading}
            feedbackByOrderId={feedbackByOrderId}
            onConfirmPayment={onConfirmPayment}
            onMarkDelivered={handleMarkDelivered}
            onAddTracking={handleAddTracking}
            onViewFeedback={handleViewFeedback}
            onUpdateOrder={handleUpdateOrder}
          />
        </>
      )
    }

    if (activeView === 'orders') {
      return (
        <OrdersTable
          title="Orders and Delivery"
          subtitle="Delivery flow management with actionable operations."
          orders={orders}
          loading={loading}
          feedbackByOrderId={feedbackByOrderId}
          onConfirmPayment={onConfirmPayment}
          onMarkDelivered={handleMarkDelivered}
          onAddTracking={handleAddTracking}
          onViewFeedback={handleViewFeedback}
          onUpdateOrder={handleUpdateOrder}
        />
      )
    }

    if (activeView === 'payments') {
      return (
        <OrdersTable
          title="Payments"
          subtitle={`${pendingPayments.length} pending payment${pendingPayments.length === 1 ? '' : 's'} requiring confirmation.`}
          orders={orders}
          loading={loading}
          feedbackByOrderId={feedbackByOrderId}
          initialFilter="payment-pending"
          onConfirmPayment={onConfirmPayment}
          onMarkDelivered={handleMarkDelivered}
          onAddTracking={handleAddTracking}
          onViewFeedback={handleViewFeedback}
          onUpdateOrder={handleUpdateOrder}
        />
      )
    }

    if (activeView === 'feedback') {
      return <FeedbackSection feedbacks={feedbacks} />
    }

    if (activeView === 'analytics') {
      return (
        <AnalyticsPage
          overview={overview}
          orders={orders}
          feedbacks={feedbacks}
          customers={customers}
        />
      )
    }

    if (activeView === 'customers') {
      return (
        <>
          <CustomerInsights customers={customers} />
          <AlertsPanel alerts={alerts} />
        </>
      )
    }

    if (activeView === 'profile') {
      return (
        <ProfilePage
          vendorId={vendorId}
          initialProfile={vendorProfile}
          overviewTrustScore={overview?.averageTrustScore}
          onProfileSaved={handleProfileSaved}
        />
      )
    }

    if (activeView === 'settings') {
      return (
        <SettingsPage
          vendorId={vendorId}
          initialSettings={vendorSettings}
          onSettingsSaved={handleSettingsSaved}
        />
      )
    }

    return null
  }

  return (
    <div className={sidebarMobileOpen ? 'vdShell vdShell--sidebar-open' : 'vdShell'}>
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed((prev) => !prev)}
        activeItem={activeView}
        onSelect={handleSidebarSelect}
        onLogout={onLogout}
        mobileOpen={sidebarMobileOpen}
        onMobileClose={() => setSidebarMobileOpen(false)}
      />

      <button
        type="button"
        className={sidebarMobileOpen ? 'vdSidebarScrim is-visible' : 'vdSidebarScrim'}
        aria-label="Close sidebar"
        onClick={() => setSidebarMobileOpen(false)}
      />

      <div className="vdWorkspace">
        {onboardingMessage ? <div className="vdInlineNotice">{onboardingMessage}</div> : null}

        <header className="vdTopBar">
          <div className="vdTopHeading">
            <button
              className="vdMobileMenuButton"
              type="button"
              aria-label="Open sidebar menu"
              aria-controls="vendor-sidebar"
              aria-expanded={sidebarMobileOpen}
              onClick={() => setSidebarMobileOpen(true)}
            >
              ☰
            </button>

            <div>
              <h1>{sessionState?.user?.vendorName || 'Vendor Workspace'}</h1>
              <p>Operational dashboard for trust, fulfillment, feedback, and analytics.</p>
            </div>
          </div>

          <div className="vdTopActions">
            <button className="btn secondary" type="button" onClick={refresh}>
              Refresh
            </button>
            <button
              className="btn secondary"
              type="button"
              onClick={() => navigate(activeView === 'analytics' ? '/vendor/dashboard?view=dashboard' : '/vendor/dashboard?view=analytics')}
            >
              {activeView === 'analytics' ? 'Go to Dashboard' : 'Go to Analytics'}
            </button>
            <button className="btn" type="button" onClick={() => setCreateOpen(true)}>
              + Create Order
            </button>
          </div>
        </header>

        {error ? <div className="alert error">{error}</div> : null}

  {loading && !overview ? renderBootLoader() : null}
        {!loading || overview ? <div className="vdContent">{renderActiveView()}</div> : null}

        {createResult ? (
          <section className="vdSection">
            <div className="vdSectionHead">
              <h2>Latest Order Created</h2>
              <p>Invoice and verification metadata for the most recent successful order.</p>
            </div>

            <div className="vdResultGrid">
              <div>
                <span>Invoice</span>
                <strong>{createResult.invoice?.invoiceNumber || 'N/A'}</strong>
              </div>
              <div>
                <span>Feedback Code</span>
                <strong>{createResult.order?.feedbackCode || 'N/A'}</strong>
              </div>
              <div>
                <span>Order ID</span>
                <strong>{shortId(createResult.order?._id)}</strong>
              </div>
              <div>
                <span>Order Location</span>
                <strong>{formatLocationText(createResult.order?.createdLocation)}</strong>
              </div>
            </div>
          </section>
        ) : null}
      </div>

      {createOpen ? (
        <div className="modalOverlay" role="presentation" onClick={() => setCreateOpen(false)}>
          <div className="modalCard vdModalCard" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <div className="modalHeader">
              <div>
                <div className="cardTitle" style={{ marginBottom: 0 }}>Create New Order</div>
                <div className="muted">Generate invoice and feedback code in one flow.</div>
              </div>
              <button className="btn secondary" type="button" onClick={() => setCreateOpen(false)}>Close</button>
            </div>

            <div style={{ height: 10 }} />

            <form onSubmit={onCreateOrder} className="list">
              <div className="row">
                <div className="field">
                  <label>Customer Name *</label>
                  <input
                    className="input"
                    value={createForm.customerName}
                    onChange={(event) => setCreateForm((state) => ({ ...state, customerName: event.target.value }))}
                    required
                  />
                </div>
                <div className="field">
                  <label>Customer Email *</label>
                  <input
                    className="input"
                    value={createForm.email}
                    onChange={(event) => setCreateForm((state) => ({ ...state, email: event.target.value }))}
                    required
                  />
                </div>
              </div>

              <div className="row">
                <div className="field">
                  <label>Phone *</label>
                  <input
                    className="input"
                    value={createForm.phone}
                    onChange={(event) => setCreateForm((state) => ({ ...state, phone: event.target.value }))}
                    required
                  />
                </div>
                <div className="field">
                  <label>Price (INR) *</label>
                  <input
                    className="input"
                    type="number"
                    value={createForm.price}
                    onChange={(event) => setCreateForm((state) => ({ ...state, price: event.target.value }))}
                    required
                  />
                </div>
              </div>

              <div className="field">
                <label>Address *</label>
                <input
                  className="input"
                  value={createForm.address}
                  onChange={(event) => setCreateForm((state) => ({ ...state, address: event.target.value }))}
                  required
                />
              </div>

              <div className="field">
                <label>Product Name *</label>
                <input
                  className="input"
                  value={createForm.productName}
                  onChange={(event) => setCreateForm((state) => ({ ...state, productName: event.target.value }))}
                  required
                />
              </div>

              <div className="field">
                <label>Product Details</label>
                <textarea
                  className="textarea"
                  value={createForm.productDetails}
                  onChange={(event) => setCreateForm((state) => ({ ...state, productDetails: event.target.value }))}
                />
              </div>

              <button className="btn" type="submit" disabled={creating}>
                {creating ? 'Creating...' : 'Create Order and Generate Invoice'}
              </button>
            </form>
          </div>
        </div>
      ) : null}

      {selectedFeedback ? (
        <div className="modalOverlay" role="presentation" onClick={() => setSelectedFeedback(null)}>
          <div className="modalCard vdModalCard" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <div className="modalHeader">
              <div>
                <div className="cardTitle" style={{ marginBottom: 0 }}>Order Feedback</div>
                <div className="muted">Linked trust and verification details.</div>
              </div>
              <button className="btn secondary" type="button" onClick={() => setSelectedFeedback(null)}>Close</button>
            </div>

            <div style={{ height: 10 }} />

            <div className="vdFeedbackModal">
              <div className="vdFeedbackMeta">
                <span className={`vdTone vdTone--${feedbackTone(selectedFeedback.trustScore)}`}>
                  Score: {normalizeScore(selectedFeedback.trustScore)}
                </span>
                <span className="vdTone vdTone--neutral">Level: {selectedFeedback.trustLevel || trustLabel(selectedFeedback.trustScore)}</span>
                <span className={selectedFeedback.codeValid ? 'vdTone vdTone--good' : 'vdTone vdTone--neutral'}>
                  {selectedFeedback.codeValid ? 'Verified' : 'Anonymous'}
                </span>
              </div>

              <p className="vdFeedbackText">{selectedFeedback.text}</p>

              <div className="vdFeedbackDetails">
                <span>Location: {formatFeedbackLocation(selectedFeedback)}</span>
                <span>Risk: {selectedFeedback.ipRiskLevel || 'UNKNOWN'}</span>
                <span>Date: {formatDate(selectedFeedback.createdAt)}</span>
              </div>

              <FeedbackExplanation feedback={selectedFeedback} buttonLabel="Why this score and tags?" />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
