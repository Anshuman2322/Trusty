import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ConfirmationModal } from '../components/admin/ConfirmationModal'
import {
  AlertsPanel,
  AnalyticsPage,
  ChartsSection,
  CustomerInsights,
  DashboardCards,
  InsightsPanel,
  LeadsSection,
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
  'messages',
  'leads',
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
  const parts = [location.area, location.city, location.state, location.country || location.countryCode]
    .map((value) => String(value || '').trim())
    .filter(Boolean)
  return parts.length ? parts.join(', ') : 'Location unavailable'
}

function formatFeedbackLocation(feedback) {
  return formatLocationText({
    area: feedback?.ipArea,
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

function buildSignalBreakdownRows(feedback) {
  const breakdown = feedback?.trustBreakdown
  if (!breakdown || Array.isArray(breakdown)) return []

  const rows = [
    { label: 'Token Verification', item: breakdown.tokenVerification },
    { label: 'Payment Proof', item: breakdown.paymentProof },
    { label: 'AI Content Quality', item: breakdown.aiBehavior },
    { label: 'Behavior Analysis', item: breakdown.contextDepth },
    { label: 'Device Uniqueness', item: breakdown.devicePattern },
  ]

  return rows
    .filter((row) => row.item)
    .map((row) => {
      const score = Number(row.item.score || 0)
      const maxScore = Number(row.item.maxScore || 0)
      const pct = maxScore > 0 ? Math.max(0, Math.min(100, (score / maxScore) * 100)) : 0
      return {
        label: row.label,
        score,
        pct,
      }
    })
}

function trustTone(score) {
  const safe = normalizeScore(score)
  if (safe >= 70) return 'high'
  if (safe >= 40) return 'medium'
  return 'low'
}

function trustHealthCopy(score) {
  const safe = normalizeScore(score)
  if (safe >= 70) return 'looking healthy'
  if (safe >= 40) return 'improving steadily'
  return 'needs attention'
}

function applyWorkspaceTheme(isDarkMode) {
  if (typeof document === 'undefined' || typeof window === 'undefined') return
  const theme = isDarkMode ? 'dark' : 'light'
  document.body.dataset.theme = theme
  window.localStorage.setItem('trusty-theme', theme)
  window.dispatchEvent(new CustomEvent('trusty-theme-change', { detail: { theme } }))
}

function FeedbackSection({ feedbacks, onSelect }) {
  const [query, setQuery] = useState('')
  const [sortBy, setSortBy] = useState('newest')
  const [status, setStatus] = useState('all')

  const visibleFeedbacks = useMemo(() => {
    const q = String(query || '').trim().toLowerCase()

    const filtered = (feedbacks || []).filter((item) => {
      const score = normalizeScore(item?.trustScore)
      const text = String(item?.text || '').toLowerCase()
      const product = String(item?.productName || '').toLowerCase()
      const displayName = String(item?.displayName || '').toLowerCase()

      if (q && !text.includes(q) && !product.includes(q) && !displayName.includes(q)) {
        return false
      }

      if (status === 'verified') return Boolean(item?.codeValid)
      if (status === 'anonymous') return !item?.codeValid
      if (status === 'anchored') return Boolean(item?.blockchain?.txRef)
      if (status === 'risk') return String(item?.ipRiskLevel || '').toUpperCase() === 'HIGH' || score < 40
      if (status === 'high') return score >= 70
      if (status === 'medium') return score >= 40 && score < 70
      if (status === 'low') return score < 40

      return true
    })

    filtered.sort((a, b) => {
      const aScore = normalizeScore(a?.trustScore)
      const bScore = normalizeScore(b?.trustScore)
      const aTime = new Date(a?.createdAt).getTime() || 0
      const bTime = new Date(b?.createdAt).getTime() || 0

      if (sortBy === 'oldest') return aTime - bTime
      if (sortBy === 'high-score') return bScore - aScore
      if (sortBy === 'low-score') return aScore - bScore
      return bTime - aTime
    })

    return filtered
  }, [feedbacks, query, sortBy, status])

  function scoreTone(score) {
    if (score >= 70) return 'good'
    if (score >= 40) return 'warn'
    return 'danger'
  }

  return (
    <section className="vdSection vdFeedbackPage">
      <div className="vdSectionHead">
        <h2>Feedback</h2>
        <p>Review incoming feedback and quality signals.</p>
      </div>

      <div className="vdFeedbackToolbar">
        <label className="vdFeedbackSearch" htmlFor="vd-feedback-search">
          <span className="vdFeedbackSearchIcon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none">
              <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.8" />
              <path d="M16 16l4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </span>
          <input
            id="vd-feedback-search"
            className="vdFeedbackSearchInput"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search feedback or product..."
          />
        </label>

        <select className="vdInput vdFeedbackSelect" value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
          <option value="newest">Newest</option>
          <option value="oldest">Oldest</option>
          <option value="high-score">Highest Score</option>
          <option value="low-score">Lowest Score</option>
        </select>

        <select className="vdInput vdFeedbackSelect" value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="all">All Status</option>
          <option value="verified">Verified</option>
          <option value="anonymous">Anonymous</option>
          <option value="anchored">Blockchain Anchored</option>
          <option value="risk">Risk Flagged</option>
          <option value="high">High Trust</option>
          <option value="medium">Medium Trust</option>
          <option value="low">Low Trust</option>
        </select>
      </div>

      {visibleFeedbacks.length === 0 ? <div className="vdTableEmpty">No feedback matched your current filters.</div> : null}

      <div className="vdFeedbackFeed">
        {visibleFeedbacks.map((feedback) => {
          const score = normalizeScore(feedback.trustScore)
          const tone = scoreTone(score)
          const productLabel = String(feedback?.productName || '').trim() || 'General Service'
          const riskHigh = String(feedback?.ipRiskLevel || '').toUpperCase() === 'HIGH' || score < 40

          return (
            <article
              className={`vdFeedbackRow vdFeedbackRow--${tone}${riskHigh ? ' is-risk' : ''}`}
              key={feedback._id}
              role="button"
              tabIndex={0}
              onClick={() => onSelect(feedback)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  onSelect(feedback)
                }
              }}
              aria-label="Open feedback details"
            >
              <div className={`vdFeedbackScoreRing vdFeedbackScoreRing--${tone}`} style={{ '--ring-progress': `${score}%` }}>
                <div className="vdFeedbackScoreRingInner">{score}</div>
              </div>

              <div className="vdFeedbackRowBody">
                <p className="vdFeedbackRowText">{feedback.text}</p>

                <div className="vdFeedbackRowMeta">
                  <span className={feedback.codeValid ? 'vdTone vdTone--good' : 'vdTone vdTone--neutral'}>
                    {feedback.codeValid ? 'Verified' : 'Anonymous'}
                  </span>
                  {feedback.blockchain?.txRef ? <span className="vdTone vdTone--info">Blockchain Anchored</span> : null}
                  {riskHigh ? <span className="vdTone vdTone--danger">Duplicate Risk</span> : null}
                  <span className="vdFeedbackMetaText">{productLabel}</span>
                  <span className="vdFeedbackMetaText">{formatDate(feedback.createdAt)}</span>
                </div>
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}

function CustomerMessagesSection({
  messages,
  loading,
  lastSyncedAt,
  replyDrafts,
  onReplyDraftChange,
  replyingId,
  statusBusyId,
  onReply,
  onStatus,
  onRefresh,
}) {
  const [activeFilter, setActiveFilter] = useState('all')
  const [selectedMessageId, setSelectedMessageId] = useState('')

  const filteredMessages = useMemo(() => {
    if (activeFilter === 'all') return messages

    return messages.filter((item) => {
      const status = String(item?.status || 'open').toLowerCase()
      if (activeFilter === 'open') return status === 'open'
      if (activeFilter === 'in-progress') return status === 'replied'
      if (activeFilter === 'resolved') return status === 'closed'
      return true
    })
  }, [messages, activeFilter])

  useEffect(() => {
    if (!filteredMessages.length) {
      setSelectedMessageId('')
      return
    }

    const exists = filteredMessages.some((item) => String(item._id) === String(selectedMessageId))
    if (!exists) setSelectedMessageId(String(filteredMessages[0]._id))
  }, [filteredMessages, selectedMessageId])

  const selectedMessage = useMemo(
    () => filteredMessages.find((item) => String(item._id) === String(selectedMessageId)) || null,
    [filteredMessages, selectedMessageId]
  )

  const selectedReplyDraft = selectedMessage ? replyDrafts[selectedMessage._id] || '' : ''

  function statusToView(statusRaw) {
    const status = String(statusRaw || 'open').toLowerCase()
    if (status === 'replied') return 'in-progress'
    if (status === 'closed') return 'resolved'
    return 'open'
  }

  function viewToApiStatus(viewStatus) {
    if (viewStatus === 'in-progress') return 'replied'
    if (viewStatus === 'resolved') return 'closed'
    return 'open'
  }

  function statusLabel(statusRaw) {
    const view = statusToView(statusRaw)
    if (view === 'in-progress') return 'In-Progress'
    if (view === 'resolved') return 'Resolved'
    return 'Open'
  }

  function compactText(text, limit = 52) {
    const value = String(text || '').replace(/\s+/g, ' ').trim()
    if (!value) return 'No message content'
    if (value.length <= limit) return value
    return `${value.slice(0, Math.max(0, limit - 3))}...`
  }

  function handleReplySend() {
    if (!selectedMessage) return
    onReply(selectedMessage._id, selectedReplyDraft, () => onReplyDraftChange(selectedMessage._id, ''))
  }

  return (
    <section className="vdSection vdSupportShell">
      <div className="vdSectionHead">
        <h2>Support</h2>
        <p>Raise and track support tickets.</p>
      </div>

      <div className="vdSupportToolbar">
        <div className="vdSupportFilterRow">
          {[
            { key: 'all', label: 'All' },
            { key: 'open', label: 'Open' },
            { key: 'in-progress', label: 'In-Progress' },
            { key: 'resolved', label: 'Resolved' },
          ].map((filter) => (
            <button
              type="button"
              key={filter.key}
              className={`vdSupportFilterBtn${activeFilter === filter.key ? ' is-active' : ''}`}
              onClick={() => setActiveFilter(filter.key)}
            >
              {filter.label}
            </button>
          ))}
        </div>

        <button type="button" className="btn secondary" onClick={onRefresh}>Refresh</button>
      </div>

      {loading ? <div className="vdTableEmpty">Loading customer messages...</div> : null}

      {!loading && filteredMessages.length === 0 ? <div className="vdTableEmpty">No messages in this filter.</div> : null}

      <div className="vdSupportLayout">
        <div className="vdSupportTicketList">
          {filteredMessages.map((item) => {
            const statusView = statusToView(item.status)
            const repliesCount = Array.isArray(item.replies) ? item.replies.length : item.reply ? 1 : 0

            return (
              <button
                type="button"
                className={`vdSupportTicketCard${String(selectedMessageId) === String(item._id) ? ' is-active' : ''}`}
                key={item._id}
                onClick={() => setSelectedMessageId(String(item._id))}
              >
                <div className="vdSupportTicketCardHead">
                  <strong>{compactText(item.message, 31)}</strong>
                  <span className={`vdSupportStatus vdSupportStatus--${statusView}`}>{statusLabel(item.status)}</span>
                </div>
                <p>{compactText(item.message, 68)}</p>
                <div className="vdSupportTicketMeta">
                  <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                  <span>{repliesCount} repl{repliesCount === 1 ? 'y' : 'ies'}</span>
                </div>
              </button>
            )
          })}
        </div>

        <article className="vdSupportDetailPanel">
          {selectedMessage ? (
            <>
              <header className="vdSupportDetailHead">
                <div>
                  <h3>{selectedMessage.userName || 'Customer message'}</h3>
                  <p>
                    {selectedMessage.userEmail || 'No email'}
                    {selectedMessage.userPhone ? ` • ${selectedMessage.userPhone}` : ''}
                    {' • '}
                    {new Date(selectedMessage.createdAt).toLocaleString()}
                  </p>
                </div>
                <span className={`vdSupportStatus vdSupportStatus--${statusToView(selectedMessage.status)}`}>
                  {statusLabel(selectedMessage.status)}
                </span>
              </header>

              <div className="vdSupportMessageBubble">
                <p>{selectedMessage.message}</p>
              </div>

              {selectedMessage.reply ? (
                <div className="vdSupportReplyBubble">
                  <span>Latest Reply</span>
                  <p>{selectedMessage.reply}</p>
                </div>
              ) : null}

              <div className="vdSupportActions">
                <textarea
                  className="textarea"
                  placeholder="Type your reply to customer..."
                  value={selectedReplyDraft}
                  onChange={(event) => onReplyDraftChange(selectedMessage._id, event.target.value)}
                />

                <div className="vdSupportActionButtons">
                  <button
                    type="button"
                    className="btn"
                    disabled={replyingId === selectedMessage._id || !selectedReplyDraft.trim()}
                    onClick={handleReplySend}
                  >
                    {replyingId === selectedMessage._id ? 'Sending...' : 'Send Reply'}
                  </button>

                  <button
                    type="button"
                    className="btn secondary"
                    disabled={statusBusyId === selectedMessage._id || statusToView(selectedMessage.status) === 'in-progress'}
                    onClick={() => onStatus(selectedMessage._id, viewToApiStatus('in-progress'))}
                  >
                    Mark In-Progress
                  </button>

                  <button
                    type="button"
                    className="btn secondary"
                    disabled={statusBusyId === selectedMessage._id || statusToView(selectedMessage.status) === 'resolved'}
                    onClick={() => onStatus(selectedMessage._id, viewToApiStatus('resolved'))}
                  >
                    Resolve
                  </button>
                </div>

                <p className="vdSupportSyncMeta">
                  Auto-refresh every 15s.
                  {lastSyncedAt ? ` Last synced ${new Date(lastSyncedAt).toLocaleTimeString()}.` : ''}
                </p>
              </div>
            </>
          ) : (
            <div className="vdSupportEmptyDetail">
              <div className="vdSupportEmptyIcon">?</div>
              <h3>Select a ticket to view details</h3>
              <p>Click on any ticket from the list</p>
            </div>
          )}
        </article>
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
  const [supportMessages, setSupportMessages] = useState([])
  const [supportMessagesLastSyncedAt, setSupportMessagesLastSyncedAt] = useState('')
  const [replyDrafts, setReplyDrafts] = useState({})
  const [replyingMessageId, setReplyingMessageId] = useState('')
  const [messageStatusBusyId, setMessageStatusBusyId] = useState('')
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false)

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

  const refreshSupportMessages = useCallback(async (options = {}) => {
    try {
      const messagesData = await apiGet('/api/support/vendor/messages')
      setSupportMessages(messagesData?.messages || [])
      setSupportMessagesLastSyncedAt(new Date().toISOString())
    } catch (e) {
      if (!options.silent) setError(e?.message || 'Failed to load customer messages')
      if (!options.keepDataOnFailure) setSupportMessages([])
    }
  }, [])

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

      await refreshSupportMessages({ silent: true, keepDataOnFailure: true })
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

  useEffect(() => {
    if (!vendorId || activeView !== 'messages') return undefined

    const tick = () => {
      refreshSupportMessages({ silent: true, keepDataOnFailure: true })
    }

    tick()
    const timer = window.setInterval(tick, 15000)
    return () => window.clearInterval(timer)
  }, [activeView, vendorId, refreshSupportMessages])

  function onLogout(sessionMessage = '') {
    setSidebarMobileOpen(false)
    clearSession()
    setSessionState(null)
    setOverview(null)
    setOrders([])
    setFeedbacks([])
    setVendorProfile(null)
    setVendorSettings(null)
    setSupportMessages([])
    setSupportMessagesLastSyncedAt('')
    setReplyDrafts({})
    setReplyingMessageId('')
    setMessageStatusBusyId('')
    setCreateOpen(false)
    setCreateResult(null)
    setSelectedFeedback(null)
    const state = sessionMessage ? { sessionMessage } : undefined
    navigate('/vendor/login', { replace: true, state })
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

  const welcomeName = useMemo(() => {
    const directName = String(sessionState?.user?.name || sessionState?.user?.fullName || '').trim()
    if (directName) return directName

    const email = String(sessionState?.user?.email || '').trim()
    if (!email) return 'Vendor'

    const localPart = email.split('@')[0] || 'Vendor'
    return localPart
      .split(/[._-]/g)
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ') || 'Vendor'
  }, [sessionState?.user?.email, sessionState?.user?.fullName, sessionState?.user?.name])

  const businessName = useMemo(() => {
    return String(vendorProfile?.businessName || sessionState?.user?.vendorName || 'Your business')
  }, [sessionState?.user?.vendorName, vendorProfile?.businessName])

  const welcomeTrustScore = useMemo(() => normalizeScore(overview?.averageTrustScore), [overview?.averageTrustScore])
  const welcomeTrustTone = useMemo(() => trustTone(welcomeTrustScore), [welcomeTrustScore])
  const welcomeTrustLabel = useMemo(() => trustLabel(welcomeTrustScore), [welcomeTrustScore])
  const feedbackCount = useMemo(() => overview?.totalFeedbackCount ?? feedbacks.length, [overview?.totalFeedbackCount, feedbacks.length])
  const totalOrdersCount = useMemo(() => overview?.totalOrders ?? orders.length, [overview?.totalOrders, orders.length])
  const welcomeTrustDelta = useMemo(() => {
    const now = Date.now()
    const weekMs = 7 * 24 * 60 * 60 * 1000

    const thisWeek = feedbacks.filter((item) => {
      const t = new Date(item?.createdAt).getTime()
      return t && t >= now - weekMs
    })

    const previousWeek = feedbacks.filter((item) => {
      const t = new Date(item?.createdAt).getTime()
      return t && t >= now - 2 * weekMs && t < now - weekMs
    })

    const thisAvg = thisWeek.length
      ? thisWeek.reduce((sum, item) => sum + normalizeScore(item?.trustScore), 0) / thisWeek.length
      : 0

    const prevAvg = previousWeek.length
      ? previousWeek.reduce((sum, item) => sum + normalizeScore(item?.trustScore), 0) / previousWeek.length
      : 0

    if (prevAvg <= 0) return 0
    return Number((((thisAvg - prevAvg) / prevAvg) * 100).toFixed(1))
  }, [feedbacks])
  const isTrustImproving = welcomeTrustDelta >= 0

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

  async function handleReplyMessage(messageId, replyText, onDone) {
    try {
      setReplyingMessageId(messageId)
      setError('')
      await apiPost(`/api/support/vendor/messages/${messageId}/reply`, { reply: replyText })
      await refreshSupportMessages({ keepDataOnFailure: true })
      onDone()
    } catch (e) {
      setError(e?.message || 'Failed to send reply')
    } finally {
      setReplyingMessageId('')
    }
  }

  function handleReplyDraftChange(messageId, value) {
    setReplyDrafts((prev) => ({
      ...prev,
      [messageId]: value,
    }))
  }

  async function handleMessageStatus(messageId, status) {
    try {
      setMessageStatusBusyId(messageId)
      setError('')
      await apiPost(`/api/support/vendor/messages/${messageId}/status`, { status })
      await refreshSupportMessages({ keepDataOnFailure: true })
    } catch (e) {
      setError(e?.message || 'Failed to update message status')
    } finally {
      setMessageStatusBusyId('')
    }
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
          <DashboardCards overview={overview} feedbacks={feedbacks} orders={orders} />
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
      return <FeedbackSection feedbacks={feedbacks} onSelect={setSelectedFeedback} />
    }

    if (activeView === 'messages') {
      return (
        <CustomerMessagesSection
          messages={supportMessages}
          loading={loading}
          lastSyncedAt={supportMessagesLastSyncedAt}
          replyDrafts={replyDrafts}
          onReplyDraftChange={handleReplyDraftChange}
          replyingId={replyingMessageId}
          statusBusyId={messageStatusBusyId}
          onReply={handleReplyMessage}
          onStatus={handleMessageStatus}
          onRefresh={() => refreshSupportMessages({ keepDataOnFailure: true })}
        />
      )
    }

    if (activeView === 'leads') {
      return <LeadsSection />
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
        onLogout={requestLogout}
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

        {activeView === 'dashboard' ? (
          <section className="vdWelcomePanel" aria-label="Vendor trust summary">
            <div className={`vdWelcomeRing vdWelcomeRing--${welcomeTrustTone}`} style={{ '--ring-progress': `${welcomeTrustScore}%` }}>
              <div className="vdWelcomeRingInner">
                <strong>{welcomeTrustScore}</strong>
              </div>
            </div>

            <div className="vdWelcomeContent">
              <h2>Welcome back, {welcomeName}!</h2>
              <p>{businessName} - your trust profile is {trustHealthCopy(welcomeTrustScore)}.</p>

              <div className="vdWelcomeTrendRow">
                <span className={`vdWelcomeTrend vdWelcomeTrend--${isTrustImproving ? 'up' : 'down'}`}>
                  <span className="vdWelcomeTrendArrow" aria-hidden="true" />
                  {isTrustImproving ? '+' : ''}{welcomeTrustDelta}%
                </span>
                <span className="vdWelcomeTrendNote">
                  {isTrustImproving ? 'Improving' : 'Declining'} | Last 7 days {isTrustImproving ? '+' : ''}{welcomeTrustDelta}%
                </span>
              </div>

              <div className="vdWelcomeMeta">
                <span className={`vdWelcomePill vdWelcomePill--${welcomeTrustTone}`}>
                  {welcomeTrustLabel}
                </span>
                <span className="vdWelcomePill">{feedbackCount} feedbacks</span>
                <span className="vdWelcomePill">{totalOrdersCount} orders</span>
              </div>
            </div>
          </section>
        ) : null}

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
          <div className="modalCard vdModalCard vdFeedbackDetailModal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <div className="modalHeader">
              <div>
                <div className="cardTitle" style={{ marginBottom: 0 }}>Feedback Detail</div>
              </div>
              <button className="btn secondary" type="button" onClick={() => setSelectedFeedback(null)}>Close</button>
            </div>

            <div style={{ height: 10 }} />

            <div className="vdFeedbackDetailBody">
              <div className="vdFeedbackDetailTop">
                <div className={`vdFeedbackScoreRing vdFeedbackScoreRing--${feedbackTone(selectedFeedback.trustScore)}`} style={{ '--ring-progress': `${normalizeScore(selectedFeedback.trustScore)}%` }}>
                  <div className="vdFeedbackScoreRingInner">{normalizeScore(selectedFeedback.trustScore)}</div>
                </div>

                <div className="vdFeedbackDetailTopMeta">
                  <div className="vdFeedbackMeta">
                    <span className={`vdTone vdTone--${feedbackTone(selectedFeedback.trustScore)}`}>
                      {selectedFeedback.trustLevel || trustLabel(selectedFeedback.trustScore)}
                    </span>
                    <span className="vdFeedbackMetaText">{formatDate(selectedFeedback.createdAt)}</span>
                  </div>

                  <p className="vdFeedbackDetailText">{selectedFeedback.text}</p>

                  <div className="vdFeedbackMeta">
                    <span className={selectedFeedback.codeValid ? 'vdTone vdTone--good' : 'vdTone vdTone--neutral'}>
                      {selectedFeedback.codeValid ? 'Verified' : 'Anonymous'}
                    </span>
                    {selectedFeedback.blockchain?.txRef ? <span className="vdTone vdTone--info">Blockchain Verified</span> : null}
                    {selectedFeedback.notReceived ? <span className="vdTone vdTone--danger">Not Received</span> : null}
                    {(selectedFeedback.tags || [])
                      .filter((tag) => tag !== 'Blockchain Anchored' && tag !== 'Verified')
                      .slice(0, 3)
                      .map((tag) => (
                        <span className={`vdTone vdTone--${feedbackTagTone(tag)}`} key={`detail-${selectedFeedback._id}-${tag}`}>
                          {tag}
                        </span>
                      ))}
                  </div>
                </div>
              </div>

              <section className="vdFeedbackDetailPanel">
                <h3>Explanation</h3>
                <p>{selectedFeedback.explanation || 'Trust score was computed from verification, behavior, and signal quality checks.'}</p>
              </section>

              <section className="vdFeedbackDetailPanel">
                <h3>Signal Breakdown</h3>
                <div className="vdSignalRows">
                  {buildSignalBreakdownRows(selectedFeedback).map((row) => (
                    <div className="vdSignalRow" key={row.label}>
                      <span>{row.label}</span>
                      <div className="vdSignalBarTrack">
                        <div className="vdSignalBarFill" style={{ width: `${row.pct}%` }} />
                      </div>
                      <strong>{row.score}</strong>
                    </div>
                  ))}
                </div>
              </section>

              <div className="vdFeedbackDetailMetaBlock">
                <div>TX: {selectedFeedback.blockchain?.txRef || 'N/A'}</div>
                <div>Device: {selectedFeedback.deviceFingerprintHash ? String(selectedFeedback.deviceFingerprintHash).slice(0, 10) : 'N/A'}</div>
                <div>Location: {formatFeedbackLocation(selectedFeedback)}</div>
                <div>Risk: {selectedFeedback.ipRiskLevel || 'UNKNOWN'}</div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <ConfirmationModal
        isDark={typeof document !== 'undefined' && document.body?.dataset?.theme === 'dark'}
        open={logoutConfirmOpen}
        title="Logout from vendor workspace?"
        description="You are about to sign out from your vendor account on this device."
        bullets={[
          'Any unsaved work in the current view may be lost.',
          'You can sign in again at any time from the vendor login page.',
        ]}
        confirmText="Logout"
        cancelText="Cancel"
        danger
        onCancel={cancelLogout}
        onConfirm={confirmLogout}
      />
    </div>
  )
}
