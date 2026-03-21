import { TransparencyIcon } from './TransparencyIcon'

const RULES = [
  'Vendors cannot edit feedback',
  'Vendors cannot delete reviews',
  'Trust scores are system generated',
  'Suspicious behavior reduces trust score instead of removing feedback',
]

export function IntegrityRules() {
  return (
    <section className="tpSection revealUp" style={{ '--reveal-delay': '320ms' }}>
      <div className="tpSectionHead">
        <div className="tpHeadIcon" aria-hidden="true">
          <TransparencyIcon name="integrity" />
        </div>
        <div>
          <h2>Platform Integrity Rules</h2>
          <p>
            Platform governance is designed to prevent manipulation and preserve historical transparency.
          </p>
        </div>
      </div>

      <div className="tpRuleGrid" role="list" aria-label="Integrity rules">
        {RULES.map((rule) => (
          <article className="tpRuleCard" key={rule} role="listitem">
            <span className="tpRuleIcon" aria-hidden="true">
              <TransparencyIcon name="integrity" />
            </span>
            <p>{rule}</p>
          </article>
        ))}
      </div>
    </section>
  )
}
