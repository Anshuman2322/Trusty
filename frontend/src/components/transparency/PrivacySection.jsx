import { TransparencyIcon } from './TransparencyIcon'

const NEVER_STORED = [
  'Raw IP addresses',
  'GPS location',
  'Personal identity',
]

const STORED = [
  'Hashed IP',
  'Hashed device identifiers',
  'Coarse location (city/state/country)',
]

export function PrivacySection() {
  return (
    <section className="tpSection revealUp" style={{ '--reveal-delay': '270ms' }}>
      <div className="tpSectionHead">
        <div className="tpHeadIcon" aria-hidden="true">
          <TransparencyIcon name="privacy" />
        </div>
        <div>
          <h2>Privacy-First Architecture</h2>
          <p>
            Trusty is designed for strong abuse detection without collecting high-risk personal data.
          </p>
        </div>
      </div>

      <div className="tpSplitGrid">
        <article className="tpSubCard tpSubCard--danger">
          <h3>Data Never Stored</h3>
          <ul className="tpList">
            {NEVER_STORED.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </article>

        <article className="tpSubCard tpSubCard--safe">
          <h3>Data Stored</h3>
          <ul className="tpList">
            {STORED.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </article>
      </div>
    </section>
  )
}
