import { TransparencyIcon } from './TransparencyIcon'

const SCORE_LEVELS = [
  {
    title: 'Low Trust',
    range: '0-39',
    note: 'Limited verification signals or repeated risk indicators.',
    tone: 'low',
  },
  {
    title: 'Medium Trust',
    range: '40-69',
    note: 'Mixed signals with partial verification and moderate confidence.',
    tone: 'medium',
  },
  {
    title: 'High Trust',
    range: '70-100',
    note: 'Strong independent signal alignment and low risk patterns.',
    tone: 'high',
  },
]

export function TrustScoreOverview() {
  return (
    <section className="tpSection revealUp" style={{ '--reveal-delay': '70ms' }}>
      <div className="tpSectionHead">
        <div className="tpHeadIcon" aria-hidden="true">
          <TransparencyIcon name="gauge" />
        </div>
        <div>
          <h2>How Trust Scores Work</h2>
          <p>
            Trust scores range from 0 to 100.
            Scores are calculated using multiple independent signals and provide a measure of credibility, not absolute truth.
          </p>
        </div>
      </div>

      <div className="tpScoreRangeGrid" role="list" aria-label="Trust score ranges">
        {SCORE_LEVELS.map((level) => (
          <article className={`tpScoreRangeCard tpScoreRangeCard--${level.tone}`} key={level.title} role="listitem">
            <div className="tpScoreRangePill">{level.range}</div>
            <h3>{level.title}</h3>
            <p>{level.note}</p>
          </article>
        ))}
      </div>

      <div className="tpScaleBar" aria-hidden="true">
        <div className="tpScaleSegment tpScaleSegment--low" style={{ width: '39%' }} />
        <div className="tpScaleSegment tpScaleSegment--medium" style={{ width: '31%' }} />
        <div className="tpScaleSegment tpScaleSegment--high" style={{ width: '30%' }} />
      </div>

      <div className="tpScaleLegend">
        <span>0</span>
        <span>39</span>
        <span>69</span>
        <span>100</span>
      </div>
    </section>
  )
}
