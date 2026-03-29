import { SectionCard } from '../../components/admin/AdminUi'

export function RiskAlertsPage({ isDark, alerts = [], onFlagVendor }) {
  return (
    <SectionCard title="Risk Alerts" subtitle="Repeated devices, network anomalies, duplicate clusters, and suspicious behavior patterns.">
      <div className="tw-space-y-4">
        {alerts.map((alert) => (
          <div
            key={alert.id}
            className={[
              'tw-rounded-2xl tw-border tw-p-4 tw-shadow-md tw-transition hover:tw--translate-y-0.5 hover:tw-shadow-lg',
              isDark
                ? alert.severity === 'HIGH'
                  ? 'tw-border-rose-900/50 tw-bg-rose-950/25'
                  : alert.severity === 'MEDIUM'
                    ? 'tw-border-amber-900/50 tw-bg-amber-950/25'
                    : 'tw-border-emerald-900/45 tw-bg-emerald-950/20'
                : alert.severity === 'HIGH'
                  ? 'tw-border-rose-200 tw-bg-white'
                  : alert.severity === 'MEDIUM'
                    ? 'tw-border-amber-200 tw-bg-white'
                    : 'tw-border-[#E2E8F0] tw-bg-white',
            ].join(' ')}
          >
            <div className="tw-flex tw-flex-wrap tw-items-center tw-justify-between tw-gap-2">
              <div className="tw-flex tw-items-center tw-gap-2">
                <span className={['tw-rounded-full tw-px-2 tw-py-1 tw-text-xs tw-font-semibold', isDark ? 'tw-bg-slate-800 tw-text-slate-300' : 'tw-bg-slate-100 tw-text-[#64748B]'].join(' ')}>
                  {alert.severity === 'HIGH' ? '🔴' : '⚠'} {alert.type}
                </span>
                <span className={[
                  'tw-rounded-full tw-px-2 tw-py-1 tw-text-xs tw-font-semibold',
                  isDark
                    ? alert.severity === 'HIGH'
                      ? 'tw-bg-rose-900/40 tw-text-rose-200 tw-ring-1 tw-ring-rose-700/50'
                      : alert.severity === 'MEDIUM'
                        ? 'tw-bg-amber-900/40 tw-text-amber-200 tw-ring-1 tw-ring-amber-700/50'
                        : 'tw-bg-emerald-900/35 tw-text-emerald-200 tw-ring-1 tw-ring-emerald-700/50'
                    : alert.severity === 'HIGH'
                      ? 'tw-bg-rose-50 tw-text-[#EF4444] tw-ring-1 tw-ring-rose-200'
                      : alert.severity === 'MEDIUM'
                        ? 'tw-bg-amber-50 tw-text-[#F59E0B] tw-ring-1 tw-ring-amber-200'
                        : 'tw-bg-emerald-50 tw-text-[#22C55E] tw-ring-1 tw-ring-emerald-200',
                ].join(' ')}>
                  {alert.severity}
                </span>
              </div>
              {alert.evidence?.vendorId ? (
                <button
                  type="button"
                  className="tw-rounded-lg tw-bg-[#F59E0B] tw-px-3 tw-py-1.5 tw-text-xs tw-font-semibold tw-text-white tw-shadow-sm hover:tw-bg-amber-600"
                  onClick={() => onFlagVendor(alert.evidence.vendorId)}
                >
                  Flag Vendor
                </button>
              ) : null}
            </div>

            <p className={['tw-mt-3 tw-text-sm tw-font-medium', isDark ? 'tw-text-slate-100' : 'tw-text-[#0F172A]'].join(' ')}>{alert.description}</p>
            <div className={['tw-mt-2 tw-text-xs tw-font-medium', isDark ? 'tw-text-slate-400' : 'tw-text-[#64748B]'].join(' ')}>Related vendor: {alert.relatedVendor || 'Unknown'}</div>
          </div>
        ))}
      </div>
    </SectionCard>
  )
}
