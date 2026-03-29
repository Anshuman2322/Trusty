import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'

function getTrustBand(score) {
  const value = Number(score || 0)
  if (value >= 71) return { label: 'High Trust', tone: 'high' }
  if (value >= 40) return { label: 'Medium Trust', tone: 'medium' }
  return { label: 'Low Trust', tone: 'low' }
}

function getBreakdownObject(feedback) {
  if (!feedback?.trustBreakdown || Array.isArray(feedback.trustBreakdown)) return null
  return feedback.trustBreakdown
}

function getBreakdownRows(feedback) {
  const breakdown = getBreakdownObject(feedback)
  if (breakdown) {
    return [
      { label: 'Token Verification', value: breakdown.tokenVerification },
      { label: 'Payment Proof', value: breakdown.paymentProof },
      { label: 'AI Behavior', value: breakdown.aiBehavior },
      { label: 'Device Activity', value: breakdown.devicePattern },
      { label: 'Network Check', value: breakdown.ipPattern },
      { label: 'Review Quality', value: breakdown.contextDepth },
    ]
      .filter((row) => row.value)
      .map((row) => ({
        label: row.label,
        score: Number(row.value.score || 0),
        maxScore: Number(row.value.maxScore || 0),
        metric: `${row.value.score}/${row.value.maxScore}`,
        reason: row.value.explanation,
      }))
  }

  const legacy = Array.isArray(feedback?.trustBreakdownList)
    ? feedback.trustBreakdownList
    : Array.isArray(feedback?.breakdown)
      ? feedback.breakdown
      : Array.isArray(feedback?.trustBreakdown)
        ? feedback.trustBreakdown
        : []

  return legacy.map((row) => ({
    label: row.signal,
    score: Number(row.points || 0),
    maxScore: Number(row.maxPoints || 0),
    metric: `${row.points}/${row.maxPoints}`,
    reason: row.reason,
  }))
}

function formatSigned(value) {
  const numeric = Number(value || 0)
  if (numeric > 0) return `+${numeric}`
  return String(numeric)
}

function getAdjustmentRows(feedback) {
  const rows = []
  const breakdown = getBreakdownObject(feedback)
  const ipScore = breakdown?.ipPattern?.score

  if (typeof ipScore === 'number') {
    rows.push({
      label: 'IP adjustment',
      metric: formatSigned(ipScore - 6),
      reason: 'No unusual network activity detected unless this value moves away from neutral.',
    })
  }

  if (typeof feedback?.dupAdj === 'number') {
    rows.push({
      label: 'Duplicate adjustment',
      metric: formatSigned(feedback.dupAdj),
      reason:
        feedback?.dupReason ||
        (feedback.dupAdj < 0
          ? 'A duplicate or near-duplicate pattern lowered the score.'
          : 'No duplicate penalty was applied.'),
    })
  }

  if (typeof feedback?.typingAdj === 'number') {
    rows.push({
      label: 'Typing adjustment',
      metric: formatSigned(feedback.typingAdj),
      reason:
        feedback?.typingReason ||
        (feedback.typingAdj < 0
          ? 'Typing behavior looked less natural, so the score was reduced.'
          : feedback.typingAdj > 0
            ? 'Typing behavior looked natural, so the score received a small bonus.'
            : 'Typing behavior did not change the score.'),
    })
  }

  return rows
}

function getVerificationReason(feedback) {
  if (feedback?.codeValid) {
    return {
      label: 'Verified review',
      reason: 'A valid vendor-issued feedback code matched this review to an order.',
    }
  }

  if (feedback?.codeProvided) {
    return {
      label: 'Anonymous review',
      reason: 'A code was entered, but it did not verify, so this review stayed anonymous.',
    }
  }

  return {
    label: 'Anonymous review',
    reason: 'No order code was attached, so this review stayed anonymous.',
  }
}

function getTagReason(tag, feedback) {
  const breakdown = getBreakdownObject(feedback)

  switch (tag) {
    case 'Verified':
      return feedback?.codeValid
        ? 'The feedback code was valid and matched an order from the vendor.'
        : breakdown?.tokenVerification?.explanation || 'The verification signal contributed to the score.'
    case 'Payment Verified':
      return breakdown?.paymentProof?.explanation || 'Payment was linked to this review.'
    case 'AI Verified':
      return breakdown?.aiBehavior?.explanation || 'Typing and text behavior looked human-like.'
    case 'Blockchain Anchored':
      return 'Review proof hash was anchored for tamper-evident records.'
    default:
      return 'This tag was assigned automatically by the trust engine.'
  }
}

