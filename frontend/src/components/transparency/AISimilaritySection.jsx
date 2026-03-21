import { TransparencyIcon } from './TransparencyIcon'

const PIPELINE = [
  'Feedback text is converted into vector embeddings.',
  'Vectors are indexed for fast nearest-neighbor search.',
  'Near-duplicate matches can lower trust as a bounded adjustment.',
]

export function AISimilaritySection() {
  return (
    <section className="tpSection revealUp" style={{ '--reveal-delay': '170ms' }}>
      <div className="tpSectionHead">
        <div className="tpHeadIcon" aria-hidden="true">
          <TransparencyIcon name="duplicate" />
        </div>
        <div>
          <h2>Duplicate and Similarity Detection</h2>
          <p>
            Trusty uses embedding-based similarity models to detect near-duplicate feedback even when wording changes.
          </p>
        </div>
      </div>

      <div className="tpSplitGrid">
        <article className="tpSubCard">
          <h3>Model Stack</h3>
          <div className="tpTagRow" role="list" aria-label="AI model stack">
            <span className="tpTag" role="listitem">sentence-transformers</span>
            <span className="tpTag" role="listitem">FAISS similarity search</span>
          </div>
          <p className="tpSubtle">
            Similarity checks detect paraphrased spam patterns while preserving source privacy through hash-linked metadata.
          </p>
        </article>

        <article className="tpSubCard">
          <h3>Detection Flow</h3>
          <ol className="tpOrderedList">
            {PIPELINE.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ol>
        </article>
      </div>
    </section>
  )
}
