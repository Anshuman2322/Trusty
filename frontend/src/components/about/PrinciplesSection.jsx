import { AboutIcon } from './AboutIcon'

const PRINCIPLES = [
  {
    icon: 'verify',
    title: 'Proof Over Identity',
    description: 'Trust is based on verifiable signals, not personal identity.',
  },
  {
    icon: 'eye',
    title: 'Transparency Over Censorship',
    description: 'Reviews are not deleted; credibility is measured.',
  },
  {
    icon: 'lock',
    title: 'Privacy-First Design',
    description: 'No personal tracking. Only hashed and safe signals are used.',
  },
  {
    icon: 'chain',
    title: 'Immutable Trust Records',
    description: 'Feedback integrity is protected using tamper-evident proofs.',
  },
]

export function PrinciplesSection() {
  return (
    <section className="abSection revealUp" style={{ '--reveal-delay': '170ms' }}>
      <div className="abSectionInner">
        <header className="abSectionHead">
          <h2>Our Core Principles</h2>
          <p>These principles shape every scoring rule, product decision, and transparency policy inside Trusty.</p>
        </header>

        <div className="abGrid abGrid--four" role="list" aria-label="Trusty principles">
          {PRINCIPLES.map((item) => (
            <article className="abCard abCard--principle" key={item.title} role="listitem">
              <div className="abCardIcon" aria-hidden="true">
                <AboutIcon name={item.icon} />
              </div>
              <h3>{item.title}</h3>
              <p>{item.description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
