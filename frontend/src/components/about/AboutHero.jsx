import { Link } from 'react-router-dom'
import { AboutIcon } from './AboutIcon'

const HERO_POINTS = [
  'Explainable trust signals',
  'No personal identity tracking',
  'Tamper-evident integrity proofs',
]

export function AboutHero() {
  return (
    <section className="abSection abSection--hero revealUp" style={{ '--reveal-delay': '0ms' }}>
      <div className="abSectionInner abHero">
        <div className="abHeroLeft">
          <div className="abEyebrow">
            <span className="abEyebrowIcon" aria-hidden="true">
              <AboutIcon name="shield" />
            </span>
            About Trusty
          </div>

          <h1>Building Trust in Reviews Without Exposing Identity</h1>
          <p>
            Trusty is a privacy-first feedback verification platform that replaces blind trust with
            transparent, explainable trust signals.
          </p>

          <div className="abHeroActions">
            <Link className="abBtn abBtn--primary" to="/public">
              Explore Reviews
            </Link>
            <Link className="abBtn abBtn--secondary" to="/transparency">
              View Transparency
            </Link>
          </div>

          <div className="abHeroTags" role="list" aria-label="Trusty highlights">
            {HERO_POINTS.map((item) => (
              <span className="abTag" key={item} role="listitem">
                {item}
              </span>
            ))}
          </div>
        </div>

        <div className="abHeroRight" aria-label="Trust system visual">
          <article className="abHeroCard">
            <div className="abHeroCardTop">
              <h3>Live Trust Snapshot</h3>
              <span className="abBadge">System Generated</span>
            </div>

            <div className="abMiniFlow" aria-hidden="true">
              <span>Token</span>
              <span className="abMiniArrow">-&gt;</span>
              <span>Behavior</span>
              <span className="abMiniArrow">-&gt;</span>
              <span>Trust</span>
            </div>

            <div className="abHeroMeter" aria-hidden="true">
              <div className="abHeroMeterTrack">
                <div className="abHeroMeterFill" style={{ width: '84%' }} />
              </div>
              <div className="abHeroMeterMeta">
                <span>Transparency Confidence</span>
                <strong>84/100</strong>
              </div>
            </div>

            <div className="abHeroSignals">
              <div>
                <span>Signals</span>
                <strong>6 independent checks</strong>
              </div>
              <div>
                <span>Privacy Mode</span>
                <strong>Hash-only identifiers</strong>
              </div>
              <div>
                <span>Integrity</span>
                <strong>SHA-256 anchored</strong>
              </div>
            </div>
          </article>
        </div>
      </div>
    </section>
  )
}
