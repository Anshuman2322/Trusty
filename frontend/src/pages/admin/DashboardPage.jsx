import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from 'recharts'
import { BellRing, ShieldAlert, TrendingUp, Users } from 'lucide-react'
import { AlertCard, AnalyticsChart, InsightsCard, KpiCard, SectionCard } from '../../components/admin/AdminUi'

export function DashboardPage({ isDark, overview, alerts = [], analytics, logs = [] }) {
  const trendData = (analytics?.trustScoreTrend || []).slice(-10)
  const trendChange = Number(overview?.weeklyTrendChange || 0)
  const riskyVendorCount = Number(overview?.riskyVendorCount || 0)
  const alertTotal = Number(overview?.alertsSummary?.total || alerts.length)
  const trustAverage = Number(overview?.averageTrustScore || 0)

  return (
    <div className="tw-space-y-8 lg:tw-space-y-10">
      <div
        className="tw-grid tw-gap-5"
        style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}
      >
        <KpiCard isDark={isDark} title="Total Vendors" value={overview?.vendorCount ?? 0} tone="blue" />
        <KpiCard isDark={isDark} title="Total Feedbacks" value={overview?.feedbackCount ?? 0} tone="green" />
        <KpiCard isDark={isDark} title="Total Orders" value={overview?.orderCount ?? 0} tone="amber" />
        <KpiCard isDark={isDark} title="Average Trust Score" value={overview?.averageTrustScore ?? 0} tone="slate" />
      </div>

      <div
        className="tw-grid tw-gap-5"
        style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}
      >
        <KpiCard isDark={isDark} title="Suspicious Feedback Count" value={overview?.suspiciousFeedbackCount ?? 0} tone="rose" />
        <KpiCard isDark={isDark} title="Repeated Device Count" value={overview?.repeatedDeviceCount ?? 0} tone="amber" />
        <KpiCard isDark={isDark} title="Duplicate Reviews Detected" value={overview?.duplicateReviewsDetected ?? 0} tone="rose" />
      </div>

      <div className={['tw-h-px', isDark ? 'tw-bg-slate-800' : 'tw-bg-[#E5E7EB]'].join(' ')} />

      <SectionCard title="Quick Insights" subtitle="3-second health snapshot for trust, risk, loyalty, and alert pressure.">
        <div className="tw-grid tw-gap-4 md:tw-grid-cols-2 xl:tw-grid-cols-4">
          <InsightsCard
            isDark={isDark}
            icon={TrendingUp}
            title="Trend"
            tone="blue"
            message={trendChange >= 0 ? `Trust trend is up by +${trendChange.toFixed(2)} this week.` : `Trust trend is down by ${trendChange.toFixed(2)} this week.`}
          />
          <InsightsCard
            isDark={isDark}
            icon={ShieldAlert}
            title="Risk"
            tone="rose"
            message={riskyVendorCount > 0 ? `${riskyVendorCount} vendors need immediate risk review.` : 'No high-risk vendor cluster detected.'}
          />
          <InsightsCard
            isDark={isDark}
            icon={Users}
            title="Loyalty"
            tone="green"
            message={trustAverage >= 70 ? 'Platform loyalty signals remain strong.' : 'Loyalty confidence needs attention this week.'}
          />
          <InsightsCard
            isDark={isDark}
            icon={BellRing}
            title="Alerts"
            tone="amber"
            message={alertTotal > 0 ? `${alertTotal} active alerts require triage.` : 'No active alert spike in the system.'}
          />
        </div>
      </SectionCard>

      <div className={['tw-h-px', isDark ? 'tw-bg-slate-800' : 'tw-bg-[#E5E7EB]'].join(' ')} />

      <div className="tw-grid tw-gap-6 xl:tw-grid-cols-[1.5fr_1fr]">
        <SectionCard title="Analytics Overview" subtitle="Live trust movement with triage-ready chart signals.">
          <AnalyticsChart isDark={isDark}>
            <ResponsiveContainer width="100%" height="100%" minWidth={240} minHeight={220}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#334155' : '#dbe4ef'} />
                <XAxis dataKey="date" tick={{ fontSize: 12, fill: isDark ? '#94a3b8' : '#64748B' }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: isDark ? '#94a3b8' : '#64748B' }} />
                <Tooltip
                  contentStyle={{
                    borderRadius: 12,
                    borderColor: isDark ? '#334155' : '#E2E8F0',
                    backgroundColor: isDark ? '#0f172a' : '#ffffff',
                    color: isDark ? '#e2e8f0' : '#0F172A',
                    fontSize: 12,
                  }}
                />
                <Line type="monotone" dataKey="averageTrust" stroke="#2563EB" strokeWidth={3} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </AnalyticsChart>
        </SectionCard>

        <SectionCard title="Alerts Summary" subtitle="High-priority risk signals are intentionally highlighted for fast action.">
          <div className="tw-space-y-3">
            {alerts.slice(0, 6).map((alert) => (
              <AlertCard
                isDark={isDark}
                key={alert.id}
                title={alert.type}
                description={alert.description}
                severity={alert.severity}
                relatedVendor={alert.relatedVendor}
              />
            ))}
          </div>
        </SectionCard>
      </div>

      <div className={['tw-h-px', isDark ? 'tw-bg-slate-800' : 'tw-bg-[#E5E7EB]'].join(' ')} />

      <SectionCard title="Audit Trail" subtitle="Recent admin enforcement and governance actions.">
        <div className="tw-space-y-2">
          {logs.map((log) => (
            <div
              key={log._id}
              className={[
                'tw-flex tw-flex-wrap tw-items-center tw-justify-between tw-gap-2 tw-rounded-xl tw-border tw-p-3 tw-shadow-sm',
                isDark ? 'tw-border-slate-700 tw-bg-slate-900' : 'tw-border-[#E2E8F0] tw-bg-white',
              ].join(' ')}
            >
              <div>
                <div className={['tw-text-sm tw-font-semibold', isDark ? 'tw-text-slate-100' : 'tw-text-[#0F172A]'].join(' ')}>{log.actionType}</div>
                <div className={['tw-text-xs tw-font-medium', isDark ? 'tw-text-slate-400' : 'tw-text-[#64748B]'].join(' ')}>{log.actorEmail}</div>
              </div>
              <div className={['tw-text-xs tw-font-medium', isDark ? 'tw-text-slate-400' : 'tw-text-[#64748B]'].join(' ')}>
                {new Date(log.createdAt).toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  )
}
