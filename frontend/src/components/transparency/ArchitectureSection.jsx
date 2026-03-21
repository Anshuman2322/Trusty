import { TransparencyIcon } from './TransparencyIcon'

const FLOW = [
  'Frontend',
  'Backend Trust Engine',
  'AI Service',
  'Database',
  'Blockchain Anchor',
]

export function ArchitectureSection() {
  return (
    <section className="tpSection revealUp" style={{ '--reveal-delay': '420ms' }}>
      <div className="tpSectionHead">
        <div className="tpHeadIcon" aria-hidden="true">
          <TransparencyIcon name="architecture" />
        </div>
        <div>
          <h2>System Architecture</h2>
          <p>
            Trusty separates collection, scoring, AI analysis, persistence, and anchoring into clear operational layers.
          </p>
        </div>
      </div>

      <div className="tpFlow" role="list" aria-label="System architecture flow">
        {FLOW.map((step, index) => (
          <div className="tpFlowStep" key={step} role="listitem">
            <div className="tpFlowNode">{step}</div>
            {index < FLOW.length - 1 ? <div className="tpFlowArrow" aria-hidden="true">{'->'}</div> : null}
          </div>
        ))}
      </div>
    </section>
  )
}
