function toneClass(value, type) {
  const normalized = String(value || '').toLowerCase()

  if (type === 'sentiment') {
    if (normalized === 'positive') return 'vdTone vdTone--good'
    if (normalized === 'neutral') return 'vdTone vdTone--warn'
    return 'vdTone vdTone--danger'
  }

  if (type === 'probability') {
    if (normalized === 'high') return 'vdTone vdTone--good'
    if (normalized === 'medium') return 'vdTone vdTone--warn'
    return 'vdTone vdTone--danger'
  }

  if (type === 'quality') {
    if (normalized === 'detailed') return 'vdTone vdTone--good'
    return 'vdTone vdTone--neutral'
  }

  return 'vdTone'
}

export function CustomerInsights({ customers = [] }) {
  return (
    <section className="vdSection">
      <div className="vdSectionHead">
        <h2>Customer Insights</h2>
        <p>Understand customer behavior, sentiment, and quality of incoming feedback.</p>
      </div>

      <div className="vdTableWrap vdTableWrap--stack">
        <table className="vdTable vdTable--stack">
          <thead>
            <tr>
              <th>Customer</th>
              <th>Sentiment</th>
              <th>Next Purchase Probability</th>
              <th>Feedback Quality</th>
              <th>Orders</th>
              <th>Avg Trust</th>
            </tr>
          </thead>
          <tbody>
            {customers.length === 0 ? (
              <tr>
                <td colSpan={6}>
                  <div className="vdTableEmpty">No customer insight data yet.</div>
                </td>
              </tr>
            ) : null}

            {customers.map((customer) => (
              <tr key={`${customer.email}-${customer.customerName}`}>
                <td data-label="Customer">
                  <strong>{customer.customerName}</strong>
                  <div className="vdCellSub">{customer.email}</div>
                </td>
                <td data-label="Sentiment"><span className={toneClass(customer.sentiment, 'sentiment')}>{customer.sentiment}</span></td>
                <td data-label="Next Purchase"><span className={toneClass(customer.nextPurchaseProbability, 'probability')}>{customer.nextPurchaseProbability}</span></td>
                <td data-label="Feedback Quality"><span className={toneClass(customer.feedbackQuality, 'quality')}>{customer.feedbackQuality}</span></td>
                <td data-label="Orders">{customer.orders}</td>
                <td data-label="Avg Trust">{customer.averageTrust}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
