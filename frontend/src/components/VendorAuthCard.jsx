import './VendorAuth.css'

export function VendorAuthCard({ title, subtitle, children, footer, badgeText = 'Vendor Access' }) {
  return (
    <div className="vendorAuthLayout revealUp" style={{ '--reveal-delay': '0ms' }}>
      <section className="card vendorAuthCard">
        <div className="vendorAuthBadge">{badgeText}</div>
        <h1 className="vendorAuthTitle">{title}</h1>
        {subtitle ? <p className="vendorAuthSubtitle">{subtitle}</p> : null}
        <div className="vendorAuthBody">{children}</div>
        {footer ? <div className="vendorAuthFooter">{footer}</div> : null}
      </section>
    </div>
  )
}
