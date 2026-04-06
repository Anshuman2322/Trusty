import { AlertTriangle, ArrowRight } from 'lucide-react'
import { SectionCard } from '../../components/admin/AdminUi'

export function RiskAlertsPage({ isDark, alerts = [], onInvestigate }) {
  const displayAlerts = alerts.length ? alerts : getDemoAlerts()

  return (
    <SectionCard title="Risk Alerts" subtitle="Active system alerts for suspicious activity">
      <div className="tw-space-y-4">
        {displayAlerts.map((alert) => (
          <article
            key={alert.id}
            className={[
              'tw-rounded-2xl tw-border tw-p-5',
              isDark ? 'tw-border-slate-700 tw-bg-slate-950' : 'tw-border-[#E5E7EB] tw-bg-white',
            ].join(' ')}
          >
            <div className="tw-grid tw-gap-4 md:tw-grid-cols-[1fr_auto] md:tw-items-center">
              <div className="tw-flex tw-items-start tw-gap-4 tw-min-w-0">
                <div className={[
                  'tw-grid tw-h-12 tw-w-12 tw-shrink-0 tw-place-items-center tw-rounded-2xl',
                  alert.severity === 'HIGH'
                    ? 'tw-bg-[#FDECEC] tw-text-[#E53935]'
                    : alert.severity === 'MEDIUM'
                      ? 'tw-bg-[#FFF5E5] tw-text-[#F59E0B]'
                      : 'tw-bg-[#EEF7FF] tw-text-[#3B82F6]',
                ].join(' ')}>
                  <AlertTriangle size={20} />
                </div>

                <div className="tw-min-w-0">
                  <div className="tw-flex tw-flex-wrap tw-items-center tw-gap-2">
                    <h3 className={[
                      'tw-text-lg md:tw-text-xl tw-leading-tight tw-font-semibold tw-break-words',
                      isDark ? 'tw-text-slate-100' : 'tw-text-[#1E293B]',
                    ].join(' ')}>
                      {formatAlertTitle(alert)}
                    </h3>
                    <SeverityChip severity={alert.severity} />
                  </div>

                  <p className={[
                    'tw-mt-1 tw-text-base md:tw-text-lg tw-leading-snug tw-font-medium tw-break-words',
                    isDark ? 'tw-text-slate-300' : 'tw-text-[#64748B]',
                  ].join(' ')}>
                    {alert.description}
                  </p>

                  <div className={['tw-mt-2 tw-text-sm tw-font-medium', isDark ? 'tw-text-slate-400' : 'tw-text-[#64748B]'].join(' ')}>
                    {formatDate(alert.detectedAt)}
                    {alert.relatedVendor ? ` • ${alert.relatedVendor}` : ''}
                  </div>
                </div>
              </div>

              <button
                type="button"
                className={[
                  'tw-inline-flex tw-items-center tw-gap-2 tw-rounded-lg tw-border tw-px-3 tw-py-1.5 tw-text-sm tw-font-semibold tw-w-fit md:tw-justify-self-end',
                  isDark
                    ? 'tw-border-slate-700 tw-text-slate-200 hover:tw-bg-slate-800'
                    : 'tw-border-[#E5E7EB] tw-text-[#1E293B] hover:tw-bg-[#F8FAFC]',
                ].join(' ')}
                onClick={() => onInvestigate?.(alert)}
              >
                Investigate <ArrowRight size={16} />
              </button>
            </div>

          </article>
        ))}
      </div>
    </SectionCard>
  )
}

function formatAlertTitle(alert) {
  const id = String(alert?.id || '')
  const type = String(alert?.type || '')

  if (type === 'REPEATED_DEVICE_ACTIVITY') return 'Duplicate Device'
  if (id.startsWith('typing:')) return 'Spam Pattern'
  if (id.startsWith('spike:')) return 'Volume Spike'
  if (type === 'DUPLICATE_CONTENT_CLUSTER') return 'Spam Pattern'
  if (type === 'MULTIPLE_REVIEWS_SAME_NETWORK') return 'Network Pattern'
  return 'Suspicious Pattern'
}

function SeverityChip({ severity }) {
  const value = String(severity || 'LOW').toUpperCase()
  const cls =
    value === 'HIGH'
      ? 'tw-bg-[#E53935] tw-text-white'
      : value === 'MEDIUM'
        ? 'tw-bg-[#E2E8F0] tw-text-[#4B5563]'
        : 'tw-bg-[#DBEAFE] tw-text-[#1D4ED8]'

  return <span className={['tw-rounded-full tw-px-3 tw-py-1 tw-text-xs tw-font-semibold', cls].join(' ')}>{value === 'HIGH' ? 'High' : value === 'MEDIUM' ? 'Medium' : 'Low'}</span>
}

function formatDate(value) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toISOString().slice(0, 10)
}

function getDemoAlerts() {
  return [
    {
      id: 'demo-1',
      severity: 'HIGH',
      type: 'REPEATED_DEVICE_ACTIVITY',
      description: 'Multiple feedbacks from same device hash (dh_d4e5f6) for vendor TechNova Electronics',
      detectedAt: '2025-12-09',
      relatedVendor: 'TechNova Electronics',
    },
    {
      id: 'demo-2',
      severity: 'MEDIUM',
      type: 'DUPLICATE_CONTENT_CLUSTER',
      description: 'Feedback f3 flagged for low content quality and rapid submission',
      detectedAt: '2025-12-09',
      relatedVendor: 'TechNova Electronics',
    },
    {
      id: 'demo-3',
      severity: 'MEDIUM',
      type: 'SUSPICIOUS_BEHAVIOR_PATTERN',
      description: 'Unusual feedback volume for vendor TechNova Electronics in the last 24 hours',
      detectedAt: '2025-12-10',
      relatedVendor: 'TechNova Electronics',
    },
  ]
}
