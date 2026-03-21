import { Link } from 'react-router-dom'

export function AboutCTA() {
  return (
    <section className="abSection abSection--cta revealUp" style={{ '--reveal-delay': '470ms' }}>
      <div className="abSectionInner">
        <article className="abCtaCard">
          <h2>Start Exploring Transparent Feedback</h2>
          <p>
            Experience the public trust layer and inspect how Trusty turns credibility into visible evidence.
          </p>
          <div className="abHeroActions">
            <Link className="abBtn abBtn--primary" to="/public">
              View Public Feedback
            </Link>
            <Link className="abBtn abBtn--secondary" to="/how-it-works">
              Learn How It Works
            </Link>
          </div>
        </article>
      </div>
    </section>
  )
}
