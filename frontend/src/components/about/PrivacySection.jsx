const NEVER_STORE = [
  'Raw IP addresses',
  'GPS location',
  'Personal identity',
]

const USE_SIGNALS = [
  'Hashed IP',
  'Hashed device signals',
  'Coarse location',
]

export function PrivacySection() {
  return (
    <section className="abSection revealUp" style={{ '--reveal-delay': '320ms' }}>
      <div className="abSectionInner">
        <header className="abSectionHead">
          <h2>Privacy by Design</h2>
          <p>Trusty maximizes anti-abuse visibility while minimizing sensitive data collection.</p>
        </header>

        <div className="abPrivacyGrid">
          <article className="abPrivacyCard abPrivacyCard--avoid">
            <h3>What We Never Store</h3>
            <ul>
              {NEVER_STORE.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>

          <article className="abPrivacyCard abPrivacyCard--use">
            <h3>What We Use</h3>
            <ul>
              {USE_SIGNALS.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>
        </div>
      </div>
    </section>
  )
}
