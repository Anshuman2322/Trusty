import { useEffect, useMemo, useState } from 'react'
import { apiDelete, apiPost, apiPut } from '../../../lib/api'
import { CardDetailsDrawer } from './CardDetailsDrawer'
import { LeadCard } from './LeadCard'
import { StageColumn } from './StageColumn'
import './PipelineBoard.css'

const STAGES = [
  { key: 'new_lead', label: 'New Lead' },
  { key: 'contacted', label: 'Contacted' },
  { key: 'negotiation_follow_up', label: 'Negotiation / Follow-up' },
  { key: 'invoice_sent', label: 'Invoice Sent' },
  { key: 'payment_pending', label: 'Payment Pending' },
  { key: 'payment_received', label: 'Payment Received' },
  { key: 'order_processing', label: 'Order Processing' },
  { key: 'shipped', label: 'Shipped' },
  { key: 'delivered', label: 'Delivered' },
  { key: 'feedback_retention', label: 'Feedback & Retention' },
]

const MONETARY_STAGES = new Set([
  'invoice_sent',
  'payment_pending',
  'payment_received',
  'order_processing',
  'shipped',
  'delivered',
  'feedback_retention',
])

const ORDER_DELIVERY_MAP = {
  not_started: 'CREATED',
  processing: 'CREATED',
  dispatched: 'DISPATCHED',
  in_transit: 'IN_TRANSIT',
  in_customs: 'IN_CUSTOMS',
  out_of_customs: 'OUT_OF_CUSTOMS',
  out_for_delivery: 'OUT_FOR_DELIVERY',
  delivered: 'DELIVERED',
}

function normalizeWhitespace(value) {
  return String(value || '').replace(/\s+/g, ' ').trim()
}

function statusFromStage(stage) {
  if (stage === 'contacted' || stage === 'negotiation_follow_up' || stage === 'invoice_sent') return 'contacted'
  if (stage === 'payment_received' || stage === 'order_processing' || stage === 'shipped' || stage === 'delivered' || stage === 'feedback_retention') return 'converted'
  return 'new'
}

function stageFromPayment(status) {
  if (status === 'paid') return 'payment_received'
  if (status === 'pending') return 'payment_pending'
  return 'invoice_sent'
}

function stageFromDelivery(status) {
  if (status === 'delivered') return 'delivered'
  if (['dispatched', 'in_transit', 'in_customs', 'out_of_customs', 'out_for_delivery'].includes(status)) return 'shipped'
  if (status === 'processing') return 'order_processing'
  return 'order_processing'
}

function buildPitch(record) {
  return `Hi ${record?.name || 'there'},\n\nThank you for your interest in ${record?.product || 'our product'}.\nWe can support delivery to ${record?.country || 'your location'} and share options on dosage, quantity, and timeline.\n\nPlease confirm your preferred quantity and expected delivery window.\n\nBest regards,\n${record?.vendorName || 'Sales Team'}`
}

function toOrderPayload(record, amount) {
  return {
    customerName: record?.name || 'Customer',
    email: record?.email || '',
    phone: record?.phone || '',
    address: record?.address || '',
    productDetails: record?.product || 'General product',
    price: Number(amount || 0),
  }
}

function followUpState(followUpAt) {
  if (!followUpAt) return 'none'
  const when = new Date(followUpAt).getTime()
  if (!when) return 'none'
  const now = Date.now()
  if (when < now) return 'overdue'
  const withinDay = when - now <= 24 * 60 * 60 * 1000
  return withinDay ? 'upcoming' : 'later'
}

function formatMoney(value) {
  const num = Number(value || 0)
  if (!Number.isFinite(num)) return '$0'
  if (Math.abs(num) >= 1000) {
    return `$${(num / 1000).toFixed(1)}k`
  }
  return `$${num.toFixed(0)}`
}

