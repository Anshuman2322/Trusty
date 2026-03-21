import { TransparencyIcon } from './TransparencyIcon'

const LIMITATION_POINTS = [
  'Trust scores represent probabilistic credibility signals, not guaranteed truth.',
  'Feedback should be interpreted with context and multiple signals.',
  'Signals can evolve as abuse patterns change and model safeguards are upgraded.',
]

const OPERATIONAL_NOTES = [
  'Scoring logic is versioned for traceability.',
  'Signal outages fall back to neutral behavior instead of hard rejection.',
  'Explanations are retained for auditability.',
]

export function LimitationsSection() {
  return (
    <section className="tpSection revealUp" style={{ '--reveal-delay': '370ms' }}>
      <div className="tpSectionHead">
        <div className="tpHeadIcon" aria-hidden="true">
          <TransparencyIcon name="alert" />
        </div>
        <div>
          <h2>Limitations and Transparency</h2>
          <p>
            Trusty favors measurable credibility signals over binary moderation decisions.
            Scores support decision making, but should not be treated as definitive truth.
          </p>
        </div>
      </div>

      <div className="tpSplitGrid">
        <article className="tpSubCard">
          <h3>What this score means</h3>
          <ul className="tpList">
            {LIMITATION_POINTS.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </article>

        <article className="tpSubCard">
          <h3>Industrial-grade safeguards</h3>
          <ul className="tpList">
            {OPERATIONAL_NOTES.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </article>
      </div>
    </section>
  )
}
