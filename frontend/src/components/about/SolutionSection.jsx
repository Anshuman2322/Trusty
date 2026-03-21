import { AboutIcon } from './AboutIcon'

const SOLUTIONS = [
  {
    icon: 'score',
    title: 'Multi-signal trust scoring',
    description: 'Each feedback is evaluated across independent credibility signals, not a single heuristic.',
  },
  {
    icon: 'verify',
    title: 'Explainable decision system',
    description: 'Scores include human-readable breakdowns so reviewers and vendors can inspect outcomes.',
  },
  {
    icon: 'lock',
    title: 'Privacy-first architecture',
    description: 'Trusty prioritizes hashed and coarse metadata over personal identity collection.',
  },
  {
    icon: 'chain',
    title: 'Tamper-evident verification',
    description: 'Metadata hashes and timestamps provide integrity proof without exposing review content.',
  },
]

export function SolutionSection() {
  return (
    <section className="abSection revealUp" style={{ '--reveal-delay': '120ms' }}>
      <div className="abSectionInner">
        <header className="abSectionHead">
          <h2>How Trusty Solves This</h2>
          <p>A measurable, explainable, and privacy-safe trust layer designed for real production platforms.</p>
        </header>

        <div className="abGrid abGrid--solution" role="list" aria-label="Trusty solutions">
          {SOLUTIONS.map((item) => (
            <article className="abCard abCard--solution" key={item.title} role="listitem">
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
