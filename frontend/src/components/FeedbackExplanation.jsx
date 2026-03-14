function getTrustBand(score) {
  const value = Number(score || 0)
  if (value >= 71) return 'High'
  if (value >= 40) return 'Medium'
  return 'Low'
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
      { label: 'Device Pattern', value: breakdown.devicePattern },
      { label: 'IP Pattern Check', value: breakdown.ipPattern },
      { label: 'Context Depth', value: breakdown.contextDepth },
    ]
      .filter((row) => row.value)
      .map((row) => ({
        label: row.label,
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
      reason: 'The IP check uses 6/10 as neutral, so only unusual patterns move the score up or down.',
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
      return breakdown?.paymentProof?.explanation || 'A linked paid order strengthened this review.'
    case 'AI Verified':
      return breakdown?.aiBehavior?.explanation || 'Typing and text behavior looked human-like.'
    case 'Blockchain Anchored':
      return 'A metadata hash and blockchain-style reference were generated for audit proof.'
    default:
      return 'This tag was assigned automatically by the trust engine.'
  }
}

export function FeedbackExplanation({ feedback, buttonLabel = 'Explanation' }) {
  const score = Number(feedback?.finalTrustScore ?? feedback?.trustScore ?? 0)
  const trustBand = getTrustBand(score)
  const breakdownRows = getBreakdownRows(feedback)
  const adjustmentRows = getAdjustmentRows(feedback)
  const tags = Array.isArray(feedback?.tags) ? feedback.tags.filter((tag) => tag !== 'Verified') : []
  const verification = getVerificationReason(feedback)

  return (
    <details className="explainDetails">
      <summary className="explainSummary">{buttonLabel}</summary>
      <div className="explainPanel">
        <div className="explainLead">
          This review scored <b>{score}/100</b> and falls in the <b>{trustBand}</b> trust band.
        </div>

        <div className="explainSectionTitle">Why these badges were shown</div>
        <div className="list">
          <div className="explainItem">
            <div className="pill">{verification.label}</div>
            <div className="muted">{verification.reason}</div>
          </div>
          {tags.map((tag) => (
            <div key={tag} className="explainItem">
              <div className="pill">{tag}</div>
              <div className="muted">{getTagReason(tag, feedback)}</div>
            </div>
          ))}
        </div>

        <div className="explainSectionTitle">How the score was built</div>
        <div className="list">
          {breakdownRows.map((row) => (
            <div key={row.label} className="kv">
              <div>
                <div className="k">{row.label}</div>
                <div className="muted">{row.reason}</div>
              </div>
              <div className="v">{row.metric}</div>
            </div>
          ))}
        </div>

        <div className="explainSectionTitle">Extra adjustments</div>
        <div className="list">
          {adjustmentRows.length === 0 ? <div className="muted">No extra adjustments were applied.</div> : null}
          {adjustmentRows.map((row) => (
            <div key={row.label} className="kv">
              <div>
                <div className="k">{row.label}</div>
                <div className="muted">{row.reason}</div>
              </div>
              <div className="v">{row.metric}</div>
            </div>
          ))}
        </div>

        {feedback?.explanation ? <div className="muted explainFootnote">{feedback.explanation}</div> : null}
      </div>
    </details>
  )
}