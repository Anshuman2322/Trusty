function InsightGlyph({ type }) {
  if (type === 'success') {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="12" r="8.2" stroke="currentColor" strokeWidth="1.8" />
        <path d="M8.6 12.2l2.3 2.2 4.6-4.7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  }

  if (type === 'warning') {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M12 4.8L20 18.2H4L12 4.8z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
        <path d="M12 9.4v4.4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <circle cx="12" cy="15.9" r="1" fill="currentColor" />
      </svg>
    )
  }

  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="8.2" stroke="currentColor" strokeWidth="1.8" />
      <path d="M12 10.2v5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="12" cy="7.5" r="1" fill="currentColor" />
    </svg>
  )
}

export function InsightsPanel({ insights = [] }) {
  return (
    <section className="vdSection">
      <div className="vdSectionHead">
        <h2>Quick Insights</h2>
        <p>Short, actionable intelligence generated from your recent activity.</p>
      </div>

      <div className="vdInsightGrid" role="list" aria-label="Vendor insights">
        {insights.map((insight) => (
          <article className={`vdInsightCard vdInsightCard--${insight.tone || 'neutral'}`} key={insight.key} role="listitem">
            <div className="vdInsightIcon" aria-hidden="true"><InsightGlyph type={insight.icon} /></div>
            <div>
              <h3>{insight.title}</h3>
              <p>{insight.detail}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
