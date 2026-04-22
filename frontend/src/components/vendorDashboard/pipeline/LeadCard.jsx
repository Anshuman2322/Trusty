function paymentTone(status) {
  const normalized = String(status || '').toLowerCase()
  if (normalized === 'paid') return 'crmBadge crmBadge--paid'
  if (normalized === 'pending') return 'crmBadge crmBadge--pending'
  return 'crmBadge crmBadge--neutral'
}

function priorityTone(priority) {
  const normalized = String(priority || '').toLowerCase()
  if (normalized === 'high') return 'crmPriority crmPriority--high'
  if (normalized === 'medium') return 'crmPriority crmPriority--medium'
  return 'crmPriority crmPriority--low'
}

function trustTone(score) {
  const value = Number(score || 0)
  if (value >= 70) return 'crmTrust crmTrust--good'
  if (value >= 40) return 'crmTrust crmTrust--warn'
  return 'crmTrust crmTrust--bad'
}

function followUpTone(followUpAt) {
  if (!followUpAt) return ''
  const when = new Date(followUpAt).getTime()
  if (!when) return ''
  const now = Date.now()
  const hour = 60 * 60 * 1000
  if (when < now) return 'overdue'
  if (when - now <= 24 * hour) return 'today'
  return ''
}

function followUpLabel(followUpAt) {
  if (!followUpAt) return ''
  const when = new Date(followUpAt).getTime()
  if (!when) return ''
  const now = Date.now()
  if (when < now) return 'Overdue follow-up'
  const inMs = when - now
  if (inMs <= 24 * 60 * 60 * 1000) return 'Follow-up today'
  return `Follow-up ${new Date(followUpAt).toLocaleDateString()}`
}

function initials(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return 'NA'
  const first = parts[0]?.[0] || ''
  const second = parts[1]?.[0] || ''
  return `${first}${second}`.toUpperCase()
}

function formatAmount(value) {
  const num = Number(value || 0)
  if (!Number.isFinite(num)) return '$0'
  return `$${num.toLocaleString()}`
}

function supportsMonetaryDetails(stage) {
  const normalized = String(stage || '').toLowerCase()
  return [
    'invoice_sent',
    'payment_pending',
    'payment_received',
    'order_processing',
    'shipped',
    'delivered',
    'feedback_retention',
  ].includes(normalized)
}

function supportsReputationTags(stage) {
  return String(stage || '').toLowerCase() === 'feedback_retention'
}

function leadCreatedAtMeta(record) {
  const raw = record?.createdAt
  if (!raw) return null
  const date = new Date(raw)
  if (Number.isNaN(date.getTime())) return null
  return {
    label: date.toLocaleDateString(),
    full: date.toLocaleString(),
  }
}

export function LeadCard({ record, linkedOrder, onOpen }) {
  const trustScore = Number(record?.trustScore)
  const followState = followUpTone(record?.followUpAt)
  const amount = Number(linkedOrder?.price || 0)
  const showMonetaryDetails = supportsMonetaryDetails(record?.crmStage)
  const showReputationTags = supportsReputationTags(record?.crmStage)
  const createdAtMeta = leadCreatedAtMeta(record)

  return (
    <button
      type="button"
      className={`crmLeadCard ${followState ? `is-${followState}` : ''}`}
      onClick={() => onOpen(record)}
    >
      <div className="crmLeadTop">
        <div className="crmLeadAvatar">{initials(record?.name)}</div>
        <div className="crmLeadNameWrap">
          <h4 className="crmLeadName">{record?.name || 'Unknown lead'}</h4>
          <p className="crmLeadCompany">{record?.email || 'No email'}</p>
        </div>
        {showReputationTags ? (
          <span className={priorityTone(record?.priority)}>
            {(record?.priority || 'medium').toUpperCase().slice(0, 3)}
          </span>
        ) : null}
      </div>

      <p className="crmLeadProduct">{record?.product || 'Product not set'}</p>
      <p className="crmLeadCountry">{record?.country || 'Country N/A'}</p>

      {showMonetaryDetails ? <div className="crmLeadAmount">{formatAmount(amount)}</div> : null}

      <div className="crmLeadBadges">
        <span className="crmBadge crmBadge--status">
          {String(record?.status || 'new').replace('_', ' ')}
        </span>
        {showMonetaryDetails ? (
          <span className={paymentTone(record?.paymentStatus)}>
            {String(record?.paymentStatus || 'not_started').replace('_', ' ')}
          </span>
        ) : null}
        {showReputationTags && Number.isFinite(trustScore) ? (
          <span className={trustTone(trustScore)}>
            Trust {Math.round(trustScore)}
          </span>
        ) : null}
      </div>

      {record?.followUpAt ? (
        <div className={`crmFollowUpTag ${followState ? `is-${followState}` : ''}`}>
          {followUpLabel(record.followUpAt)}
        </div>
      ) : null}

      {createdAtMeta ? (
        <div className="crmLeadCreatedAt" title={createdAtMeta.full}>
          {createdAtMeta.label}
        </div>
      ) : null}
    </button>
  )
}
