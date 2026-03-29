import { PieChart, Pie, Tooltip, Cell, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid } from 'recharts'
import { KpiCard, SectionCard } from '../../components/admin/AdminUi'

const pieColors = ['#16a34a', '#f59e0b', '#dc2626']

export function VendorDetailPage({ isDark, detail }) {
  if (!detail) {
    return (
      <SectionCard title="Vendor Detail" subtitle="Pick a vendor from the Vendors page to inspect profile-level risk and trust insights.">
        <p className={['tw-text-sm', isDark ? 'tw-text-slate-400' : 'tw-text-slate-600'].join(' ')}>No vendor selected.</p>
      </SectionCard>
    )
  }

  const distribution = [
    { name: 'High', value: detail.feedbackDistribution?.HIGH || 0 },
    { name: 'Medium', value: detail.feedbackDistribution?.MEDIUM || 0 },
    { name: 'Low', value: detail.feedbackDistribution?.LOW || 0 },
  ]

  return (
    <div className="tw-space-y-6 lg:tw-space-y-8">
      <SectionCard title={detail.vendor?.name || 'Vendor'} subtitle="Trust trend, risk signals, and cluster analysis.">
        <div className="tw-grid tw-gap-4 md:tw-grid-cols-4">
          <KpiCard title="Trust Score" value={detail.vendor?.averageTrustScore ?? 0} tone="blue" />
          <KpiCard title="Total Feedbacks" value={detail.totals?.feedbacks ?? 0} tone="green" />
          <KpiCard title="Low Trust" value={detail.riskSignals?.lowTrustCount ?? 0} tone="rose" />
          <KpiCard title="Risk Signal Score" value={detail.riskSignals?.signalScore ?? 0} tone="amber" />
        </div>
      </SectionCard>

      <div className="tw-grid tw-gap-6 xl:tw-grid-cols-[1.5fr_1fr]">
        <SectionCard title="Trust Score Trend" subtitle="Daily trust movement for selected vendor.">
          <div className={[
            'tw-h-64 tw-w-full tw-rounded-xl tw-border tw-p-3',
            isDark ? 'tw-border-slate-700 tw-bg-slate-900' : 'tw-border-[#E2E8F0] tw-bg-white',
          ].join(' ')}>
            <ResponsiveContainer width="100%" height="100%" minWidth={240} minHeight={220}>
              <LineChart data={detail.trustTrend || []}>
                <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#334155' : '#e2e8f0'} />
                <XAxis dataKey="date" tick={{ fontSize: 12, fill: isDark ? '#94a3b8' : '#64748b' }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: isDark ? '#94a3b8' : '#64748b' }} />
                <Tooltip />
                <Line type="monotone" dataKey="averageTrust" stroke="#0ea5e9" strokeWidth={3} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        <SectionCard title="Feedback Distribution" subtitle="Trust-level split of feedback.">
          <div className={[
            'tw-h-64 tw-w-full tw-rounded-xl tw-border tw-p-3',
            isDark ? 'tw-border-slate-700 tw-bg-slate-900' : 'tw-border-[#E2E8F0] tw-bg-white',
          ].join(' ')}>
            <ResponsiveContainer width="100%" height="100%" minWidth={240} minHeight={220}>
              <PieChart>
                <Pie data={distribution} dataKey="value" outerRadius={90} innerRadius={54}>
                  {distribution.map((entry, idx) => (
                    <Cell key={entry.name} fill={pieColors[idx % pieColors.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>
      </div>

      <div className="tw-grid tw-gap-6 xl:tw-grid-cols-3">
        <SectionCard title="Device Pattern Analysis">
          <div className="tw-space-y-2">
            {(detail.deviceClusters || []).slice(0, 6).map((item) => (
              <div
                key={item.hash}
                className={[
                  'tw-flex tw-items-center tw-justify-between tw-rounded-xl tw-border tw-p-2.5 tw-text-sm tw-shadow-sm',
                  isDark ? 'tw-border-slate-700 tw-bg-slate-900' : 'tw-border-[#E2E8F0] tw-bg-white',
                ].join(' ')}
              >
                <span className={['tw-font-mono tw-text-xs', isDark ? 'tw-text-slate-400' : 'tw-text-[#64748B]'].join(' ')}>{String(item.hash).slice(0, 10)}...</span>
                <span className={['tw-font-bold', isDark ? 'tw-text-slate-100' : 'tw-text-[#0F172A]'].join(' ')}>{item.count}</span>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Duplicate Feedback Detection">
          <div className="tw-space-y-2">
            {(detail.duplicateClusters || []).slice(0, 6).map((item) => (
              <div
                key={item.hash}
                className={[
                  'tw-flex tw-items-center tw-justify-between tw-rounded-xl tw-border tw-p-2.5 tw-text-sm tw-shadow-sm',
                  isDark ? 'tw-border-slate-700 tw-bg-slate-900' : 'tw-border-[#E2E8F0] tw-bg-white',
                ].join(' ')}
              >
                <span className={['tw-font-mono tw-text-xs', isDark ? 'tw-text-slate-400' : 'tw-text-[#64748B]'].join(' ')}>{String(item.hash).slice(0, 10)}...</span>
                <span className={['tw-font-bold', isDark ? 'tw-text-slate-100' : 'tw-text-[#0F172A]'].join(' ')}>{item.count}</span>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Location Clusters">
          <div className="tw-space-y-2">
            {(detail.locationClusters || []).slice(0, 6).map((item) => (
              <div
                key={item.location}
                className={[
                  'tw-flex tw-items-center tw-justify-between tw-rounded-xl tw-border tw-p-2.5 tw-text-sm tw-shadow-sm',
                  isDark ? 'tw-border-slate-700 tw-bg-slate-900' : 'tw-border-[#E2E8F0] tw-bg-white',
                ].join(' ')}
              >
                <span className={['tw-font-medium', isDark ? 'tw-text-slate-100' : 'tw-text-[#0F172A]'].join(' ')}>{item.location}</span>
                <span className={['tw-font-bold', isDark ? 'tw-text-slate-100' : 'tw-text-[#0F172A]'].join(' ')}>{item.count}</span>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>
    </div>
  )
}
