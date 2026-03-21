import { AboutIcon } from './AboutIcon'

const PROBLEMS = [
  {
    icon: 'bot',
    title: 'Fake reviews and bots',
    description: 'Automated and coordinated manipulation distorts ratings and user decisions.',
  },
  {
    icon: 'verify',
    title: 'Anonymous feedback lacks credibility',
    description: 'Without verification signals, users cannot distinguish authentic experience from noise.',
  },
  {
    icon: 'hidden',
    title: 'Hidden moderation reduces transparency',
    description: 'Opaque review controls make platforms hard to audit and hard to trust.',
  },
  {
    icon: 'eye',
    title: 'No authenticity verification',
    description: 'Most systems show review text but not the measurable evidence behind credibility.',
  },
]

export function ProblemSection() {
  return (
    <section className="abSection revealUp" style={{ '--reveal-delay': '70ms' }}>
      <div className="abSectionInner">
        <header className="abSectionHead">
          <h2>The Problem with Online Reviews</h2>
          <p>Modern review ecosystems reward volume over verifiability, creating trust gaps at scale.</p>
        </header>

        <div className="abGrid abGrid--four" role="list" aria-label="Online review problems">
          {PROBLEMS.map((item) => (
            <article className="abCard abCard--problem" key={item.title} role="listitem">
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
