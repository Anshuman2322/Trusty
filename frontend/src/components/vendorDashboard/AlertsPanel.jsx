export function AlertsPanel({ alerts = [] }) {
  return (
    <section className="vdSection">
      <div className="vdSectionHead">
        <h2>Alerts and Risk Signals</h2>
        <p>Operational warnings based on suspicious behavior and network patterns.</p>
      </div>

      <div className="vdAlertGrid" role="list" aria-label="Risk alerts">
        {alerts.map((alert) => (
          <article className={`vdAlertCard vdAlertCard--${alert.severity}`} key={alert.key} role="listitem">
            <div className="vdAlertIcon" aria-hidden="true">!</div>
            <p>{alert.message}</p>
          </article>
        ))}
      </div>
    </section>
  )
}