function deriveSimpleBullets({ verification, breakdownRows }) {
  const rowsByLabel = Object.fromEntries(breakdownRows.map((row) => [row.label, row]))
  const aiBehavior = rowsByLabel['AI Behavior']
  const devicePattern = rowsByLabel['Device Activity']
  const reviewQuality = rowsByLabel['Review Quality']
  const networkCheck = rowsByLabel['Network Check']

  const bullets = []

  bullets.push(
    verification.label === 'Verified review'
      ? 'Order verification matched a valid vendor feedback code.'
      : 'No order verification (anonymous review).'
  )

  if (aiBehavior) {
    bullets.push(
      aiBehavior.score >= Math.max(1, Math.round(aiBehavior.maxScore * 0.75))
        ? 'Feedback appears human-written.'
        : 'Writing pattern has mixed trust signals.'
    )
  }

  if (devicePattern) {
    bullets.push(
      devicePattern.score >= devicePattern.maxScore
        ? 'First-time or low-risk device pattern detected.'
        : 'Device history indicates repeated usage patterns.'
    )
  }

  if (reviewQuality) {
    bullets.push(
      reviewQuality.score >= Math.max(1, Math.round(reviewQuality.maxScore * 0.6))
        ? 'Review includes useful context and details.'
        : 'Review is too short and lacks useful detail.'
    )
  }

  if (networkCheck && networkCheck.score >= Math.max(1, Math.round(networkCheck.maxScore * 0.5))) {
    bullets.push('No unusual network activity detected.')
  }

  return bullets.slice(0, 4)
}

function getConclusion({ verification, score }) {
  if (verification.label === 'Verified review' && score >= 71) {
    return 'This review looks genuine and well verified with strong supporting signals.'
  }

  if (verification.label === 'Verified review') {
    return 'This review appears genuine, but some trust signals are still moderate.'
  }

  return 'This review looks genuine but lacks strong verification signals.'
}

function getRatingTrustInsight({ rating, trustBand, verification }) {
  const trustText = trustBand.label.toLowerCase()
  const isVerified = verification.label === 'Verified review'

  if (rating >= 4) {
    return `This review has a high rating but ${trustText} due to ${isVerified ? 'mixed trust signals' : 'missing verification signals'}.`
  }

  if (rating <= 2.5) {
    return `This review has a low rating and ${trustText} due to ${isVerified ? 'weak supporting signals' : 'missing verification signals'}.`
  }

  return `This review has a moderate rating and ${trustText} based on available trust signals.`
}

function simplifySignalReason(label, reason) {
  const raw = String(reason || '').trim()
  if (!raw) return 'No additional detail available.'

  if (label === 'Network Check') {
    if (/client ip unavailable|neutral/i.test(raw)) return 'No unusual network activity detected.'
    if (/vpn|proxy|tor|hosting|datacenter/i.test(raw)) return 'Network pattern suggests potential masking or shared infrastructure.'
  }

  if (label === 'Review Quality') {
    if (/very short|generic/i.test(raw)) return 'Review is too short and lacks useful detail.'
    if (/moderate detail|some detail/i.test(raw)) return 'Review has some detail, but it could be stronger.'
  }

  if (label === 'Device Activity' && /first feedback/i.test(raw)) {
    return 'First-time device activity appears normal.'
  }

  return raw
}

function getBarTone(score, maxScore) {
  const ratio = maxScore > 0 ? score / maxScore : 0
  if (ratio >= 0.75) return 'good'
  if (ratio >= 0.4) return 'warn'
  return 'risk'
}

function normalizeBadges(feedback) {
  const baseTags = Array.isArray(feedback?.tags) ? feedback.tags : []
  const normalized = baseTags.map((tag) => {
    if (tag === 'Blockchain Anchored') return 'Blockchain Verified'
    return tag
  })

  if (feedback?.codeValid) return normalized
  return ['Anonymous Review', ...normalized.filter((tag) => tag !== 'Verified')]
}

