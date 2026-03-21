import { useEffect, useMemo, useState } from 'react'
import { trustLabel, trustTone } from './dataUtils'

function shortId(id) {
  const value = String(id || '')
  if (value.length <= 8) return value
  return `${value.slice(0, 8)}...`
}

function formatDate(iso) {
  if (!iso) return 'N/A'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return 'N/A'
  return d.toLocaleDateString()
}

function statusClass(status) {
  const normalized = String(status || '').toUpperCase()
  if (normalized === 'PAID') return 'vdStatus vdStatus--paid'
  if (normalized === 'PENDING') return 'vdStatus vdStatus--pending'
  if (normalized === 'DELIVERED') return 'vdStatus vdStatus--delivered'
  return 'vdStatus vdStatus--neutral'
}

export function OrdersTable({
  title = 'Orders',
  subtitle,
  orders = [],
  loading = false,
  feedbackByOrderId = new Map(),
  initialFilter = 'all',
  onConfirmPayment,
  onMarkDelivered,
  onAddTracking,
  onViewFeedback,
  onUpdateOrder,
}) {
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState(initialFilter)
  const [sortBy, setSortBy] = useState('newest')

  useEffect(() => {
    setStatusFilter(initialFilter)
  }, [initialFilter])

  const filtered = useMemo(() => {
    const lowered = query.trim().toLowerCase()

    const matchesStatus = (order) => {
      if (statusFilter === 'all') return true
      if (statusFilter === 'pending') return String(order?.deliveryStatus || '').toUpperCase() !== 'DELIVERED'
      if (statusFilter === 'delivered') return String(order?.deliveryStatus || '').toUpperCase() === 'DELIVERED'
      if (statusFilter === 'payment-pending') return String(order?.paymentStatus || '').toUpperCase() === 'PENDING'
      if (statusFilter === 'payment-paid') return String(order?.paymentStatus || '').toUpperCase() === 'PAID'
      return true
    }

    const matchesSearch = (order) => {
      if (!lowered) return true
      const blob = [
        order?.customerName,
        order?.email,
        order?.productDetails,
        order?.feedbackCode,
        order?._id,
      ]
        .map((item) => String(item || '').toLowerCase())
        .join(' ')
      return blob.includes(lowered)
    }

    const sorted = orders
      .filter((order) => matchesStatus(order) && matchesSearch(order))
      .sort((a, b) => {
        if (sortBy === 'newest') {
          return (new Date(b?.createdAt).getTime() || 0) - (new Date(a?.createdAt).getTime() || 0)
        }

        if (sortBy === 'oldest') {
          return (new Date(a?.createdAt).getTime() || 0) - (new Date(b?.createdAt).getTime() || 0)
        }

        if (sortBy === 'price-desc') return Number(b?.price || 0) - Number(a?.price || 0)
        if (sortBy === 'price-asc') return Number(a?.price || 0) - Number(b?.price || 0)

        if (sortBy === 'trust-desc') {
          const aTrust = feedbackByOrderId.get(String(a?._id))?.trustScore || 0
          const bTrust = feedbackByOrderId.get(String(b?._id))?.trustScore || 0
          return Number(bTrust) - Number(aTrust)
        }

        return 0
      })

    return sorted
  }, [orders, feedbackByOrderId, query, sortBy, statusFilter])

  return (
    <section className="vdSection">
      <div className="vdSectionHead vdSectionHead--row">
        <div>
          <h2>{title}</h2>
          {subtitle ? <p>{subtitle}</p> : null}
        </div>

        <div className="vdTableToolbar">
          <input
            className="vdInput"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search orders, customer, product..."
            aria-label="Search orders"
          />
          <select className="vdInput" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="all">All</option>
            <option value="pending">Pending</option>
            <option value="delivered">Delivered</option>
            <option value="payment-pending">Payment Pending</option>
            <option value="payment-paid">Payment Paid</option>
          </select>
          <select className="vdInput" value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
            <option value="price-desc">Price High-Low</option>
            <option value="price-asc">Price Low-High</option>
            <option value="trust-desc">Trust High-Low</option>
          </select>
        </div>
      </div>

      <div className="vdTableWrap vdTableWrap--stack">
        <table className="vdTable vdTable--stack">
          <thead>
            <tr>
              <th>Order</th>
              <th>Customer</th>
              <th>Product</th>
              <th>Price</th>
              <th>Payment</th>
              <th>Delivery</th>
              <th>Trust</th>
              <th>Feedback</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={9}>
                  <div className="vdTableEmpty">Loading orders...</div>
                </td>
              </tr>
            ) : null}

            {!loading && filtered.length === 0 ? (
              <tr>
                <td colSpan={9}>
                  <div className="vdTableEmpty">No matching orders found.</div>
                </td>
              </tr>
            ) : null}

            {!loading
              ? filtered.map((order) => {
                const linkedFeedback = feedbackByOrderId.get(String(order._id))
                const trustScore = Number(linkedFeedback?.trustScore || 0)
                const trust = linkedFeedback
                  ? `${Math.round(trustScore)} (${trustLabel(trustScore)})`
                  : 'N/A'

                return (
                  <tr key={order._id}>
                    <td data-label="Order">
                      <strong>{shortId(order._id)}</strong>
                      <div className="vdCellSub">{formatDate(order.createdAt)}</div>
                    </td>
                    <td data-label="Customer">
                      <strong>{order.customerName}</strong>
                      <div className="vdCellSub">{order.email}</div>
                    </td>
                    <td data-label="Product">
                      <strong>{order.productDetails}</strong>
                    </td>
                    <td data-label="Price">INR {order.price}</td>
                    <td data-label="Payment">
                      <span className={statusClass(order.paymentStatus)}>{order.paymentStatus}</span>
                      {String(order.paymentStatus || '').toUpperCase() === 'PENDING' ? (
                        <button className="vdInlineAction" type="button" onClick={() => onConfirmPayment(order._id)}>
                          Confirm
                        </button>
                      ) : null}
                    </td>
                    <td data-label="Delivery">
                      <span className={statusClass(order.deliveryStatus)}>{order.deliveryStatus}</span>
                    </td>
                    <td data-label="Trust">
                      <span className={`vdTrustText vdTrustText--${trustTone(trustScore)}`}>{trust}</span>
                    </td>
                    <td data-label="Feedback">
                      <button
                        className="vdInlineAction"
                        type="button"
                        disabled={!linkedFeedback}
                        onClick={() => onViewFeedback(order)}
                      >
                        View Feedback
                      </button>
                    </td>
                    <td data-label="Actions">
                      <details className="vdActionMenu">
                        <summary>Actions</summary>
                        <div className="vdActionMenuList">
                          <button type="button" onClick={() => onMarkDelivered(order)}>Mark as Delivered</button>
                          <button type="button" onClick={() => onAddTracking(order)}>Add Tracking</button>
                          <button type="button" onClick={() => onViewFeedback(order)}>View Feedback</button>
                          <button type="button" onClick={() => onUpdateOrder(order)}>Update Order</button>
                        </div>
                      </details>
                    </td>
                  </tr>
                )
              })
              : null}
          </tbody>
        </table>
      </div>
    </section>
  )
}