export function PipelineBoard({ vendorId, leads = [], orders = [], onRefresh, onError }) {
  const [query, setQuery] = useState('')
  const [countryFilter, setCountryFilter] = useState('all')
  const [productFilter, setProductFilter] = useState('all')
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [paymentFilter, setPaymentFilter] = useState('all')
  const [archiveView, setArchiveView] = useState('active')
  const [selected, setSelected] = useState(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!selected?._id) return
    const fresh = leads.find((lead) => String(lead?._id) === String(selected._id))
    if (!fresh) {
      setSelected(null)
      return
    }
    setSelected(fresh)
  }, [leads, selected?._id])

  const countries = useMemo(() => {
    const set = new Set(leads.map((item) => normalizeWhitespace(item.country)).filter(Boolean))
    return Array.from(set).sort((a, b) => a.localeCompare(b))
  }, [leads])

  const products = useMemo(() => {
    const set = new Set(leads.map((item) => normalizeWhitespace(item.product)).filter(Boolean))
    return Array.from(set).sort((a, b) => a.localeCompare(b))
  }, [leads])

  const stats = useMemo(() => {
    const totalRevenue = orders
      .filter((order) => String(order?.paymentStatus || '').toUpperCase() === 'PAID')
      .reduce((sum, order) => sum + Number(order?.price || 0), 0)

    const pendingRevenue = orders
      .filter((order) => String(order?.paymentStatus || '').toUpperCase() !== 'PAID')
      .reduce((sum, order) => sum + Number(order?.price || 0), 0)

    const now = new Date()
    const monthlyRevenue = orders
      .filter((order) => {
        const date = new Date(order?.createdAt)
        return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth() && String(order?.paymentStatus || '').toUpperCase() === 'PAID'
      })
      .reduce((sum, order) => sum + Number(order?.price || 0), 0)

    const converted = leads.filter((lead) => ['payment_received', 'order_processing', 'shipped', 'delivered', 'feedback_retention'].includes(String(lead?.crmStage || ''))).length
    const conversionRate = leads.length ? (converted / leads.length) * 100 : 0

    const followUpOverdue = leads.filter((lead) => followUpState(lead?.followUpAt) === 'overdue').length
    const followUpUpcoming = leads.filter((lead) => followUpState(lead?.followUpAt) === 'upcoming').length

    return {
      totalRevenue,
      pendingRevenue,
      monthlyRevenue,
      conversionRate,
      followUpOverdue,
      followUpUpcoming,
    }
  }, [leads, orders])

  const filtered = useMemo(() => {
    const q = normalizeWhitespace(query).toLowerCase()
    return leads.filter((lead) => {
      const isArchived = Boolean(lead?.deletedAt)
      if (archiveView === 'active' && isArchived) return false
      if (archiveView === 'archived' && !isArchived) return false

      if (countryFilter !== 'all' && String(lead?.country || '') !== countryFilter) return false
      if (productFilter !== 'all' && String(lead?.product || '') !== productFilter) return false
      if (priorityFilter !== 'all' && String(lead?.priority || 'medium') !== priorityFilter) return false
      if (paymentFilter !== 'all' && String(lead?.paymentStatus || 'not_started') !== paymentFilter) return false

      if (!q) return true

      const blob = [lead?.name, lead?.email, lead?.product, lead?.country, lead?.phone, lead?.address]
        .map((item) => String(item || '').toLowerCase())
        .join(' ')
      return blob.includes(q)
    })
  }, [archiveView, countryFilter, leads, paymentFilter, priorityFilter, productFilter, query])

  const grouped = useMemo(() => {
    const map = Object.fromEntries(STAGES.map((stage) => [stage.key, []]))
    for (const lead of filtered) {
      const key = STAGES.some((stage) => stage.key === lead?.crmStage) ? lead.crmStage : 'new_lead'
      map[key].push(lead)
    }

    for (const stage of STAGES) {
      map[stage.key].sort((a, b) => {
        const aFollow = new Date(a?.followUpAt || 0).getTime() || Number.MAX_SAFE_INTEGER
        const bFollow = new Date(b?.followUpAt || 0).getTime() || Number.MAX_SAFE_INTEGER
        return aFollow - bFollow
      })
    }

    return map
  }, [filtered])

  const orderById = useMemo(() => {
    const map = new Map()
    for (const order of orders) {
      map.set(String(order?._id || ''), order)
    }
    return map
  }, [orders])

  const stageRevenue = useMemo(() => {
    const values = {}
    for (const stage of STAGES) {
      values[stage.key] = (grouped[stage.key] || []).reduce((sum, record) => {
        const linkedOrder = orderById.get(String(record?.linkedOrderId || ''))
        const amount = Number(linkedOrder?.price || 0)
        return sum + (Number.isFinite(amount) ? amount : 0)
      }, 0)
    }
    return values
  }, [grouped, orderById])

  async function runSafely(task) {
    try {
      setBusy(true)
      await task()
      await onRefresh()
    } catch (error) {
      onError(error?.message || 'Pipeline action failed')
    } finally {
      setBusy(false)
    }
  }

  async function saveRecord(record, form) {
    const payload = {
      name: normalizeWhitespace(form.name),
      email: normalizeWhitespace(form.email),
      phone: normalizeWhitespace(form.phone),
      address: normalizeWhitespace(form.address),
      country: normalizeWhitespace(form.country),
      product: normalizeWhitespace(form.product),
      date: form.date,
      status: statusFromStage(form.crmStage),
      crmStage: form.crmStage,
      priority: form.priority,
      paymentStatus: form.paymentStatus,
      deliveryStatus: form.deliveryStatus,
      followUpAt: form.followUpAt ? new Date(form.followUpAt).toISOString() : null,
      trustScore: form.trustScore === '' ? null : Number(form.trustScore),
      sentiment: form.sentiment,
      nextPurchaseProbability: form.nextPurchaseProbability === '' ? null : Number(form.nextPurchaseProbability),
      trackingRef: normalizeWhitespace(form.trackingRef),
    }

    await runSafely(async () => {
      await apiPut(`/api/leads/${record._id}`, payload)
      setSelected(null)
    })
  }

  async function addNote(record, text) {
    const noteText = normalizeWhitespace(text)
    if (!noteText) {
      onError('Note cannot be empty')
      return
    }

    await runSafely(async () => {
      const result = await apiPost(`/api/leads/${record._id}/notes`, { text: noteText })
      setSelected(result?.lead || null)
    })
  }

  async function sendEmail(record, subject, message) {
    if (!normalizeWhitespace(subject) || normalizeWhitespace(message).length < 6) {
      onError('Subject and message are required')
      return
    }

    await runSafely(async () => {
      const result = await apiPost(`/api/leads/${record._id}/send-email`, { subject, message })
      setSelected(result?.lead || null)
    })
  }

  async function generateInvoice(record) {
    const amountInput = window.prompt('Invoice amount', '0')
    if (amountInput === null) return
    const qtyInput = window.prompt('Quantity', '1')
    if (qtyInput === null) return

    const amount = Number(amountInput)
    const qty = Number(qtyInput)
    if (!Number.isFinite(amount) || amount < 0 || !Number.isFinite(qty) || qty <= 0) {
      onError('Enter valid amount and quantity')
      return
    }

    const total = amount * qty
    const invoiceNumber = `INV-${Date.now()}`
    const invoiceText = [
      'Trusty CRM Invoice',
      '===================',
      `Invoice Number: ${invoiceNumber}`,
      `Date: ${new Date().toISOString().slice(0, 10)}`,
      '',
      `Customer: ${record?.name || ''}`,
      `Email: ${record?.email || ''}`,
      `Product: ${record?.product || ''}`,
      `Quantity: ${qty}`,
      `Unit Amount: ${amount.toFixed(2)}`,
      `Total: ${total.toFixed(2)}`,
    ].join('\n')

    const blob = new Blob([invoiceText], { type: 'text/plain;charset=utf-8' })
    const url = window.URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `${invoiceNumber}.txt`
    anchor.click()
    window.URL.revokeObjectURL(url)

    await runSafely(async () => {
      await apiPut(`/api/leads/${record._id}`, {
        crmStage: 'invoice_sent',
        status: 'contacted',
        paymentStatus: 'pending',
      })
    })
  }

  async function updatePayment(record, paymentStatus) {
    const normalized = String(paymentStatus || '').toLowerCase()
    if (!['not_started', 'pending', 'paid'].includes(normalized)) {
      onError('Invalid payment status')
      return
    }

    await runSafely(async () => {
      let nextPayload = {
        paymentStatus: normalized,
        crmStage: stageFromPayment(normalized),
        status: normalized === 'paid' ? 'converted' : 'contacted',
      }

      if (normalized === 'paid' && !record?.linkedOrderId && vendorId) {
        const amountInput = window.prompt('Payment received. Enter order amount', '0')
        if (amountInput === null) return

        const createOrderRes = await apiPost(`/api/vendor/${vendorId}/orders`, toOrderPayload(record, amountInput))
        const linkedOrderId = createOrderRes?.created?.order?._id || null

        nextPayload = {
          ...nextPayload,
          linkedOrderId,
          crmStage: 'order_processing',
          deliveryStatus: 'processing',
          status: 'converted',
        }
      }

      await apiPut(`/api/leads/${record._id}`, nextPayload)
    })
  }

  async function updateDelivery(record, deliveryStatus, trackingRef) {
    const normalized = String(deliveryStatus || '').toLowerCase()
    if (!ORDER_DELIVERY_MAP[normalized]) {
      onError('Invalid delivery status')
      return
    }

    await runSafely(async () => {
      await apiPut(`/api/leads/${record._id}`, {
        deliveryStatus: normalized,
        crmStage: stageFromDelivery(normalized),
        trackingRef: normalizeWhitespace(trackingRef),
      })

      if (record?.linkedOrderId && vendorId) {
        await apiPost(`/api/vendor/${vendorId}/orders/${record.linkedOrderId}/delivery-status`, {
          status: ORDER_DELIVERY_MAP[normalized],
          trackingRef: normalizeWhitespace(trackingRef),
          shareTracking: false,
        })
      }
    })
  }

  async function addTracking(record, trackingRef) {
    const text = normalizeWhitespace(trackingRef)
    if (!text) {
      onError('Tracking reference is required')
      return
    }

    await runSafely(async () => {
      await apiPut(`/api/leads/${record._id}`, { trackingRef: text })
      if (record?.linkedOrderId && vendorId) {
        await apiPost(`/api/vendor/${vendorId}/orders/${record.linkedOrderId}/delivery-status`, {
          status: ORDER_DELIVERY_MAP[String(record?.deliveryStatus || 'processing').toLowerCase()] || 'CREATED',
          trackingRef: text,
          shareTracking: false,
        })
      }
    })
  }

  async function softDeleteRecord(record) {
    const ok = window.confirm(`Archive ${record?.name || 'this record'}?`)
    if (!ok) return

    await runSafely(async () => {
      await apiDelete(`/api/leads/${record._id}`)
      setSelected(null)
    })
  }

  async function unarchiveRecord(record) {
    await runSafely(async () => {
      await apiPost(`/api/leads/${record._id}/unarchive`, {})
      setSelected(null)
    })
  }

  return (
    <section className="vdSection crmPipeline">
      <div className="crmPipelineTop">
        <header className="crmPipelineHead">
          <div className="crmPipelineBrand">
            <div className="crmPipelineLogo" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none">
                <rect x="4" y="4" width="6" height="6" rx="1.2" stroke="currentColor" strokeWidth="1.7" />
                <rect x="14" y="4" width="6" height="6" rx="1.2" stroke="currentColor" strokeWidth="1.7" />
                <rect x="4" y="14" width="6" height="6" rx="1.2" stroke="currentColor" strokeWidth="1.7" />
                <rect x="14" y="14" width="6" height="6" rx="1.2" stroke="currentColor" strokeWidth="1.7" />
              </svg>
            </div>
            <div>
              <p className="crmPipelineKicker">Pharma CRM</p>
              <h2 className="crmPipelineTitle">Unified Pipeline</h2>
            </div>
          </div>
          <div className="crmPipelineHeadActions">
            <button type="button" className="crmGhostBtn">AI Insights</button>
            <button type="button" className="crmPrimaryBtn" onClick={() => window.alert('Use Paste Lead Data section to create new records.')}>+ New Record</button>
          </div>
        </header>

        <div className="crmStatsGrid">
          <div className="crmStatCard">
            <p className="crmStatLabel">Active Records</p>
            <p className="crmStatValue">{leads.length}</p>
          </div>
          <div className="crmStatCard">
            <p className="crmStatLabel">Conversion</p>
            <p className="crmStatValue">{stats.conversionRate.toFixed(0)}%</p>
          </div>
          <div className="crmStatCard">
            <p className="crmStatLabel">Revenue (Cleared)</p>
            <p className="crmStatValue crmStatValue--green">{formatMoney(stats.totalRevenue)}</p>
          </div>
          <div className="crmStatCard">
            <p className="crmStatLabel">Pending Receivables</p>
            <p className="crmStatValue crmStatValue--amber">{formatMoney(stats.pendingRevenue)}</p>
          </div>
          <div className="crmStatCard">
            <p className="crmStatLabel">Countries</p>
            <p className="crmStatValue">{countries.length}</p>
          </div>
          <div className="crmStatCard">
            <p className="crmStatLabel">Follow-ups Overdue</p>
            <p className="crmStatValue crmStatValue--rose">{stats.followUpOverdue}</p>
          </div>
        </div>

        <div className="crmFilterBar">
          <input className="input crmSearchInput" placeholder="Search name, company, ID, product..." value={query} onChange={(event) => setQuery(event.target.value)} />
          <div className="crmFilterRow">
            <select className="input" value={countryFilter} onChange={(event) => setCountryFilter(event.target.value)}>
              <option value="all">All countries</option>
              {countries.map((country) => (
                <option key={country} value={country}>{country}</option>
              ))}
            </select>
            <select className="input" value={productFilter} onChange={(event) => setProductFilter(event.target.value)}>
              <option value="all">All products</option>
              {products.map((product) => (
                <option key={product} value={product}>{product}</option>
              ))}
            </select>
            <select className="input" value={priorityFilter} onChange={(event) => setPriorityFilter(event.target.value)}>
              <option value="all">All priority</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
            <select className="input" value={paymentFilter} onChange={(event) => setPaymentFilter(event.target.value)}>
              <option value="all">Any payment</option>
              <option value="not_started">No payment</option>
              <option value="pending">Pending</option>
              <option value="paid">Paid</option>
            </select>
            <select className="input" value={archiveView} onChange={(event) => setArchiveView(event.target.value)}>
              <option value="active">Active leads</option>
              <option value="archived">Archived leads</option>
              <option value="all">All leads</option>
            </select>
          </div>
        </div>
      </div>

      <div className="crmBoardViewport">
        <div className="crmBoardScroller">
          <div className="crmBoardRail">
            {STAGES.map((stage) => (
              <StageColumn
                key={stage.key}
                stage={stage}
                records={grouped[stage.key] || []}
                value={stageRevenue[stage.key] || 0}
                showValue={MONETARY_STAGES.has(stage.key)}
              >
                {(grouped[stage.key] || []).map((record) => (
                  <LeadCard
                    key={record._id}
                    record={record}
                    linkedOrder={orderById.get(String(record?.linkedOrderId || ''))}
                    onOpen={setSelected}
                  />
                ))}
              </StageColumn>
            ))}
          </div>
        </div>
      </div>

      <CardDetailsDrawer
        open={Boolean(selected)}
        record={selected}
        stageMap={STAGES}
        saving={busy}
        onClose={() => setSelected(null)}
        onSave={saveRecord}
        onAddNote={addNote}
        onGeneratePitch={buildPitch}
        onSendEmail={sendEmail}
        onGenerateInvoice={generateInvoice}
        onUpdatePayment={updatePayment}
        onUpdateDelivery={updateDelivery}
        onAddTracking={addTracking}
        onSoftDelete={softDeleteRecord}
        onUnarchive={unarchiveRecord}
      />
    </section>
  )
}
