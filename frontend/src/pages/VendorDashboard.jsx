import { useEffect, useMemo, useState } from 'react'
import { apiGet, apiPost } from '../lib/api'
import { FeedbackExplanation } from '../components/FeedbackExplanation'
import { clearSession, getSession, setSession } from '../lib/session'

const DELIVERY_OPTIONS = [
  'CREATED',
  'DISPATCHED',
  'IN_TRANSIT',
  'IN_CUSTOMS',
  'OUT_OF_CUSTOMS',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
]

function shortId(id) {
  const s = String(id || '')
  if (s.length <= 8) return s
  return `${s.slice(0, 8)}…`
}

function trustLabel(score) {
  const n = Number(score || 0)
  if (n >= 71) return 'High'
  if (n >= 40) return 'Medium'
  return 'Low'
}

function trustTone(score) {
  const n = Number(score || 0)
  if (n >= 71) return 'good'
  if (n >= 40) return 'warn'
  return 'bad'
}

function trustBadgeClass(score) {
  const n = Number(score || 0)
  if (n >= 71) return 'badge badge--trusted'
  if (n >= 40) return 'badge badge--medium'
  return 'badge badge--risky'
}

function pillClass(kind) {
  const normalized = String(kind || '').toUpperCase()
  if (normalized === 'PAID') return 'statusPill paid'
  if (normalized === 'PENDING') return 'statusPill pending'
  if (normalized === 'DELIVERED') return 'statusPill delivered'
  if (
    normalized === 'DISPATCHED' ||
    normalized === 'IN_TRANSIT' ||
    normalized === 'OUT_FOR_DELIVERY' ||
    normalized === 'IN_CUSTOMS' ||
    normalized === 'OUT_OF_CUSTOMS'
  ) {
    return 'statusPill info'
  }
  return 'statusPill'
}

function feedbackTagClass(tag) {
  if (tag === 'AI Verified') return 'pill pill--ai'
  if (tag === 'Blockchain Anchored' || tag === 'Blockchain Verified') return 'pill pill--blockchain'
  if (tag === 'Payment Verified') return 'pill pill--payment'
  if (tag === 'Delivered') return 'pill pill--delivered'
  return 'pill'
}

function formatDate(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString()
}

function formatScore(n, digits = 3) {
  const v = Number(n)
  if (Number.isNaN(v)) return '—'
  return v.toFixed(digits)
}

function formatLocationText(location) {
  if (!location) return 'Location unavailable'
  const parts = [location.city, location.state, location.country || location.countryCode]
    .map((value) => String(value || '').trim())
    .filter(Boolean)
  return parts.length ? parts.join(', ') : 'Location unavailable'
}

function formatOrderActionLocation(location, label) {
  return `${label}: ${formatLocationText(location)}`
}

function formatFeedbackLocation(feedback) {
  return formatLocationText({
    city: feedback?.ipCity,
    state: feedback?.ipState || feedback?.ipRegion,
    country: feedback?.ipCountryName || feedback?.ipCountry,
  })
}

function TrustScoreDial({ score }) {
  const n = Number(score)
  const safe = Number.isFinite(n) ? Math.max(0, Math.min(100, Math.round(n))) : 0
  const tone = trustTone(safe)

  return (
    <div className={`trustDial trustDial--${tone}`} style={{ '--progress': `${safe}%` }}>
      <div className="trustDialInner">
        <div className="trustDialValue">{safe}</div>
        <div className="trustDialLabel">out of 100</div>
      </div>
    </div>
  )
}

