function formatMoney(value) {
  const num = Number(value || 0)
  if (!Number.isFinite(num)) return '$0'
  if (Math.abs(num) >= 1000) return `$${(num / 1000).toFixed(1)}k`
  return `$${num.toFixed(0)}`
}

export function StageColumn({ stage, records, value = 0, children }) {
  return (
    <section className="crmStageWrap">
      <header className="crmStageMetaRow">
        <div className="crmStageMetaLeft">
          <h3 className="crmStageTitlePill">{stage.label}</h3>
          <span className="crmStageCountBubble">{records.length}</span>
        </div>
        <p className="crmStageValueOutside">{formatMoney(value)}</p>
      </header>

      <div className="crmStageCol">
        <div className="crmStageBody">{children}</div>
      </div>
    </section>
  )
}
