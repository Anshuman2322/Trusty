import { useEffect, useMemo, useState } from 'react'
import { apiGet, apiPost } from '../lib/api'
import { FeedbackExplanation } from '../components/FeedbackExplanation'
import { clearSession, getSession, setSession } from '../lib/session'

const FEEDBACK_PREVIEW_LIMIT = 200

function formatDate(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yyyy = d.getFullYear()
  return `${dd}/${mm}/${yyyy}`
}

function statusClass(statusBadge) {
  if (statusBadge === 'Risky') return 'statusPill risky'
  if (statusBadge === 'Medium') return 'statusPill medium'
  if (statusBadge === 'Trusted') return 'statusPill trusted'
  return 'statusPill'
}

function trustLevelClass(level) {
  const normalized = String(level || '').toUpperCase()
  if (normalized === 'HIGH' || normalized === 'TRUSTED') return 'statusPill trusted'
  if (normalized === 'MEDIUM') return 'statusPill medium'
  if (normalized === 'LOW' || normalized === 'RISKY') return 'statusPill risky'
  return 'statusPill'
}

function formatScore(n, digits = 3) {
  const v = Number(n)
  if (Number.isNaN(v)) return '—'
  return v.toFixed(digits)
}

export function AdminDashboard() {
  const [sessionState, setSessionState] = useState(() => getSession())
  const isAuthedAdmin = Boolean(sessionState?.token) && sessionState?.user?.role === 'ADMIN'

  const [overview, setOverview] = useState(null)
  const [vendors, setVendors] = useState([])
  const [feedbacks, setFeedbacks] = useState([])
  const [alerts, setAlerts] = useState([])
  const [loadingMain, setLoadingMain] = useState(false)
  const [loadingFeedbacks, setLoadingFeedbacks] = useState(false)
  const [loadingAlerts, setLoadingAlerts] = useState(false)
  const [feedbacksLoaded, setFeedbacksLoaded] = useState(false)
  const [alertsLoaded, setAlertsLoaded] = useState(false)
  const [error, setError] = useState('')
  const [tab, setTab] = useState('vendors')

  const [loginForm, setLoginForm] = useState({ email: '', password: '' })

  async function onLogin(e) {
    e.preventDefault()
    try {
      setError('')
      const data = await apiPost('/api/auth/login', loginForm)
      setSession({ token: data.token, user: data.user })
      setSessionState({ token: data.token, user: data.user })
    } catch (e2) {
      setError(e2?.message || 'Login failed')
    }
  }

  function onLogout() {
    clearSession()
    setSessionState(null)
    setOverview(null)
    setVendors([])
    setFeedbacks([])
    setAlerts([])
    setFeedbacksLoaded(false)
    setAlertsLoaded(false)
    setLoadingMain(false)
    setLoadingFeedbacks(false)
    setLoadingAlerts(false)
  }

  useEffect(() => {
    let cancelled = false
    async function loadMain() {
      if (!isAuthedAdmin) return
      try {
        setLoadingMain(true)
        setError('')
        const [o, v] = await Promise.all([
          apiGet('/api/admin/overview'),
          apiGet('/api/admin/vendors'),
        ])
        if (cancelled) return
        setOverview(o.overview)
        setVendors(v.vendors || [])
        // Reset lazy tab payloads on each fresh dashboard session load.
        setFeedbacks([])
        setAlerts([])
        setFeedbacksLoaded(false)
        setAlertsLoaded(false)
      } catch (e) {
        if (!cancelled) setError(e?.message || 'Failed to load admin dashboard')
      } finally {
        if (!cancelled) setLoadingMain(false)
      }
    }
    loadMain()
    return () => {
      cancelled = true
    }
  }, [isAuthedAdmin])

  useEffect(() => {
    let cancelled = false
    async function loadFeedbacks() {
      if (!isAuthedAdmin || tab !== 'feedbacks' || feedbacksLoaded) return
      try {
        setLoadingFeedbacks(true)
        setError('')
        const f = await apiGet(`/api/admin/feedbacks?limit=${FEEDBACK_PREVIEW_LIMIT}`)
        if (cancelled) return
        setFeedbacks(f.feedbacks || [])
        setFeedbacksLoaded(true)
      } catch (e) {
        if (!cancelled) setError(e?.message || 'Failed to load feedbacks')
      } finally {
        if (!cancelled) setLoadingFeedbacks(false)
      }
    }

    loadFeedbacks()
    return () => {
      cancelled = true
    }
  }, [isAuthedAdmin, tab, feedbacksLoaded])

  useEffect(() => {
    let cancelled = false
    async function loadAlerts() {
      if (!isAuthedAdmin || tab !== 'alerts' || alertsLoaded) return
      try {
        setLoadingAlerts(true)
        setError('')
        const a = await apiGet('/api/admin/alerts')
        if (cancelled) return
        setAlerts(a.alerts || [])
        setAlertsLoaded(true)
      } catch (e) {
        if (!cancelled) setError(e?.message || 'Failed to load alerts')
      } finally {
        if (!cancelled) setLoadingAlerts(false)
      }
    }

    loadAlerts()
    return () => {
      cancelled = true
    }
  }, [isAuthedAdmin, tab, alertsLoaded])

  const trustCounts = useMemo(() => {
    let trusted = 0
    let medium = 0
    let risky = 0
    for (const v of vendors) {
      if (v.statusBadge === 'Trusted') trusted += 1
      else if (v.statusBadge === 'Medium') medium += 1
      else risky += 1
    }
    return { trusted, medium, risky }
  }, [vendors])

  if (!isAuthedAdmin) {
    return (
      <div className="list">
        <section className="card">
          <div className="cardTitle">Admin Login</div>
          <div className="muted">Admin access requires authentication.</div>
          <div style={{ height: 10 }} />
          {error ? <div className="alert error">{error}</div> : null}
          <form onSubmit={onLogin} className="list">
            <div className="field">
              <label>Email</label>
              <input
                className="input"
                value={loginForm.email}
                onChange={(e) => setLoginForm((s) => ({ ...s, email: e.target.value }))}
                placeholder="admin@trustlens.local"
              />
            </div>
            <div className="field">
              <label>Password</label>
              <input
                type="password"
                className="input"
                value={loginForm.password}
                onChange={(e) => setLoginForm((s) => ({ ...s, password: e.target.value }))}
                placeholder="Admin123"
              />
            </div>
            <button className="btn" type="submit">Login</button>
          </form>
          <div style={{ height: 10 }} />
          <div className="muted">Demo credentials (after running seed): admin@trustlens.local / Admin123</div>
        </section>
      </div>
    )
  }

  return (
    <div className="list">
      <section className="card">
        <div className="cardTitle">Admin Dashboard</div>
        <div className="muted">Platform audit and monitoring (auditor only; no edit/delete).</div>

        <div style={{ height: 10 }} />
        <div className="pillRow" style={{ justifyContent: 'space-between' }}>
          <span className="pill">Logged in: {sessionState?.user?.email}</span>
          <button className="btn secondary" type="button" onClick={onLogout}>Logout</button>
        </div>

        {error ? <div className="alert error">{error}</div> : null}
        {loadingMain ? <div className="muted">Loading overview…</div> : null}

        <div style={{ height: 12 }} />

        <div className="statsGrid">
          <div className="statCard metricCard metricCard--vendors">
            <div className="statHead">
              <span className="statIcon">VN</span>
              <div className="statLabel">Total Vendors</div>
            </div>
            <div className="statValue">{overview?.vendorCount ?? '—'}</div>
          </div>
          <div className="statCard metricCard metricCard--feedback">
            <div className="statHead">
              <span className="statIcon">FB</span>
              <div className="statLabel">Total Feedbacks</div>
            </div>
            <div className="statValue">{overview?.feedbackCount ?? '—'}</div>
          </div>
          <div className="statCard metricCard metricCard--orders">
            <div className="statHead">
              <span className="statIcon">OR</span>
              <div className="statLabel">Total Orders</div>
            </div>
            <div className="statValue">{overview?.orderCount ?? '—'}</div>
          </div>
          <div className="statCard metricCard metricCard--trust">
            <div className="statHead">
              <span className="statIcon">TS</span>
              <div className="statLabel">Avg Trust Score</div>
            </div>
            <div className="statValue">{overview?.averageTrustScore ?? '—'}</div>
          </div>
        </div>

        <div style={{ height: 12 }} />

        <div className="trustGrid">
          <div className="statCard metricCard metricCard--trusted">
            <div className="statHead">
              <span className="statIcon">TR</span>
              <div className="statLabel">Trusted Vendors</div>
            </div>
            <div className="statValue">{trustCounts.trusted}</div>
          </div>
          <div className="statCard metricCard metricCard--medium">
            <div className="statHead">
              <span className="statIcon">MD</span>
              <div className="statLabel">Medium Trust</div>
            </div>
            <div className="statValue">{trustCounts.medium}</div>
          </div>
          <div className="statCard metricCard metricCard--risky">
            <div className="statHead">
              <span className="statIcon">RK</span>
              <div className="statLabel">Risky Vendors</div>
            </div>
            <div className="statValue">{trustCounts.risky}</div>
          </div>
        </div>

        <div style={{ height: 14 }} />

        <div className="tabs">
          <button className={tab === 'vendors' ? 'tab active' : 'tab'} onClick={() => setTab('vendors')} type="button">
            All Vendors
          </button>
          <button className={tab === 'feedbacks' ? 'tab active' : 'tab'} onClick={() => setTab('feedbacks')} type="button">
            All Feedbacks
          </button>
          <button className={tab === 'alerts' ? 'tab active' : 'tab'} onClick={() => setTab('alerts')} type="button">
            Pattern Alerts
            <span className="tabBadge">{alertsLoaded ? alerts.length : '…'}</span>
          </button>
        </div>

        <div style={{ height: 12 }} />

        {tab === 'vendors' ? (
          <div className="card">
            <div className="cardTitle">Registered Vendors</div>
            <div className="tableWrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Vendor</th>
                    <th>Email</th>
                    <th>Trust Score</th>
                    <th>Status</th>
                    <th>Orders</th>
                    <th>Feedbacks</th>
                    <th>Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {vendors.map((v) => (
                    <tr key={v.vendorId}>
                      <td><b>{v.name}</b></td>
                      <td className="muted">{v.contactEmail || '—'}</td>
                      <td><b>{v.averageTrustScore}</b></td>
                      <td><span className={statusClass(v.statusBadge)}>{v.statusBadge}</span></td>
                      <td>{v.ordersCount ?? 0}</td>
                      <td>{v.totalFeedbacks}</td>
                      <td className="muted">{formatDate(v.joinedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}

        {tab === 'feedbacks' ? (
          <div className="card">
            <div className="cardTitle">All Feedbacks (read-only)</div>
            <div className="muted">
              Transparency over censorship: admin cannot edit/delete. Showing latest {FEEDBACK_PREVIEW_LIMIT} records for faster load.
            </div>
            <div style={{ height: 10 }} />
            {loadingFeedbacks ? <div className="muted">Loading feedbacks…</div> : null}
            <div className="tableWrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Trust</th>
                    <th>DupAdj</th>
                    <th>MaxSim</th>
                    <th>Level</th>
                    <th>Vendor</th>
                    <th>Tags</th>
                    <th>Created</th>
                    <th>Text</th>
                    <th>Explain</th>
                  </tr>
                </thead>
                <tbody>
                  {!loadingFeedbacks && feedbacks.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="muted">No feedbacks loaded.</td>
                    </tr>
                  ) : null}
                  {feedbacks.map((f) => (
                    <tr key={f._id}>
                      <td><b>{f.trustScore}</b></td>
                      <td className="muted">{f.dupAdj ?? 0}</td>
                      <td className="muted" title={f.embeddingAudit?.modelVersion || ''}>
                        {formatScore(f.embeddingAudit?.maxSim)}
                      </td>
                      <td><span className={trustLevelClass(f.trustLevel)}>{f.trustLevel}</span></td>
                      <td className="muted">{String(f.vendorId).slice(0, 8)}…</td>
                      <td className="muted">{(f.tags || []).join(', ') || '—'}</td>
                      <td className="muted">{formatDate(f.createdAt)}</td>
                      <td>{f.text}</td>
                      <td><FeedbackExplanation feedback={f} buttonLabel="Explain" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}

        {tab === 'alerts' ? (
          <div className="card">
            <div className="cardTitle">Pattern Detection & Alerts</div>
            <div className="muted">Detects device repetition, vendor spikes, and suspicious behavior patterns.</div>
            <div style={{ height: 10 }} />
            {loadingAlerts ? <div className="muted">Loading alerts…</div> : null}
            <div className="list">
              {!loadingAlerts && alerts.length === 0 ? <div className="muted">No alerts right now.</div> : null}
              {alerts.map((a, idx) => (
                <div key={idx} className="card">
                  <div className="pillRow">
                    <span className="pill">Severity: {a.severity}</span>
                    <span className="pill">Type: {a.type}</span>
                  </div>
                  <div style={{ height: 6 }} />
                  <div>{a.message}</div>
                  <div className="muted">Evidence: {JSON.stringify(a.evidence)}</div>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </section>
    </div>
  )
}
