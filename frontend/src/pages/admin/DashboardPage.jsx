import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, Area } from 'recharts'
import {
  BarChart3,
  BellRing,
  Building2,
  Fingerprint,
  Flag,
  MessageSquareText,
  Shield,
  ShieldAlert,
  TrendingUp,
  Users,
  Zap,
} from 'lucide-react'
import { AlertCard, AnalyticsChart, InsightsCard, SectionCard } from '../../components/admin/AdminUi'

export function DashboardPage({ isDark, overview, alerts = [], analytics, logs = [] }) {
  const trendData = (analytics?.trustScoreTrend || []).slice(-10)
  const trendChange = Number(overview?.weeklyTrendChange || 0)
  const riskyVendorCount = Number(overview?.riskyVendorCount || 0)
  const alertTotal = Number(overview?.alertsSummary?.total || alerts.length)
  const trustAverage = Number(overview?.averageTrustScore || 0)

  const topMetrics = [
    { key: 'feedbacks', title: 'Feedbacks', value: 0, delta: '+12%', tone: 'blue', icon: MessageSquareText },
    { key: 'vendors', title: 'Vendors', value: 3, delta: '+3', tone: 'violet', icon: Building2 },
    { key: 'orders', title: 'Orders', value: 0, delta: '', tone: 'cyan', icon: BarChart3 },
    { key: 'avgTrust', title: 'Avg Trust', value: 0, delta: '+2.4', tone: 'green', icon: TrendingUp },
    { key: 'alerts', title: 'Alerts', value: 0, delta: '', tone: 'amber', icon: Shield },
    { key: 'flagged', title: 'Flagged', value: 0, delta: '', tone: 'rose', icon: Flag },
  ]

  const signalCards = [
    {
      key: 'suspicious',
      title: 'Suspicious Feedback',
      value: 0,
      subtitle: 'Flagged by AI pattern analysis',
      tone: 'rose',
      icon: ShieldAlert,
    },
    {
      key: 'deviceRepeats',
      title: 'Device Repeats',
      value: 0,
      subtitle: 'Submissions with tracked fingerprints',
      tone: 'amber',
      icon: Fingerprint,
    },
    {
      key: 'highSeverity',
      title: 'High Severity',
      value: 0,
      subtitle: 'Require immediate attention',
      tone: 'blue',
      icon: Zap,
    },
  ]

  return (
    <div className="tw-space-y-6 lg:tw-space-y-8">
      <div className="tw-grid tw-grid-cols-6 tw-gap-4">
        {topMetrics.map((metric) => {
          const Icon = metric.icon
          const tone = getToneStyles(metric.tone, isDark)
          return (
            <article
              key={metric.key}
              className={[
                'tw-relative tw-min-w-0 tw-h-[140px] tw-overflow-hidden tw-rounded-2xl tw-border tw-p-3 tw-shadow-soft',
                isDark ? 'tw-border-[#233650] tw-bg-[#111f34]' : 'tw-border-[#d6e4f2] tw-bg-white',
              ].join(' ')}
            >
              <span className={['tw-absolute tw-left-0 tw-top-0 tw-h-full tw-w-1.5', tone.leftBar].join(' ')} />
              <div className="tw-flex tw-items-start tw-justify-between tw-gap-2.5 tw-pl-1.5">
                <div>
                  <p className={['tw-text-[12px] tw-font-semibold tw-uppercase tw-tracking-[0.14em]', isDark ? 'tw-text-slate-400' : 'tw-text-[#4b5f79]'].join(' ')}>{metric.title}</p>
                  <p className={['tw-mt-0.5 tw-text-[22px] tw-leading-none tw-font-bold tw-tracking-tight', isDark ? 'tw-text-slate-100' : 'tw-text-[#0f172a]'].join(' ')}>{metric.value}</p>
                  {metric.delta ? (
                    <p className={['tw-mt-0.5 tw-text-[10px] tw-font-semibold', tone.deltaText].join(' ')}>↗ {metric.delta}</p>
                  ) : (
                    <p className={['tw-mt-0.5 tw-text-[10px] tw-font-semibold', isDark ? 'tw-text-slate-400' : 'tw-text-[#64748B]'].join(' ')}>-</p>
                  )}
                </div>
                <span className={[
                  'tw-inline-flex tw-h-8 tw-w-8 tw-items-center tw-justify-center tw-rounded-lg tw-border',
                  tone.iconWrap,
                ].join(' ')}>
                  <Icon size={16} className={tone.iconText} />
                </span>
              </div>
            </article>
          )
        })}
      </div>

      <div className="tw-grid tw-grid-cols-3 tw-gap-4">
        {signalCards.map((signal) => {
          const Icon = signal.icon
          const tone = getToneStyles(signal.tone, isDark)
          return (
            <article
              key={signal.key}
              className={[
                'tw-relative tw-h-[124px] tw-overflow-hidden tw-rounded-2xl tw-border tw-p-3 tw-shadow-soft',
                isDark ? 'tw-border-[#233650] tw-bg-[#111f34]' : `tw-border-[#d6e4f2] ${tone.signalSurface}`,
              ].join(' ')}
            >
              <span className={['tw-absolute tw-left-0 tw-top-0 tw-h-full tw-w-1.5', tone.leftBar].join(' ')} />
              <div className="tw-flex tw-items-center tw-gap-2.5 tw-pl-1.5">
                <span className={[
                  'tw-inline-flex tw-h-8 tw-w-8 tw-items-center tw-justify-center tw-rounded-lg tw-border',
                  tone.iconWrap,
                ].join(' ')}>
                  <Icon size={16} className={tone.iconText} />
                </span>
                <div>
                  <p className={['tw-text-[12px] tw-leading-tight tw-font-semibold tw-tracking-tight', isDark ? 'tw-text-slate-200' : 'tw-text-[#334155]'].join(' ')}>{signal.title}</p>
                  <p className={['tw-mt-0.5 tw-text-[21px] tw-leading-none tw-font-bold tw-tracking-tight', isDark ? 'tw-text-slate-100' : 'tw-text-[#0f172a]'].join(' ')}>{signal.value}</p>
                  <p className={['tw-mt-0.5 tw-text-[10px] tw-font-medium', isDark ? 'tw-text-slate-400' : 'tw-text-[#64748B]'].join(' ')}>{signal.subtitle}</p>
                </div>
              </div>
            </article>
          )
        })}
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
                  formatter={(value) => [value, 'Trust Score']}
                />
                <Area type="monotone" dataKey="averageTrust" stroke="none" fill="#5B61EA" fillOpacity={0.16} />
                <Line type="monotone" dataKey="averageTrust" stroke="#5B61EA" strokeWidth={4} dot={false} />
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

function getToneStyles(tone, isDark) {
  const palette = {
    blue: {
      leftBar: 'tw-bg-[#3B82F6]',
      iconWrap: isDark ? 'tw-border-blue-500/40 tw-bg-blue-500/20' : 'tw-border-blue-100 tw-bg-blue-50',
      iconText: isDark ? 'tw-text-blue-300' : 'tw-text-[#3B82F6]',
      deltaText: isDark ? 'tw-text-emerald-300' : 'tw-text-emerald-600',
      signalSurface: isDark ? 'tw-bg-[#111f34]' : 'tw-bg-[#EEF5FF]',
    },
    violet: {
      leftBar: 'tw-bg-[#7C3AED]',
      iconWrap: isDark ? 'tw-border-violet-500/40 tw-bg-violet-500/20' : 'tw-border-violet-100 tw-bg-violet-50',
      iconText: isDark ? 'tw-text-violet-300' : 'tw-text-[#7C3AED]',
      deltaText: isDark ? 'tw-text-emerald-300' : 'tw-text-emerald-600',
      signalSurface: isDark ? 'tw-bg-[#111f34]' : 'tw-bg-white',
    },
    cyan: {
      leftBar: 'tw-bg-[#06B6D4]',
      iconWrap: isDark ? 'tw-border-cyan-500/40 tw-bg-cyan-500/20' : 'tw-border-cyan-100 tw-bg-cyan-50',
      iconText: isDark ? 'tw-text-cyan-300' : 'tw-text-[#0891B2]',
      deltaText: isDark ? 'tw-text-slate-400' : 'tw-text-[#64748B]',
      signalSurface: isDark ? 'tw-bg-[#111f34]' : 'tw-bg-white',
    },
    green: {
      leftBar: 'tw-bg-[#10B981]',
      iconWrap: isDark ? 'tw-border-emerald-500/40 tw-bg-emerald-500/20' : 'tw-border-emerald-100 tw-bg-emerald-50',
      iconText: isDark ? 'tw-text-emerald-300' : 'tw-text-[#059669]',
      deltaText: isDark ? 'tw-text-emerald-300' : 'tw-text-emerald-600',
      signalSurface: isDark ? 'tw-bg-[#111f34]' : 'tw-bg-white',
    },
    amber: {
      leftBar: 'tw-bg-[#F59E0B]',
      iconWrap: isDark ? 'tw-border-amber-500/40 tw-bg-amber-500/20' : 'tw-border-amber-100 tw-bg-amber-50',
      iconText: isDark ? 'tw-text-amber-300' : 'tw-text-[#D97706]',
      deltaText: isDark ? 'tw-text-slate-400' : 'tw-text-[#64748B]',
      signalSurface: isDark ? 'tw-bg-[#111f34]' : 'tw-bg-[#FFFBEE]',
    },
    rose: {
      leftBar: 'tw-bg-[#EF4444]',
      iconWrap: isDark ? 'tw-border-rose-500/40 tw-bg-rose-500/20' : 'tw-border-rose-100 tw-bg-rose-50',
      iconText: isDark ? 'tw-text-rose-300' : 'tw-text-[#DC2626]',
      deltaText: isDark ? 'tw-text-slate-400' : 'tw-text-[#64748B]',
      signalSurface: isDark ? 'tw-bg-[#111f34]' : 'tw-bg-[#FEF1F2]',
    },
  }

  return palette[tone] || palette.blue
}