export function VendorDashboard({ defaultVendorId }) {
  const [sessionState, setSessionState] = useState(() => getSession())
  const isAuthedVendor =
    Boolean(sessionState?.token) && sessionState?.user?.role === 'VENDOR' && Boolean(sessionState?.user?.vendorId)

  const vendorId = sessionState?.user?.vendorId || ''

  const [overview, setOverview] = useState(null)
  const [orders, setOrders] = useState([])
  const [feedbacks, setFeedbacks] = useState([])

  const [tab, setTab] = useState('orders')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [loginForm, setLoginForm] = useState({ email: '', password: '' })

  const [createOpen, setCreateOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [createResult, setCreateResult] = useState(null)
  const [createForm, setCreateForm] = useState({
    customerName: '',
    email: '',
    phone: '',
    address: '',
    productName: '',
    productDetails: '',
    price: '',
  })

  async function refresh() {
    if (!vendorId) return
    try {
      setLoading(true)
      setError('')
      const [o, ord, fb] = await Promise.all([
        apiGet(`/api/vendor/${vendorId}/overview`),
        apiGet(`/api/vendor/${vendorId}/orders`),
        apiGet(`/api/vendor/${vendorId}/feedbacks`),
      ])
      setOverview(o.overview)
      setOrders(ord.orders || [])
      setFeedbacks(fb.feedbacks || [])
    } catch (e) {
      setError(e?.message || 'Failed to load vendor dashboard')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!isAuthedVendor) return
    refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthedVendor])

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
    setOrders([])
    setFeedbacks([])
    setCreateOpen(false)
    setCreateResult(null)
  }

  async function onCreateOrder(e) {
    e.preventDefault()
    if (!vendorId) return

    try {
      setCreating(true)
      setError('')
      setCreateResult(null)

      const productDetails = [createForm.productName?.trim(), createForm.productDetails?.trim()]
        .filter(Boolean)
        .join(' — ')

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
    } catch (e2) {
      setError(e2?.message || 'Order creation failed')
    } finally {
      setCreating(false)
    }
  }

  async function onConfirmPayment(orderId) {
    if (!vendorId) return
    await apiPost(`/api/vendor/${vendorId}/orders/${orderId}/confirm-payment`, {})
    await refresh()
  }

  async function onUpdateDelivery(orderId, status, trackingRef) {
    if (!vendorId) return
    await apiPost(`/api/vendor/${vendorId}/orders/${orderId}/delivery-status`, {
      status,
      trackingRef,
      shareTracking: false,
    })
    await refresh()
  }

  const pendingPayments = useMemo(() => {
    return (orders || []).filter((o) => o.paymentStatus === 'PENDING')
  }, [orders])

  if (!isAuthedVendor) {
    return (
      <div className="list">
        <section className="card">
          <div className="cardTitle">Vendor Login</div>
          <div className="muted">Public is free; vendor dashboard requires login.</div>
          <div style={{ height: 10 }} />
          {error ? <div className="alert error">{error}</div> : null}
          <form onSubmit={onLogin} className="list">
            <div className="field">
              <label>Email</label>
              <input
                className="input"
                value={loginForm.email}
                onChange={(e) => setLoginForm((s) => ({ ...s, email: e.target.value }))}
                placeholder="vendor.tech@trustlens.local"
              />
            </div>
            <div className="field">
              <label>Password</label>
              <input
                type="password"
                className="input"
                value={loginForm.password}
                onChange={(e) => setLoginForm((s) => ({ ...s, password: e.target.value }))}
                placeholder="Vendor123"
              />
            </div>
            <button className="btn" type="submit">Login</button>
          </form>
          <div style={{ height: 10 }} />
          <div className="muted">Demo credentials (after running seed): vendor.tech@trustlens.local / Vendor123</div>
        </section>
      </div>
    )
  }

  return (
    <div className="list">
      <section className="card">
        <div className="vendorHeader">
          <div>
            <div className="vendorTitle">{sessionState?.user?.vendorName || 'Vendor'}</div>
            <div className="muted">Vendor Dashboard</div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button className="btn secondary" type="button" onClick={onLogout}>Logout</button>
            <button className="btn" type="button" onClick={() => setCreateOpen(true)}>+ Create Order</button>
          </div>
        </div>

        {error ? <div className="alert error">{error}</div> : null}
        {loading ? <div className="muted">Loading…</div> : null}

        <div style={{ height: 10 }} />

        <div className="metricsGrid">
          <div className="statCard metricCard metricCard--orders">
            <div className="statHead">
              <span className="statIcon">OR</span>
              <div className="statLabel">Total Orders</div>
            </div>
            <div className="statValue">{overview?.totalOrders ?? '—'}</div>
          </div>
          <div className="statCard metricCard metricCard--payments">
            <div className="statHead">
              <span className="statIcon">PY</span>
              <div className="statLabel">Pending Payments</div>
            </div>
            <div className="statValue">{overview?.pendingPayments ?? '—'}</div>
          </div>
          <div className="statCard metricCard metricCard--delivered">
            <div className="statHead">
              <span className="statIcon">DL</span>
              <div className="statLabel">Delivered Orders</div>
            </div>
            <div className="statValue">{overview?.deliveredOrders ?? '—'}</div>
          </div>
          <div className="statCard metricCard metricCard--trust">
            <div className="statHead">
              <span className="statIcon">TS</span>
              <div className="statLabel">Trust Score</div>
            </div>
            <div className="trustDialWrap">
              <TrustScoreDial score={overview?.averageTrustScore} />
            </div>
            <div className={trustBadgeClass(overview?.averageTrustScore)}>{trustLabel(overview?.averageTrustScore)} Confidence</div>
          </div>
          <div className="statCard metricCard metricCard--feedback">
            <div className="statHead">
              <span className="statIcon">FB</span>
              <div className="statLabel">Total Feedback</div>
            </div>
            <div className="statValue">{overview?.totalFeedbackCount ?? '—'}</div>
          </div>
        </div>

        <div style={{ height: 14 }} />

        <div className="tabs">
          <button className={tab === 'orders' ? 'tab active' : 'tab'} type="button" onClick={() => setTab('orders')}>
            Orders & Delivery
          </button>
          <button className={tab === 'payments' ? 'tab active' : 'tab'} type="button" onClick={() => setTab('payments')}>
            Payments
            <span className="tabBadge">{pendingPayments.length}</span>
          </button>
          <button className={tab === 'feedback' ? 'tab active' : 'tab'} type="button" onClick={() => setTab('feedback')}>
            Feedback
            <span className="tabBadge">{feedbacks.length}</span>
          </button>
        </div>

        <div style={{ height: 12 }} />

        {tab === 'orders' ? (
          <div className="card">
            <div className="cardTitle">Orders</div>
            <div className="tableWrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Order ID</th>
                    <th>Customer</th>
                    <th>Product</th>
                    <th>Price</th>
                    <th>Payment</th>
                    <th>Delivery</th>
                    <th>Feedback Code</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o) => (
                    <OrderRow key={o._id} order={o} onUpdateDelivery={onUpdateDelivery} />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}

        {tab === 'payments' ? (
          <div className="card">
            <div className="cardTitle">Payments</div>
            <div className="muted">Confirm payments for pending orders (demo).</div>
            <div style={{ height: 10 }} />
            <div className="tableWrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Order ID</th>
                    <th>Customer</th>
                    <th>Product</th>
                    <th>Price</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingPayments.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="muted">No pending payments.</td>
                    </tr>
                  ) : (
                    pendingPayments.map((o) => (
                      <tr key={o._id}>
                        <td>{shortId(o._id)}</td>
                        <td>
                          <div><b>{o.customerName}</b></div>
                          <div className="muted">{o.email}</div>
                          <div className="muted">{formatOrderActionLocation(o.createdLocation, 'Order')}</div>
                        </td>
                        <td><b>{o.productDetails}</b></td>
                        <td>₹{o.price}</td>
                        <td>
                          <div><span className={pillClass(o.paymentStatus)}>{o.paymentStatus}</span></div>
                          <div className="muted">{formatOrderActionLocation(o.paymentLocation, 'Payment')}</div>
                        </td>
                        <td>
                          <button className="btn" type="button" onClick={() => onConfirmPayment(o._id)}>
                            Confirm
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}

        {tab === 'feedback' ? (
          <div className="card">
            <div className="cardTitle">Customer Feedback ({feedbacks.length})</div>
            <div className="muted">Read-only: vendors cannot edit/delete feedback.</div>
            <div style={{ height: 10 }} />
            <div className="list">
              {feedbacks.length === 0 ? <div className="muted">No feedbacks yet.</div> : null}
              {feedbacks.map((f) => (
                <div key={f._id} className="card reviewCard">
                  <div className="feedbackRow">
                    <div className="feedbackScore">
                      <div className="feedbackScoreValue">{f.trustScore}</div>
                      <div className="muted">{trustLabel(f.trustScore)} Trust</div>
                    </div>
                    <div className="feedbackBody">
                      <div className="pillRow" style={{ marginBottom: 8 }}>
                        <span className={trustBadgeClass(f.trustScore)}>{f.trustLevel}</span>
                        <span className={f.codeValid ? 'pill pill--payment' : 'pill'}>{f.codeValid ? 'Verified' : 'Anonymous'}</span>
                        {f.blockchain?.txRef ? <span className="pill pill--blockchain">Blockchain Anchored</span> : null}
                        {(f.tags || []).filter((t) => t !== 'Blockchain Anchored' && t !== 'Verified').slice(0, 6).map((t) => (
                          <span key={t} className={feedbackTagClass(t)}>{t}</span>
                        ))}
                      </div>
                      <div>{f.text}</div>
                      <div style={{ height: 8 }} />
                      <div className="muted">
                        Location: {formatFeedbackLocation(f)} · Risk: {f.ipRiskLevel || 'UNKNOWN'}
                      </div>
                      <div style={{ height: 6 }} />
                      <div className="muted">
                        DupAdj: {f.dupAdj ?? 0} · MaxSim: {formatScore(f.embeddingAudit?.maxSim)}
                        {f.embeddingAudit?.modelVersion ? ` · ${f.embeddingAudit.modelVersion}` : ''}
                      </div>
                      <div style={{ height: 6 }} />
                      <div className="muted">
                        {formatDate(f.createdAt)} · {f.blockchain?.txRef ? `${String(f.blockchain.txRef).slice(0, 12)}…` : '—'}
                      </div>
                      <FeedbackExplanation feedback={f} buttonLabel="Why this score and tags?" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </section>

      {createOpen ? (
        <div className="modalOverlay" role="presentation" onClick={() => setCreateOpen(false)}>
          <div className="modalCard" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <div className="modalHeader">
              <div>
                <div className="cardTitle" style={{ marginBottom: 0 }}>Create New Order</div>
                <div className="muted">Generates invoice + feedback code.</div>
              </div>
              <button className="btn secondary" type="button" onClick={() => setCreateOpen(false)}>×</button>
            </div>

            <div style={{ height: 10 }} />
            <form onSubmit={onCreateOrder} className="list">
              <div className="row">
                <div className="field">
                  <label>Customer Name *</label>
                  <input className="input" value={createForm.customerName} onChange={(e) => setCreateForm((s) => ({ ...s, customerName: e.target.value }))} />
                </div>
                <div className="field">
                  <label>Customer Email *</label>
                  <input className="input" value={createForm.email} onChange={(e) => setCreateForm((s) => ({ ...s, email: e.target.value }))} />
                </div>
              </div>
              <div className="row">
                <div className="field">
                  <label>Phone *</label>
                  <input className="input" value={createForm.phone} onChange={(e) => setCreateForm((s) => ({ ...s, phone: e.target.value }))} />
                </div>
                <div className="field">
                  <label>Price (₹) *</label>
                  <input className="input" type="number" value={createForm.price} onChange={(e) => setCreateForm((s) => ({ ...s, price: e.target.value }))} />
                </div>
              </div>
              <div className="field">
                <label>Address *</label>
                <input className="input" value={createForm.address} onChange={(e) => setCreateForm((s) => ({ ...s, address: e.target.value }))} />
              </div>
              <div className="field">
                <label>Product Name *</label>
                <input className="input" value={createForm.productName} onChange={(e) => setCreateForm((s) => ({ ...s, productName: e.target.value }))} />
              </div>
              <div className="field">
                <label>Product Details</label>
                <textarea className="textarea" value={createForm.productDetails} onChange={(e) => setCreateForm((s) => ({ ...s, productDetails: e.target.value }))} />
              </div>
              <button className="btn" type="submit" disabled={creating}>
                {creating ? 'Creating…' : 'Create Order & Generate Invoice'}
              </button>
            </form>
          </div>
        </div>
      ) : null}

      {createResult ? (
        <section className="card">
          <div className="cardTitle">Latest Order Created</div>
          <div className="kvs">
            <div className="kv">
              <div className="k">Invoice</div>
              <div className="v">{createResult.invoice?.invoiceNumber || '—'}</div>
            </div>
            <div className="kv">
              <div className="k">Feedback Code</div>
              <div className="v">{createResult.order?.feedbackCode || '—'}</div>
            </div>
            <div className="kv">
              <div className="k">Order Location</div>
              <div className="v">{formatLocationText(createResult.order?.createdLocation)}</div>
            </div>
          </div>
          <div className="muted">Email is simulated (printed in backend console).</div>
        </section>
      ) : null}

      {!vendorId && defaultVendorId ? (
        <div className="muted">Default vendor: {defaultVendorId}</div>
      ) : null}
    </div>
  )
}

function OrderRow({ order, onUpdateDelivery }) {
  const [status, setStatus] = useState(order.deliveryStatus)
  const [trackingRef, setTrackingRef] = useState(order.deliveryHistory?.at(-1)?.trackingRef || '')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setStatus(order.deliveryStatus)
  }, [order.deliveryStatus])

  async function submit() {
    try {
      setSaving(true)
      await onUpdateDelivery(order._id, status, trackingRef)
    } finally {
      setSaving(false)
    }
  }

  return (
    <tr>
      <td>{shortId(order._id)}</td>
      <td>
        <div><b>{order.customerName}</b></div>
        <div className="muted">{order.email}</div>
        <div className="muted">{formatOrderActionLocation(order.createdLocation, 'Order')}</div>
      </td>
      <td><b>{order.productDetails}</b></td>
      <td>₹{order.price}</td>
      <td>
        <div><span className={pillClass(order.paymentStatus)}>{order.paymentStatus}</span></div>
        <div className="muted">{formatOrderActionLocation(order.paymentLocation, 'Payment')}</div>
      </td>
      <td><span className={pillClass(order.deliveryStatus)}>{order.deliveryStatus}</span></td>
      <td><span className="pill">{order.feedbackCode}</span></td>
      <td>
        <div style={{ display: 'grid', gap: 6 }}>
          <select className="select" value={status} onChange={(e) => setStatus(e.target.value)}>
            {DELIVERY_OPTIONS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <input
            className="input"
            value={trackingRef}
            placeholder="Tracking ref (optional)"
            onChange={(e) => setTrackingRef(e.target.value)}
          />
          <button className="btn secondary" type="button" disabled={saving} onClick={submit}>
            {saving ? 'Updating…' : 'Update'}
          </button>
        </div>
      </td>
    </tr>
  )
}
