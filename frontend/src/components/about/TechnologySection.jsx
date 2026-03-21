import { AboutIcon } from './AboutIcon'

const TECHNOLOGY = [
  {
    icon: 'brain',
    title: 'AI Behavior Analysis',
    description: 'Typing rhythm, edits, and input patterns help detect unnatural feedback behavior.',
  },
  {
    icon: 'score',
    title: 'Signal-Based Scoring Engine',
    description: 'Rule-based trust scoring combines token, payment, context, and risk signals.',
  },
  {
    icon: 'vector',
    title: 'Vector Similarity Detection',
    description: 'Embedding similarity identifies near-duplicate feedback even with changed wording.',
  },
  {
    icon: 'chain',
    title: 'Blockchain Anchoring',
    description: 'Metadata hashes create tamper-evident proofs without storing review text on-chain.',
  },
]

export function TechnologySection() {
  return (
    <section className="abSection revealUp" style={{ '--reveal-delay': '370ms' }}>
      <div className="abSectionInner">
        <header className="abSectionHead">
          <h2>Technology Behind Trusty</h2>
          <p>A practical trust stack designed for modern SaaS operations and transparent governance.</p>
        </header>

        <div className="abGrid abGrid--tech" role="list" aria-label="Trusty technology cards">
          {TECHNOLOGY.map((item) => (
            <article className="abCard abCard--tech" key={item.title} role="listitem">
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
