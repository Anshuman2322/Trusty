import { AboutIcon } from './AboutIcon'

const TRUST_FLOW = [
  { icon: 'token', label: 'Token' },
  { icon: 'payment', label: 'Payment' },
  { icon: 'behavior', label: 'Behavior' },
  { icon: 'device', label: 'Device' },
  { icon: 'context', label: 'Context' },
  { icon: 'score', label: 'Trust Score' },
]

export function TrustFlowSection() {
  return (
    <section className="abSection revealUp" style={{ '--reveal-delay': '220ms' }}>
      <div className="abSectionInner">
        <header className="abSectionHead">
          <h2>How Trust is Calculated</h2>
          <p>
            Each feedback is evaluated using independent signals and assigned a transparent trust score.
          </p>
        </header>

        <div className="abFlow" role="list" aria-label="Trust signal flow">
          {TRUST_FLOW.map((item, index) => (
            <div className="abFlowStep" key={item.label} role="listitem">
              <div className="abFlowNode">
                <span className="abFlowIcon" aria-hidden="true">
                  <AboutIcon name={item.icon} />
                </span>
                <span>{item.label}</span>
              </div>
              {index < TRUST_FLOW.length - 1 ? <span className="abFlowArrow" aria-hidden="true">-&gt;</span> : null}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
