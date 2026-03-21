import { Link } from 'react-router-dom'
import { TransparencyIcon } from './TransparencyIcon'

const HERO_BADGES = [
  'Explainable scoring logic',
  'Privacy-safe signal collection',
  'Tamper-evident verification',
]

const HERO_METRICS = [
  { label: 'Core trust signals', value: '6' },
  { label: 'Explainable score range', value: '0-100' },
  { label: 'On-chain payload', value: 'Hash + timestamp' },
]

export function DocsHero() {
  return (
    <section className="tpHero revealUp" style={{ '--reveal-delay': '0ms' }}>
      <div className="tpHeroInner">
        <div className="tpHeroMain">
          <div className="tpEyebrow">
            <span className="tpEyebrowIcon" aria-hidden="true">
              <TransparencyIcon name="shield" />
            </span>
            Docs and Transparency
          </div>

          <h1>Transparent Trust Model</h1>
          <p>
            Trusty calculates feedback credibility using multiple independent signals.
            This page explains how trust scores are generated, what data is used, and how user privacy is protected.
          </p>

          <div className="tpHeroBadges" role="list" aria-label="Trust model highlights">
            {HERO_BADGES.map((item) => (
              <div className="tpBadge" key={item} role="listitem">
                <span className="tpBadgeIcon" aria-hidden="true">
                  <TransparencyIcon name="integrity" />
                </span>
                <span>{item}</span>
              </div>
            ))}
          </div>

          <div className="tpHeroActions">
            <Link className="tpBtn tpBtn--primary" to="/how-it-works">
              Explore scoring workflow
            </Link>
            <Link className="tpBtn tpBtn--secondary" to="/public">
              View public feedback
            </Link>
          </div>
        </div>

        <div className="tpHeroStats" role="list" aria-label="Trust model facts">
          {HERO_METRICS.map((metric) => (
            <article className="tpStatCard" key={metric.label} role="listitem">
              <div className="tpStatValue">{metric.value}</div>
              <div className="tpStatLabel">{metric.label}</div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
