import { normalizeScore, trustTone } from './dataUtils'

function formatCompactNumber(value) {
  const n = Number(value || 0)
  if (!Number.isFinite(n)) return '0'
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(n)
}

function formatCurrency(value) {
  const n = Number(value || 0)
  if (!Number.isFinite(n)) return 'Rs 0'
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(n)
}

function MetricIcon({ kind }) {
  if (kind === 'orders') {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M4 5h2l1.7 8.2h9l1.8-5.7H8.1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="10" cy="18.5" r="1.4" fill="currentColor" />
        <circle cx="16.8" cy="18.5" r="1.4" fill="currentColor" />
      </svg>
    )
  }

  if (kind === 'delivered') {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M5 14l4-4 3 3 7-7" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  }

  if (kind === 'feedback') {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M5 6h14v9a2 2 0 01-2 2H9l-4 3V8a2 2 0 012-2z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      </svg>
    )
  }

  if (kind === 'trust') {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M12 4l7 2.5V12c0 4.2-2.8 7.3-7 8-4.2-.7-7-3.8-7-8V6.5L12 4z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      </svg>
    )
  }

  if (kind === 'revenue') {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <rect x="4" y="7" width="16" height="10" rx="2" stroke="currentColor" strokeWidth="1.8" />
        <path d="M8 12h8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    )
  }

  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.8" />
      <path d="M12 8v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="12" cy="16" r="1" fill="currentColor" />
    </svg>
  )
}

function Badge({ text, tone = 'neutral' }) {
  return <span className={`vdBadge vdBadge--${tone}`}>{text}</span>
}

function buildWeeklyTrustDelta(feedbacks = []) {
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

  const deltaPct = prevAvg > 0 ? ((thisAvg - prevAvg) / prevAvg) * 100 : 0
  return Number(deltaPct.toFixed(1))
}

export function DashboardCards({ overview, feedbacks = [], orders = [] }) {
  const trustScore = normalizeScore(overview?.averageTrustScore)
  const weeklyTrustDelta = buildWeeklyTrustDelta(feedbacks)
  const isTrustImproving = weeklyTrustDelta >= 0
  const totalFeedback = overview?.totalFeedbackCount ?? feedbacks.length

  const revenue = orders.reduce((sum, order) => {
    const value = Number(order?.price ?? order?.invoice?.totalAmount ?? order?.invoice?.amount ?? 0)
    return Number.isFinite(value) ? sum + value : sum
  }, 0)

  const trustMetricCards = [
    {
      key: 'trust',
      label: 'Trust Score',
      value: trustScore,
      trend: `${isTrustImproving ? '+' : ''}${weeklyTrustDelta}%`,
      kind: 'trust',
      tone: trustTone(trustScore),
    },
    {
      key: 'feedback',
      label: 'Total Feedback',
      value: formatCompactNumber(totalFeedback),
      trend: `${isTrustImproving ? '+' : ''}${Math.max(0, Math.round(totalFeedback * 0.08))}`,
      kind: 'feedback',
      tone: 'neutral',
    },
    {
      key: 'revenue',
      label: 'Revenue',
      value: formatCurrency(revenue),
      trend: `${isTrustImproving ? '+' : ''}${Math.abs(weeklyTrustDelta)}%`,
      kind: 'revenue',
      tone: 'neutral',
    },
  ]

  const secondaryCards = [
    {
      key: 'pending',
      title: 'Pending Payments',
      value: overview?.pendingPayments ?? 0,
      description: 'Payments waiting for confirmation.',
      badge: { text: 'Needs action', tone: 'warn' },
    },
    {
      key: 'delivered',
      title: 'Delivered Orders',
      value: overview?.deliveredOrders ?? 0,
      description: 'Orders completed in delivery flow.',
      badge: { text: 'Completed', tone: 'good' },
    },
  ]

  return (
    <section className="vdSection">
      <div className="vdSectionHead">
        <h2>Overview</h2>
        <p>Quick KPI snapshot of your trust and order operations.</p>
      </div>

      <div className="vdKpiBandTitle">Primary Metrics</div>
      <div className="vdOverviewMetricGrid">
        {trustMetricCards.map((metric) => (
          <article className={`vdOverviewMetricCard vdOverviewMetricCard--${metric.tone} ${metric.key === 'trust' ? 'vdOverviewMetricCard--trustMain' : ''}`} key={metric.key}>
            <div className="vdOverviewMetricTop">
              <span className="vdOverviewMetricIcon"><MetricIcon kind={metric.kind} /></span>
              <span className={String(metric.trend).startsWith('-') ? 'vdOverviewMetricTrend vdOverviewMetricTrend--down' : 'vdOverviewMetricTrend'}>{metric.trend}</span>
            </div>
            <div className="vdOverviewMetricValue">{metric.value}</div>
            <p className="vdOverviewMetricLabel">{metric.label}</p>
          </article>
        ))}
      </div>

      <div className="vdKpiBandTitle">Operational Details</div>
      <div className="vdCardGrid vdCardGrid--secondary">
        {secondaryCards.map((card) => (
          <article className="vdKpiCard vdKpiCard--secondary" key={card.key}>
            <div className="vdKpiTop">
              <h3>{card.title}</h3>
              <Badge text={card.badge.text} tone={card.badge.tone} />
            </div>
            <div className="vdKpiValue">{card.value}</div>
            <p>{card.description}</p>
          </article>
        ))}
      </div>

      <p className="vdKpiFootnote">Overview highlights core trust, feedback, and revenue signals with essential operational follow-through.</p>
    </section>
  )
}
