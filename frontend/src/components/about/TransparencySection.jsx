export function TransparencySection() {
  return (
    <section className="abSection revealUp" style={{ '--reveal-delay': '420ms' }}>
      <div className="abSectionInner">
        <header className="abSectionHead">
          <h2>Our Transparency Promise</h2>
        </header>

        <div className="abPromiseGrid" role="list" aria-label="Transparency promises">
          <article className="abPromiseCard" role="listitem">
            <strong>Every trust score is explainable</strong>
          </article>
          <article className="abPromiseCard" role="listitem">
            <strong>Every signal is visible</strong>
          </article>
          <article className="abPromiseCard" role="listitem">
            <strong>Every decision can be inspected</strong>
          </article>
        </div>
      </div>
    </section>
  )
}
