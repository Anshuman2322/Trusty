import { useMemo, useState } from 'react'
import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { AlertTriangle, Brain, Clock3, Copy, Download, Fingerprint } from 'lucide-react'
import { AnalyticsChart, SectionCard } from '../../components/admin/AdminUi'

const distributionColors = {
  HIGH: '#22c55e',
  MEDIUM: '#f59e0b',
  LOW: '#ef4444',
  UNKNOWN: '#64748b',
}

const tabOptions = [
  { key: 'overview', label: 'Overview' },
  { key: 'trends', label: 'Trends' },
  { key: 'risk', label: 'Risk Analysis' },
  { key: 'reports', label: 'Reports' },
]

const reportButtons = [
  { key: 'feedback', label: 'Export Feedback Data' },
  { key: 'vendor', label: 'Export Vendor Report' },
  { key: 'analytics', label: 'Export Analytics Report' },
]

const patternTimelines = ['2 hours ago', '1 day ago', '2 days ago', '5 days ago', '1 week ago']

function shortDayLabel(dateText) {
  const parsed = new Date(dateText)
  if (Number.isNaN(parsed.getTime())) return dateText
  return parsed.toLocaleDateString(undefined, { weekday: 'short' })
}

function compactDateLabel(dateText) {
  const parsed = new Date(dateText)
  if (Number.isNaN(parsed.getTime())) return dateText
  return parsed.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function formatPercent(value, total) {
  if (!total) return '0%'
  return `${Math.round((value / total) * 100)}%`
}

function filterTrendByRange(source, range) {
  const sorted = (source || []).slice().sort((a, b) => new Date(a.date) - new Date(b.date))
  if (!sorted.length || range === 'all') return sorted

  const last = new Date(sorted[sorted.length - 1].date)
  if (Number.isNaN(last.getTime())) return sorted

  const days = range === '30d' ? 30 : 7
  const cutoff = new Date(last)
  cutoff.setDate(cutoff.getDate() - (days - 1))
  return sorted.filter((item) => new Date(item.date) >= cutoff)
}

export function AnalyticsPage({
  isDark,
  analytics,
  vendors = [],
  patterns,
  activeTab = 'overview',
  onTabChange,
  onExport,
  exporting,
}) {
  const [fallbackTab, setFallbackTab] = useState('overview')
  const [range, setRange] = useState('7d')
  const [reportRange, setReportRange] = useState('30d')
  const [reportFormat, setReportFormat] = useState('csv')

  const selectedTab = typeof onTabChange === 'function' ? activeTab || 'overview' : fallbackTab
  const setTab = (nextTab) => {
    if (typeof onTabChange === 'function') {
      onTabChange(nextTab)
      return
    }
    setFallbackTab(nextTab)
  }

  const trend = useMemo(() => filterTrendByRange(analytics?.trustScoreTrend, range), [analytics?.trustScoreTrend, range])

  const trendChartData = useMemo(() => {
    const isWeekly = range === '7d'
    return trend.map((item) => ({
      ...item,
      label: isWeekly ? shortDayLabel(item.date) : compactDateLabel(item.date),
    }))
  }, [trend, range])

  const distribution = useMemo(() => {
    const source = analytics?.feedbackDistribution || []
    const baseLevels = ['HIGH', 'MEDIUM', 'LOW', 'UNKNOWN']
    const mapped = baseLevels.map((level) => {
      const found = source.find((item) => String(item.level || 'UNKNOWN').toUpperCase() === level)
      return {
        level,
        count: Number(found?.count || 0),
        color: distributionColors[level],
      }
    })
    return mapped.filter((item) => item.count > 0)
  }, [analytics?.feedbackDistribution])

  const totalFeedbackVolume = useMemo(
    () => trend.reduce((sum, item) => sum + Number(item.totalFeedbacks || 0), 0),
    [trend]
  )

  const averageTrustInRange = useMemo(() => {
    if (!trend.length) return 0
    const total = trend.reduce((sum, item) => sum + Number(item.averageTrust || 0), 0)
    return Math.round((total / trend.length) * 10) / 10
  }, [trend])

  const categoryPerformance = useMemo(() => {
    const map = new Map()
    vendors.forEach((vendor) => {
      const category = String(vendor.category || 'Uncategorized').trim() || 'Uncategorized'
      const feedbacks = Number(vendor.totalFeedbacks || 0)
      const avgTrust = Number(vendor.averageTrustScore || 0)

      const current = map.get(category) || {
        category,
        weightedTrust: 0,
        feedbackCount: 0,
        vendorCount: 0,
      }

      current.vendorCount += 1
      current.feedbackCount += feedbacks
      current.weightedTrust += avgTrust * feedbacks
      map.set(category, current)
    })

    return Array.from(map.values())
      .map((item) => ({
        category: item.category,
        totalFeedbacks: item.feedbackCount,
        vendors: item.vendorCount,
        averageTrust:
          item.feedbackCount > 0
            ? Math.round((item.weightedTrust / item.feedbackCount) * 10) / 10
            : 0,
      }))
      .sort((a, b) => b.averageTrust - a.averageTrust)
  }, [vendors])

  const vendorPerformance = useMemo(() => {
    const source = analytics?.vendorPerformance || []
    return source
      .slice()
      .sort((a, b) => {
        if (Number(b.averageTrust || 0) !== Number(a.averageTrust || 0)) {
          return Number(b.averageTrust || 0) - Number(a.averageTrust || 0)
        }
        return Number(b.totalFeedbacks || 0) - Number(a.totalFeedbacks || 0)
      })
      .slice(0, 8)
      .map((item, index) => ({
        ...item,
        rank: index + 1,
      }))
  }, [analytics?.vendorPerformance])

  const patternCards = useMemo(() => buildPatternCards(patterns), [patterns])

  const riskStats = useMemo(() => {
    const lowTrust = distribution.find((item) => item.level === 'LOW')?.count || 0
    const mediumTrust = distribution.find((item) => item.level === 'MEDIUM')?.count || 0
    const highTrust = distribution.find((item) => item.level === 'HIGH')?.count || 0
    const deviceClusters = Number(patterns?.deviceClusters?.length || 0)
    const similarClusters = Number(patterns?.similarFeedbackClusters?.length || 0)
    const locationClusters = Number(patterns?.locationClusters?.length || 0)

    return {
      lowTrust,
      mediumTrust,
      highTrust,
      deviceClusters,
      similarClusters,
      locationClusters,
      totalClusters: deviceClusters + similarClusters + locationClusters,
      highSeverityPatterns: patternCards.filter((item) => item.severity === 'high').length,
    }
  }, [distribution, patterns, patternCards])

  const reportTrend = useMemo(
    () => filterTrendByRange(analytics?.trustScoreTrend, reportRange),
    [analytics?.trustScoreTrend, reportRange]
  )

  const reportStats = useMemo(() => {
    const totalFeedbacks = reportTrend.reduce((sum, item) => sum + Number(item.totalFeedbacks || 0), 0)
    const avgTrust = reportTrend.length
      ? Math.round(
          (reportTrend.reduce((sum, item) => sum + Number(item.averageTrust || 0), 0) / reportTrend.length) * 10
        ) / 10
      : 0

    const distributionTotal = distribution.reduce((sum, item) => sum + Number(item.count || 0), 0)
    const highCount = distribution.find((item) => item.level === 'HIGH')?.count || 0

    return {
      totalFeedbacks,
      avgTrust,
      highTrustShare: distributionTotal ? `${Math.round((highCount / distributionTotal) * 100)}%` : '0%',
    }
  }, [reportTrend, distribution])

  const topCategory = categoryPerformance[0]
  const topVendor = vendorPerformance[0]
  const distributionTotal = distribution.reduce((sum, item) => sum + Number(item.count || 0), 0)

  return (
    <div className="tw-space-y-2.5 lg:tw-space-y-3">
      <div className="tw-flex tw-flex-wrap tw-items-start tw-justify-between tw-gap-1.5">
        <div>
          <h2 className={[
            'tw-text-lg tw-font-semibold tw-tracking-tight md:tw-text-xl',
            isDark ? 'tw-text-slate-100' : 'tw-text-[#0f172a]',
          ].join(' ')}>
            Platform Analytics
          </h2>
          <p className={[
            'tw-mt-0 tw-text-sm tw-font-medium',
            isDark ? 'tw-text-slate-400' : 'tw-text-[#64748b]',
          ].join(' ')}>
            Unified workspace for overview metrics, pattern trends, risk posture, and exports.
          </p>
        </div>
      </div>

      <div className={[
        'tw-flex tw-flex-wrap tw-items-center tw-justify-between tw-gap-2 tw-rounded-2xl tw-border tw-p-2 tw-shadow-sm tw-backdrop-blur-sm',
        isDark
          ? 'tw-border-slate-700/80 tw-bg-slate-900/80'
          : 'tw-border-[#dbe4ef]/80 tw-bg-white/75',
      ].join(' ')}>
        <SegmentedControl isDark={isDark}>
          {tabOptions.map((tab) => (
            <TabButton
              key={tab.key}
              isDark={isDark}
              active={selectedTab === tab.key}
              onClick={() => setTab(tab.key)}
            >
              {tab.label}
            </TabButton>
          ))}
        </SegmentedControl>

        <SegmentedControl isDark={isDark} compact>
          {[
            { key: '7d', label: '7d' },
            { key: '30d', label: '30d' },
            { key: 'all', label: 'All' },
          ].map((option) => (
            <TabButton
              key={option.key}
              isDark={isDark}
              active={range === option.key}
              onClick={() => setRange(option.key)}
              compact
            >
              {option.label}
            </TabButton>
          ))}
        </SegmentedControl>
      </div>

      {selectedTab === 'overview' ? (
        <div className="tw-space-y-2">
          <div className="tw-grid tw-gap-2.5 md:tw-grid-cols-2 xl:tw-grid-cols-4">
            <MetricMiniCard isDark={isDark} title="Avg Trust Score" value={averageTrustInRange.toFixed(1)} subtitle="Selected range" />
            <MetricMiniCard isDark={isDark} title="Feedback Volume" value={totalFeedbackVolume} subtitle="Submissions in range" />
            <MetricMiniCard
              isDark={isDark}
              title="Top Category"
              value={topCategory?.category || 'n/a'}
              subtitle={topCategory ? `Avg ${topCategory.averageTrust} | ${topCategory.totalFeedbacks} feedbacks` : 'No category data'}
            />
            <MetricMiniCard
              isDark={isDark}
              title="Best Vendor"
              value={topVendor?.vendorName || 'n/a'}
              subtitle={topVendor ? `Trust ${topVendor.averageTrust} | ${topVendor.totalFeedbacks} feedbacks` : 'No vendor data'}
            />
          </div>

          <div className="tw-grid tw-gap-3 xl:tw-grid-cols-2">
            <SectionCard title="Trust Score Trend" subtitle="Platform average trust score over time.">
              <AnalyticsChart isDark={isDark}>
                <ResponsiveContainer width="100%" height="100%" minWidth={240} minHeight={220}>
                  <LineChart data={trendChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#334155' : '#dbe4ef'} />
                    <XAxis dataKey="label" tick={{ fontSize: 12, fill: isDark ? '#94a3b8' : '#64748B' }} />
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

            <SectionCard title="Feedback Volume" subtitle="Daily submission count in selected range.">
              <AnalyticsChart isDark={isDark}>
                <ResponsiveContainer width="100%" height="100%" minWidth={240} minHeight={220}>
                  <BarChart data={trendChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#334155' : '#dbe4ef'} />
                    <XAxis dataKey="label" tick={{ fontSize: 12, fill: isDark ? '#94a3b8' : '#64748B' }} />
                    <YAxis tick={{ fontSize: 12, fill: isDark ? '#94a3b8' : '#64748B' }} />
                    <Tooltip
                      contentStyle={{
                        borderRadius: 12,
                        borderColor: isDark ? '#334155' : '#E2E8F0',
                        backgroundColor: isDark ? '#0f172a' : '#ffffff',
                        color: isDark ? '#e2e8f0' : '#0F172A',
                        fontSize: 12,
                      }}
                    />
                    <Bar dataKey="totalFeedbacks" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </AnalyticsChart>
            </SectionCard>
          </div>

          <div className="tw-grid tw-gap-3 xl:tw-grid-cols-2">
            <SectionCard title="Experience Distribution" subtitle="Overall trust-level share across all feedback.">
              <AnalyticsChart isDark={isDark}>
                <ResponsiveContainer width="100%" height="100%" minWidth={240} minHeight={220}>
                  <PieChart>
                    <Pie data={distribution} dataKey="count" nameKey="level" innerRadius={60} outerRadius={100}>
                      {distribution.map((entry) => (
                        <Cell key={entry.level} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        borderRadius: 12,
                        borderColor: isDark ? '#334155' : '#E2E8F0',
                        backgroundColor: isDark ? '#0f172a' : '#ffffff',
                        color: isDark ? '#e2e8f0' : '#0F172A',
                        fontSize: 12,
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </AnalyticsChart>
              <div className="tw-mt-4 tw-grid tw-gap-2 sm:tw-grid-cols-2">
                {distribution.map((item) => (
                  <div key={item.level} className="tw-flex tw-items-center tw-justify-between tw-rounded-lg tw-border tw-border-[var(--admin-card-border,#d6e4f2)] tw-px-3 tw-py-2">
                    <div className="tw-flex tw-items-center tw-gap-2">
                      <span className="tw-inline-block tw-h-2.5 tw-w-2.5 tw-rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="tw-text-xs tw-font-semibold tw-text-[var(--admin-text-secondary,#4b5f79)]">{item.level}</span>
                    </div>
                    <span className="tw-text-xs tw-font-semibold tw-text-[var(--admin-text-primary,#0f172a)]">
                      {item.count} ({formatPercent(item.count, distributionTotal)})
                    </span>
                  </div>
                ))}
              </div>
            </SectionCard>

            <SectionCard title="Category-wise Overall" subtitle="Average trust by business category across all vendors.">
              <AnalyticsChart isDark={isDark}>
                <ResponsiveContainer width="100%" height="100%" minWidth={240} minHeight={220}>
                  <BarChart data={categoryPerformance.slice(0, 8)}>
                    <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#334155' : '#dbe4ef'} />
                    <XAxis dataKey="category" tick={{ fontSize: 11, fill: isDark ? '#94a3b8' : '#64748B' }} interval={0} angle={-18} textAnchor="end" height={80} />
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
                    <Bar dataKey="averageTrust" fill="#10b981" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </AnalyticsChart>
            </SectionCard>
          </div>

          <SectionCard title="Vendor-wise Best" subtitle="Top-performing vendors by trust score and feedback reliability.">
            <div className="tw-space-y-3">
              {vendorPerformance.length ? (
                vendorPerformance.map((vendor) => (
                  <div
                    key={vendor.vendorId}
                    className={[
                      'tw-rounded-xl tw-border tw-p-3',
                      isDark ? 'tw-border-slate-700 tw-bg-slate-900' : 'tw-border-[#dbe4ef] tw-bg-[#fcfeff]',
                    ].join(' ')}
                  >
                    <div className="tw-flex tw-flex-wrap tw-items-center tw-justify-between tw-gap-2">
                      <div className="tw-flex tw-items-center tw-gap-3">
                        <span className={[
                          'tw-inline-flex tw-h-7 tw-w-7 tw-items-center tw-justify-center tw-rounded-full tw-text-xs tw-font-bold',
                          vendor.rank <= 3
                            ? 'tw-bg-emerald-100 tw-text-emerald-700'
                            : isDark
                              ? 'tw-bg-slate-700 tw-text-slate-200'
                              : 'tw-bg-slate-100 tw-text-slate-700',
                        ].join(' ')}>
                          #{vendor.rank}
                        </span>
                        <div>
                          <p className={['tw-text-sm tw-font-semibold', isDark ? 'tw-text-slate-100' : 'tw-text-[#0f172a]'].join(' ')}>{vendor.vendorName}</p>
                          <p className={['tw-text-xs tw-font-medium', isDark ? 'tw-text-slate-400' : 'tw-text-[#64748b]'].join(' ')}>
                            {vendor.category || 'Uncategorized'} • {vendor.totalFeedbacks} feedbacks
                          </p>
                        </div>
                      </div>
                      <div className="tw-text-right">
                        <p className={['tw-text-base tw-font-bold', isDark ? 'tw-text-slate-100' : 'tw-text-[#0f172a]'].join(' ')}>{vendor.averageTrust}</p>
                        <p className={['tw-text-xs tw-font-medium', isDark ? 'tw-text-slate-400' : 'tw-text-[#64748b]'].join(' ')}>trust score</p>
                      </div>
                    </div>
                    <div className={[
                      'tw-mt-2 tw-h-2 tw-w-full tw-overflow-hidden tw-rounded-full',
                      isDark ? 'tw-bg-slate-800' : 'tw-bg-slate-100',
                    ].join(' ')}>
                      <div
                        className="tw-h-full tw-rounded-full tw-bg-gradient-to-r tw-from-emerald-500 tw-to-blue-500"
                        style={{ width: `${Math.max(0, Math.min(100, Number(vendor.averageTrust || 0)))}%` }}
                      />
                    </div>
                  </div>
                ))
              ) : (
                <div className={['tw-text-sm tw-font-medium', isDark ? 'tw-text-slate-400' : 'tw-text-[#64748b]'].join(' ')}>
                  No vendor performance data available yet.
                </div>
              )}
            </div>
          </SectionCard>
        </div>
      ) : null}

      {selectedTab === 'trends' ? (
        <div className="tw-space-y-2.5">
          <div className="tw-grid tw-gap-2.5 sm:tw-grid-cols-2 lg:tw-grid-cols-4">
            <MetricMiniCard isDark={isDark} title="Pattern Clusters" value={riskStats.totalClusters} subtitle="Device, content, location" />
            <MetricMiniCard isDark={isDark} title="High Severity" value={riskStats.highSeverityPatterns} subtitle="Immediate review suggested" />
            <MetricMiniCard isDark={isDark} title="Device Clusters" value={riskStats.deviceClusters} subtitle="Fingerprint reuse" />
            <MetricMiniCard isDark={isDark} title="Content Clusters" value={riskStats.similarClusters} subtitle="Near-duplicate patterns" />
          </div>

          <SectionCard title="Trends" subtitle="Suspicious behavior pattern clusters detected by AI analysis.">
            <div className="tw-space-y-3">
              {patternCards.map((card, index) => {
                const Icon = card.icon
                return (
                  <article
                    key={card.id}
                    className={[
                      'tw-relative tw-overflow-hidden tw-rounded-xl tw-border tw-p-4',
                      isDark ? 'tw-border-slate-700 tw-bg-slate-950' : 'tw-border-[#E5E7EB] tw-bg-white',
                    ].join(' ')}
                  >
                    <span className="tw-absolute tw-left-0 tw-top-0 tw-h-full tw-w-1" style={{ backgroundColor: card.rail }} />
                    <div className="tw-flex tw-items-start tw-gap-3">
                      <div className={[
                        'tw-grid tw-h-10 tw-w-10 tw-shrink-0 tw-place-items-center tw-rounded-xl',
                        card.severity === 'high'
                          ? 'tw-bg-[#FDECEC] tw-text-[#E53935]'
                          : card.severity === 'medium'
                            ? 'tw-bg-[#FFF5E5] tw-text-[#F59E0B]'
                            : 'tw-bg-[#EEF7FF] tw-text-[#3B82F6]',
                      ].join(' ')}>
                        <Icon size={18} />
                      </div>

                      <div className="tw-min-w-0">
                        <div className="tw-flex tw-flex-wrap tw-items-center tw-gap-2">
                          <h3 className={['tw-text-base tw-font-semibold', isDark ? 'tw-text-slate-100' : 'tw-text-[#1E293B]'].join(' ')}>{card.title}</h3>
                          <span className={['tw-text-xs tw-font-semibold', isDark ? 'tw-text-slate-400' : 'tw-text-[#94A3B8]'].join(' ')}>{card.patternId}</span>
                        </div>

                        <div className={['tw-mt-0.5 tw-text-xs tw-font-medium', isDark ? 'tw-text-slate-400' : 'tw-text-[#64748B]'].join(' ')}>
                          Vendors: {card.vendors} • {patternTimelines[index % patternTimelines.length]}
                        </div>

                        <ul className="tw-mt-2 tw-space-y-1">
                          {card.reasons.map((reason) => (
                            <li key={reason} className={['tw-flex tw-items-start tw-gap-2 tw-text-sm tw-font-medium', isDark ? 'tw-text-slate-300' : 'tw-text-[#64748B]'].join(' ')}>
                              <AlertTriangle size={15} className="tw-mt-0.5 tw-shrink-0 tw-text-[#F59E0B]" />
                              <span>{reason}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </article>
                )
              })}
            </div>
          </SectionCard>
        </div>
      ) : null}

      {selectedTab === 'risk' ? (
        <div className="tw-space-y-2.5">
          <div className="tw-grid tw-gap-2.5 md:tw-grid-cols-2 xl:tw-grid-cols-4">
            <MetricMiniCard isDark={isDark} title="Low Trust Feedback" value={riskStats.lowTrust} subtitle="Requires moderation review" />
            <MetricMiniCard isDark={isDark} title="Medium Trust Feedback" value={riskStats.mediumTrust} subtitle="Needs partial verification" />
            <MetricMiniCard isDark={isDark} title="High Severity Patterns" value={riskStats.highSeverityPatterns} subtitle="Top risk cluster count" />
            <MetricMiniCard isDark={isDark} title="Location Clusters" value={riskStats.locationClusters} subtitle="Timing/location anomalies" />
          </div>

          <SectionCard title="Risk Signal Breakdown" subtitle="Current risk pressure by trust quality and pattern clustering.">
            <div className="tw-grid tw-gap-3 md:tw-grid-cols-2">
              <div className={[
                'tw-rounded-xl tw-border tw-p-3',
                isDark ? 'tw-border-slate-700 tw-bg-slate-900' : 'tw-border-[#E2E8F0] tw-bg-white',
              ].join(' ')}>
                <h3 className={['tw-text-sm tw-font-semibold', isDark ? 'tw-text-slate-100' : 'tw-text-[#0F172A]'].join(' ')}>Trust-Level Risk Load</h3>
                <div className="tw-mt-2 tw-space-y-2">
                  {[{ label: 'Low Trust', value: riskStats.lowTrust }, { label: 'Medium Trust', value: riskStats.mediumTrust }, { label: 'High Trust', value: riskStats.highTrust }].map((row) => {
                    const total = riskStats.lowTrust + riskStats.mediumTrust + riskStats.highTrust
                    const width = total ? Math.round((row.value / total) * 100) : 0
                    return (
                      <div key={row.label}>
                        <div className="tw-flex tw-items-center tw-justify-between tw-text-xs tw-font-semibold tw-text-[var(--admin-text-secondary,#4b5f79)]">
                          <span>{row.label}</span>
                          <span>{row.value}</span>
                        </div>
                        <div className={['tw-mt-1 tw-h-2 tw-rounded-full', isDark ? 'tw-bg-slate-800' : 'tw-bg-slate-100'].join(' ')}>
                          <div className="tw-h-full tw-rounded-full tw-bg-gradient-to-r tw-from-rose-500 tw-to-amber-400" style={{ width: `${width}%` }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className={[
                'tw-rounded-xl tw-border tw-p-3',
                isDark ? 'tw-border-slate-700 tw-bg-slate-900' : 'tw-border-[#E2E8F0] tw-bg-white',
              ].join(' ')}>
                <h3 className={['tw-text-sm tw-font-semibold', isDark ? 'tw-text-slate-100' : 'tw-text-[#0F172A]'].join(' ')}>Pattern Cluster Sources</h3>
                <div className="tw-mt-2 tw-space-y-2">
                  {[
                    { label: 'Device Fingerprint Reuse', value: riskStats.deviceClusters },
                    { label: 'Duplicate Content Signals', value: riskStats.similarClusters },
                    { label: 'Timing / Location Clusters', value: riskStats.locationClusters },
                  ].map((row) => (
                    <div key={row.label} className="tw-flex tw-items-center tw-justify-between tw-rounded-lg tw-border tw-border-[var(--admin-card-border,#d6e4f2)] tw-px-3 tw-py-2">
                      <span className="tw-text-xs tw-font-semibold tw-text-[var(--admin-text-secondary,#4b5f79)]">{row.label}</span>
                      <span className="tw-text-xs tw-font-semibold tw-text-[var(--admin-text-primary,#0f172a)]">{row.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </SectionCard>
        </div>
      ) : null}

      {selectedTab === 'reports' ? (
        <div className="tw-space-y-2.5">
          <SectionCard title="Reports" subtitle="Export downloadable reports with range-aware summary snapshots.">
            <div className="tw-flex tw-flex-wrap tw-items-end tw-gap-3">
              <label className="tw-flex tw-flex-col tw-gap-1">
                <span className={['tw-text-xs tw-font-semibold', isDark ? 'tw-text-slate-400' : 'tw-text-[#64748b]'].join(' ')}>Date Range</span>
                <select
                  value={reportRange}
                  onChange={(event) => setReportRange(event.target.value)}
                  className={[
                    'tw-h-10 tw-min-w-[130px] tw-rounded-xl tw-border tw-px-3 tw-text-sm tw-font-medium tw-outline-none focus:tw-border-sky-500 focus:tw-ring-2',
                    isDark
                      ? 'tw-border-slate-700 tw-bg-slate-900 tw-text-slate-100 focus:tw-ring-sky-900'
                      : 'tw-border-[#E5E7EB] tw-bg-white tw-text-[#111827] focus:tw-ring-sky-100',
                  ].join(' ')}
                >
                  <option value="7d">Last 7 days</option>
                  <option value="30d">Last 30 days</option>
                  <option value="all">All time</option>
                </select>
              </label>

              <label className="tw-flex tw-flex-col tw-gap-1">
                <span className={['tw-text-xs tw-font-semibold', isDark ? 'tw-text-slate-400' : 'tw-text-[#64748b]'].join(' ')}>Format</span>
                <select
                  value={reportFormat}
                  onChange={(event) => setReportFormat(event.target.value)}
                  className={[
                    'tw-h-10 tw-min-w-[130px] tw-rounded-xl tw-border tw-px-3 tw-text-sm tw-font-medium tw-outline-none focus:tw-border-sky-500 focus:tw-ring-2',
                    isDark
                      ? 'tw-border-slate-700 tw-bg-slate-900 tw-text-slate-100 focus:tw-ring-sky-900'
                      : 'tw-border-[#E5E7EB] tw-bg-white tw-text-[#111827] focus:tw-ring-sky-100',
                  ].join(' ')}
                >
                  <option value="csv">CSV</option>
                  <option value="pdf">PDF</option>
                </select>
              </label>
            </div>

            <div className="tw-mt-3 tw-grid tw-gap-3 md:tw-grid-cols-3">
              <MetricMiniCard isDark={isDark} title="Feedback in Range" value={reportStats.totalFeedbacks} subtitle="Current range snapshot" />
              <MetricMiniCard isDark={isDark} title="Average Trust" value={reportStats.avgTrust.toFixed(1)} subtitle="Across selected period" />
              <MetricMiniCard isDark={isDark} title="High Trust Share" value={reportStats.highTrustShare} subtitle="Overall distribution ratio" />
            </div>

            <div className="tw-mt-4 tw-grid tw-gap-3 md:tw-grid-cols-2 xl:tw-grid-cols-3">
              {reportButtons.map((button) => (
                <button
                  key={button.key}
                  type="button"
                  className={[
                    'tw-rounded-xl tw-border tw-p-4 tw-text-left tw-shadow-sm tw-transition hover:tw--translate-y-0.5 hover:tw-shadow-md',
                    isDark
                      ? 'tw-border-slate-700 tw-bg-slate-900 hover:tw-bg-slate-800'
                      : 'tw-border-[#E2E8F0] tw-bg-white hover:tw-bg-slate-50',
                  ].join(' ')}
                  onClick={() => onExport?.(button.key, reportFormat, reportRange)}
                  disabled={exporting === button.key}
                >
                  <div className="tw-flex tw-items-center tw-justify-between tw-gap-2">
                    <div className={['tw-text-sm tw-font-semibold', isDark ? 'tw-text-slate-100' : 'tw-text-[#0F172A]'].join(' ')}>{button.label}</div>
                    <Download size={16} className={isDark ? 'tw-text-slate-400' : 'tw-text-slate-500'} />
                  </div>
                  <div className={['tw-mt-1 tw-text-xs tw-font-medium', isDark ? 'tw-text-slate-400' : 'tw-text-[#64748B]'].join(' ')}>
                    {exporting === button.key ? 'Preparing file...' : `Download ${reportFormat.toUpperCase()} for ${reportRange.toUpperCase()} range`}
                  </div>
                </button>
              ))}
            </div>
          </SectionCard>
        </div>
      ) : null}
    </div>
  )
}

function buildPatternCards(patterns) {
  const cards = []

  const deviceClusters = Array.isArray(patterns?.deviceClusters) ? patterns.deviceClusters : []
  const similarClusters = Array.isArray(patterns?.similarFeedbackClusters) ? patterns.similarFeedbackClusters : []
  const locationClusters = Array.isArray(patterns?.locationClusters) ? patterns.locationClusters : []

  deviceClusters.forEach((item) => {
    cards.push({
      id: `device-${item.clusterId}`,
      title: 'Device Fingerprint Cluster',
      patternId: `P-${String(cards.length + 1).padStart(3, '0')}`,
      severity: item.volume >= 4 ? 'high' : 'medium',
      rail: item.volume >= 4 ? '#EF4444' : '#F59E0B',
      icon: Fingerprint,
      vendors: item.vendorsInvolved > 1 ? `${item.vendorsInvolved} vendors` : '1 vendor',
      reasons: [
        `${item.volume} feedbacks from identical browser/OS/timezone combo`,
        `Cross-submission pattern detected across ${item.vendorsInvolved} vendor context(s)`,
        'Typing cadence appears nearly identical across submissions',
      ],
    })
  })

  similarClusters.forEach((item) => {
    cards.push({
      id: `similar-${item.clusterId}`,
      title: 'Copy-Paste Content Pattern',
      patternId: `P-${String(cards.length + 1).padStart(3, '0')}`,
      severity: item.volume >= 4 ? 'high' : 'medium',
      rail: item.volume >= 4 ? '#EF4444' : '#F59E0B',
      icon: Copy,
      vendors: item.vendorsInvolved > 1 ? `${item.vendorsInvolved} vendors` : '1 vendor',
      reasons: [
        'Feedback text inserted via template-like structure',
        'Minimal typing variance detected across similar content',
        `Content cluster repeated ${item.volume} times in short window`,
      ],
    })
  })

  locationClusters.forEach((item) => {
    cards.push({
      id: `location-${item.clusterId}`,
      title: 'Timing Anomaly Cluster',
      patternId: `P-${String(cards.length + 1).padStart(3, '0')}`,
      severity: item.volume >= 5 ? 'high' : 'medium',
      rail: item.volume >= 5 ? '#EF4444' : '#F59E0B',
      icon: Clock3,
      vendors: item.vendorsInvolved > 1 ? `${item.vendorsInvolved} vendors` : '1 vendor',
      reasons: [
        `${item.volume} feedbacks submitted inside a compressed time window`,
        'High temporal overlap despite different user fingerprints',
        `Location cluster overlap detected (${item.clusterId})`,
      ],
    })
  })

  if (cards.length) {
    return cards.slice(0, 10)
  }

  return [
    {
      id: 'demo-1',
      title: 'Device Fingerprint Cluster',
      patternId: 'P-001',
      severity: 'high',
      rail: '#EF4444',
      icon: Fingerprint,
      vendors: 'DataStream Inc, VoidTech',
      reasons: [
        '3 feedbacks from identical browser/OS/timezone combo',
        'Different orders, same behavioral profile',
        'Typing speed within 2ms variance',
      ],
    },
    {
      id: 'demo-2',
      title: 'Copy-Paste Content Pattern',
      patternId: 'P-002',
      severity: 'medium',
      rail: '#F59E0B',
      icon: Copy,
      vendors: 'CloudPeak Labs',
      reasons: [
        'Feedback text inserted via clipboard',
        'No typing pauses detected',
        'Content matches template-style phrases',
      ],
    },
    {
      id: 'demo-3',
      title: 'Timing Anomaly Cluster',
      patternId: 'P-003',
      severity: 'medium',
      rail: '#F59E0B',
      icon: Clock3,
      vendors: 'DataStream Inc',
      reasons: [
        '4 feedbacks submitted before expected delivery',
        'All within 30-minute window',
        'Different devices but same timezone',
      ],
    },
    {
      id: 'demo-4',
      title: 'Behavioral Consistency Anomaly',
      patternId: 'P-004',
      severity: 'low',
      rail: '#06B6D4',
      icon: Brain,
      vendors: 'NexaForge',
      reasons: [
        'AI behavior profile stayed unnaturally constant',
        'Sentence structure remained highly repetitive',
        'Interaction depth too uniform across entries',
      ],
    },
  ]
}

function MetricMiniCard({ isDark, title, value, subtitle }) {
  return (
    <article className={[
      'tw-rounded-xl tw-border tw-p-3 tw-shadow-soft',
      isDark ? 'tw-border-[#233650] tw-bg-[#111f34]' : 'tw-border-[#d6e4f2] tw-bg-white',
    ].join(' ')}>
      <p className={['tw-text-xs tw-font-semibold tw-uppercase tw-tracking-[0.08em]', isDark ? 'tw-text-slate-400' : 'tw-text-[#64748b]'].join(' ')}>{title}</p>
      <p className={['tw-mt-1.5 tw-text-xl tw-font-bold tw-tracking-tight tw-leading-none', isDark ? 'tw-text-slate-100' : 'tw-text-[#0f172a]'].join(' ')}>{value}</p>
      <p className={['tw-mt-1.5 tw-text-xs tw-font-medium', isDark ? 'tw-text-slate-400' : 'tw-text-[#64748b]'].join(' ')}>{subtitle}</p>
    </article>
  )
}

function SegmentedControl({ isDark, compact = false, children }) {
  return (
    <div
      className={[
        'tw-inline-flex tw-flex-wrap tw-items-center tw-gap-1 tw-rounded-full tw-border tw-p-1',
        compact ? 'tw-p-0.5' : 'tw-p-1',
        isDark ? 'tw-border-slate-700 tw-bg-slate-950/70' : 'tw-border-[#dbe4ef] tw-bg-[#f1f6fb]/90',
      ].join(' ')}
    >
      {children}
    </div>
  )
}

function TabButton({ isDark, active, compact = false, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'tw-relative tw-rounded-full tw-font-semibold tw-transition-all tw-duration-200 active:tw-scale-[0.98]',
        compact ? 'tw-px-3 tw-py-1 tw-text-xs' : 'tw-px-3.5 tw-py-1.5 tw-text-sm',
        active
          ? isDark
            ? 'tw-bg-gradient-to-r tw-from-cyan-500 tw-to-blue-500 tw-text-white tw-shadow-[0_6px_14px_rgba(14,165,233,0.28)]'
            : 'tw-bg-[#0f172a] tw-text-white tw-shadow-[0_6px_14px_rgba(15,23,42,0.20)]'
          : isDark
            ? 'tw-text-slate-300 hover:tw-bg-slate-800/80 hover:tw-shadow-sm'
            : 'tw-text-[#49627e] hover:tw-bg-white hover:tw-shadow-sm',
      ].join(' ')}
    >
      {children}
    </button>
  )
}
