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
            <div className="vdInsightIcon" aria-hidden="true">{insight.icon}</div>
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