function BadgeExplanation({ badges, feedback }) {
  return (
    <section className="explainSectionCard">
      <div className="explainSectionHeading">Why these badges?</div>
      <div className="explainBadgeList">
        {badges.map((tag) => (
          <div key={tag} className="explainBadgeItem">
            <div className="pill">{tag}</div>
            <div className="muted">
              {tag === 'Anonymous Review'
                ? 'No order or identity linked.'
                : getTagReason(tag === 'Blockchain Verified' ? 'Blockchain Anchored' : tag, feedback)}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

function ScoreBreakdown({ rows }) {
  return (
    <section className="explainSectionCard">
      <div className="explainSectionHeading">📊 Score Breakdown</div>
      <div className="explainBars">
        {rows.map((row) => {
          const pct = row.maxScore > 0 ? Math.max(0, Math.min(100, (row.score / row.maxScore) * 100)) : 0
          const tone = getBarTone(row.score, row.maxScore)
          return (
            <div key={row.label} className="explainBarRow">
              <div className="explainBarTop">
                <span>{row.label}</span>
                <span>{row.metric}</span>
              </div>
              <div className="explainBarTrack">
                <div className={`explainBarFill explainBarFill--${tone}`} style={{ width: `${pct}%` }} />
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}

function SimpleExplanationSection({ bullets, conclusion, rating, trustBand, score, insightText }) {
  return (
    <section className="explainSectionCard">
      <div className="explainSectionHeading">✔ Why This Score?</div>
      <ul className="explainBulletList">
        {bullets.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
      <div className="explainConclusion">{conclusion}</div>

      <div className="explainInsightCard">
        <div className="explainSectionHeading">⚠ Rating vs Trust Insight</div>
        <div className="explainInsightGrid">
          <div>Rating: {rating.toFixed(1)} / 5</div>
          <div>Trust: {trustBand.label.replace(' Trust', '')} ({score})</div>
        </div>
        <div className="muted">{insightText}</div>
      </div>
    </section>
  )
}

function ExpandableDetails({ feedback, breakdownRows, expanded, onToggle, methodologyExpanded, onMethodologyToggle }) {
  const breakdown = getBreakdownObject(feedback)

  return (
    <section className="explainSectionCard">
      <button type="button" className="explainExpandBtn" onClick={onToggle}>
        {expanded ? 'Hide System Details (Advanced)' : 'View System Details (Advanced)'}
      </button>

      {expanded ? (
        <div className="explainDetailBlock">
          <div className="explainSectionTitle">Signal logic</div>
          <div className="list">
            {breakdownRows.map((row) => (
              <div key={row.label} className="explainItem">
                <div className="k">{row.label}</div>
                <div className="muted">{simplifySignalReason(row.label, row.reason)}</div>
              </div>
            ))}
          </div>

          <div className="explainSectionTitle">System details (advanced)</div>
          <div className="list">
            <div className="explainItem">
              <div className="k">Token logic</div>
              <div className="muted">{breakdown?.tokenVerification?.explanation || 'Token verification not available.'}</div>
            </div>
            <div className="explainItem">
              <div className="k">IP logic</div>
              <div className="muted">{breakdown?.ipPattern?.explanation || 'IP risk signal not available.'}</div>
            </div>
            <div className="explainItem">
              <div className="k">Blockchain logic</div>
              <div className="muted">Blockchain anchoring stores a metadata hash + tx reference (no review text on-chain).</div>
            </div>
            <div className="explainItem">
              <div className="k">Duplicate detection</div>
              <div className="muted">{feedback?.dupReason || 'No duplicate-related adjustment was applied.'}</div>
            </div>
          </div>

          <button type="button" className="explainMethodBtn" onClick={onMethodologyToggle}>
            {methodologyExpanded ? 'Hide System Methodology' : 'View System Methodology'}
          </button>
          {methodologyExpanded && feedback?.explanation ? (
            <div className="muted explainFootnote">{feedback.explanation}</div>
          ) : null}
        </div>
      ) : null}
    </section>
  )
}

function TrustExplanationModal({ feedback, onClose }) {
  const [expanded, setExpanded] = useState(false)
  const [methodologyExpanded, setMethodologyExpanded] = useState(false)

  const score = Number(feedback?.finalTrustScore ?? feedback?.trustScore ?? 0)
  const rating = Number(feedback?.rating ?? Math.max(1, Math.min(5, Math.round((score / 20) * 2) / 2)))
  const trustBand = getTrustBand(score)
  const breakdownRows = getBreakdownRows(feedback)
  const verification = getVerificationReason(feedback)
  const badges = normalizeBadges(feedback)

  const simpleBullets = useMemo(
    () => deriveSimpleBullets({ verification, breakdownRows }),
    [verification, breakdownRows]
  )
  const conclusion = getConclusion({ verification, score })
  const insightText = getRatingTrustInsight({ rating, trustBand, verification })

  return (
    <div className="explainModalBackdrop" onClick={onClose}>
      <div
        className="explainModal"
        role="dialog"
        aria-modal="true"
        aria-label="Trust score explanation"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="explainModalHead">
          <div className="explainHeaderMeta">
            <h3>Trust Score: {score}</h3>
            <span className={`explainBandPill explainBandPill--${trustBand.tone}`}>{trustBand.label}</span>
            <span className="explainHeaderRating">Rating: {rating.toFixed(1)} / 5</span>
          </div>
          <button
            type="button"
            className="explainModalClose"
            onClick={onClose}
            aria-label="Close explanation"
          >
            x
          </button>
        </header>

        <div className="explainPanel">
          <SimpleExplanationSection
            bullets={simpleBullets}
            conclusion={conclusion}
            rating={rating}
            trustBand={trustBand}
            score={score}
            insightText={insightText}
          />

          <ScoreBreakdown rows={breakdownRows} />

          <BadgeExplanation badges={badges} feedback={feedback} />

          <section className="explainSectionCard">
            <div className="explainSectionHeading">⚠ Adjustments</div>
            <div className="explainAdjustments">
              <div>Typing bonus: {formatSigned(feedback?.typingAdj || 0)}</div>
              <div>Duplicate penalty: {formatSigned(feedback?.dupAdj || 0)}</div>
              <div>IP adjustment: {formatSigned((getBreakdownObject(feedback)?.ipPattern?.score || 6) - 6)}</div>
            </div>
          </section>

          <ExpandableDetails
            feedback={feedback}
            breakdownRows={breakdownRows}
            expanded={expanded}
            onToggle={() => setExpanded((prev) => !prev)}
            methodologyExpanded={methodologyExpanded}
            onMethodologyToggle={() => setMethodologyExpanded((prev) => !prev)}
          />
        </div>
      </div>
    </div>
  )
}

export function FeedbackExplanation({ feedback, buttonLabel = 'Explanation', buttonClassName = '' }) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return undefined

    const onKeyDown = (event) => {
      if (event.key === 'Escape') setOpen(false)
    }

    const scrollY = window.scrollY || window.pageYOffset || 0
    const previousOverflow = document.body.style.overflow
    const previousPosition = document.body.style.position
    const previousTop = document.body.style.top
    const previousLeft = document.body.style.left
    const previousRight = document.body.style.right
    const previousWidth = document.body.style.width

    document.body.style.overflow = 'hidden'
    document.body.style.position = 'fixed'
    document.body.style.top = `-${scrollY}px`
    document.body.style.left = '0'
    document.body.style.right = '0'
    document.body.style.width = '100%'
    window.addEventListener('keydown', onKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      document.body.style.position = previousPosition
      document.body.style.top = previousTop
      document.body.style.left = previousLeft
      document.body.style.right = previousRight
      document.body.style.width = previousWidth
      window.removeEventListener('keydown', onKeyDown)
      window.scrollTo(0, scrollY)
    }
  }, [open])

  const modalContent = <TrustExplanationModal feedback={feedback} onClose={() => setOpen(false)} />

  return (
    <>
      <button
        type="button"
        className={buttonClassName ? `explainSummary ${buttonClassName}` : 'explainSummary'}
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <span>{buttonLabel}</span>
        <span className="explainSummaryIcon" aria-hidden="true">&gt;</span>
      </button>

      {open ? createPortal(modalContent, document.body) : null}
    </>
  )
}