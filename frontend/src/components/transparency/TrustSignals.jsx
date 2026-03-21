import { TransparencyIcon } from './TransparencyIcon'

const SIGNALS = [
  {
    title: 'Token Verification',
    description: 'Checks whether feedback is submitted using a valid vendor-issued token.',
    icon: 'token',
    role: 'Identity of the feedback path',
  },
  {
    title: 'Payment Proof',
    description: 'Confirms that feedback is linked to a real purchase or order.',
    icon: 'payment',
    role: 'Real transaction linkage',
  },
  {
    title: 'AI Behavior Analysis',
    description: 'Analyzes typing patterns, edits, and paste behavior to detect unnatural input.',
    icon: 'behavior',
    role: 'Human-like writing behavior',
  },
  {
    title: 'Device Pattern Detection',
    description: 'Detects repeated submissions from the same device fingerprint.',
    icon: 'device',
    role: 'Abuse repetition signal',
  },
  {
    title: 'IP Intelligence',
    description: 'Identifies VPN, proxy, or suspicious network activity.',
    icon: 'ip',
    role: 'Soft risk adjustment',
  },
  {
    title: 'Context Depth',
    description: 'Evaluates how detailed and meaningful the feedback content is.',
    icon: 'context',
    role: 'Substance and specificity',
  },
]

export function TrustSignals() {
  return (
    <section className="tpSection revealUp" style={{ '--reveal-delay': '120ms' }}>
      <div className="tpSectionHead">
        <div className="tpHeadIcon" aria-hidden="true">
          <TransparencyIcon name="integrity" />
        </div>
        <div>
          <h2>Trust Signals Used</h2>
          <p>
            Trusty combines independent checks so no single signal can fully determine credibility.
            This keeps scoring resilient and explainable.
          </p>
        </div>
      </div>

      <div className="tpSignalGrid" role="list" aria-label="Trust signal cards">
        {SIGNALS.map((signal) => (
          <article className="tpSignalCard" key={signal.title} role="listitem">
            <div className="tpSignalHead">
              <span className="tpSignalIcon" aria-hidden="true">
                <TransparencyIcon name={signal.icon} />
              </span>
              <h3>{signal.title}</h3>
            </div>
            <p>{signal.description}</p>
            <div className="tpSignalMeta">{signal.role}</div>
          </article>
        ))}
      </div>
    </section>
  )
}
