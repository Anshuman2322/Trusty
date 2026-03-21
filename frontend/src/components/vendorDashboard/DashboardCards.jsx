import { normalizeScore, trustLabel, trustTone } from './dataUtils'

function TrustRing({ score }) {
  const safe = normalizeScore(score)
  return (
    <div className={`vdTrustRing vdTrustRing--${trustTone(safe)}`} style={{ '--ring-progress': `${safe}%` }}>
      <div className="vdTrustRingInner">
        <strong>{safe}</strong>
      </div>
    </div>
  )
}

function Badge({ text, tone = 'neutral' }) {
  return <span className={`vdBadge vdBadge--${tone}`}>{text}</span>
}

export function DashboardCards({ overview }) {
  const trustScore = normalizeScore(overview?.averageTrustScore)

  const cards = [
    {
      key: 'orders',
      title: 'Total Orders',
      value: overview?.totalOrders ?? 0,
      description: 'All orders created by your business.',
      badge: { text: 'Operational', tone: 'info' },
    },
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
    {
      key: 'feedback',
      title: 'Total Feedback',
      value: overview?.totalFeedbackCount ?? 0,
      description: 'Customer feedback submissions received.',
      badge: { text: 'Live feed', tone: 'info' },
    },
  ]

  return (
    <section className="vdSection">
      <div className="vdSectionHead">
        <h2>Overview</h2>
        <p>Quick KPI snapshot of your trust and order operations.</p>
      </div>

      <div className="vdCardGrid">
        {cards.map((card) => (
          <article className="vdKpiCard" key={card.key}>
            <div className="vdKpiTop">
              <h3>{card.title}</h3>
              <Badge text={card.badge.text} tone={card.badge.tone} />
            </div>
            <div className="vdKpiValue">{card.value}</div>
            <p>{card.description}</p>
          </article>
        ))}

        <article className="vdKpiCard vdKpiCard--trust">
          <div className="vdKpiTop">
            <h3>Trust Score</h3>
            <Badge text={trustLabel(trustScore)} tone={trustTone(trustScore) === 'high' ? 'good' : trustTone(trustScore) === 'medium' ? 'warn' : 'danger'} />
          </div>
          <TrustRing score={trustScore} />
          <p>Circular confidence indicator built from your verified feedback trust average.</p>
        </article>
      </div>
    </section>
  )
}
