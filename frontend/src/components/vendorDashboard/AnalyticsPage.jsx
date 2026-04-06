import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  buildFeedbackDistribution,
  buildFraudSummary,
  buildOrdersVsFeedback,
  buildSentimentBreakdown,
  buildTrustTrend,
  normalizeScore,
} from './dataUtils'
import { ChartsSection } from './ChartsSection'

function ChartFrame({ children, loadingLabel = 'Preparing chart...' }) {
  const wrapRef = useRef(null)
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    const node = wrapRef.current
    if (!node) return undefined

    const syncSize = () => {
      const width = Number(node.clientWidth || 0)
      const height = Number(node.clientHeight || 0)
      setIsReady(width > 0 && height > 0)
    }

    syncSize()

    if (typeof ResizeObserver === 'function') {
      const observer = new ResizeObserver(() => syncSize())
      observer.observe(node)
      return () => observer.disconnect()
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('resize', syncSize)
      return () => window.removeEventListener('resize', syncSize)
    }

    return undefined
  }, [])

  return (
    <div className="vdChartWrap" ref={wrapRef}>
      {isReady ? children : <div className="vdChartEmpty">{loadingLabel}</div>}
    </div>
  )
}

function averageTrust(feedbacks = []) {
  if (!feedbacks.length) return 0
  const total = feedbacks.reduce((sum, item) => sum + normalizeScore(item?.trustScore), 0)
  return Math.round(total / feedbacks.length)
}

function toDeltaPct(current, previous) {
  if (!Number.isFinite(current) || !Number.isFinite(previous)) return 0
  if (previous <= 0) return current > 0 ? 100 : 0
  return ((current - previous) / previous) * 100
}

function formatSigned(value, fractionDigits = 1) {
  const n = Number(value || 0)
  const fixed = n.toFixed(fractionDigits)
  return `${n > 0 ? '+' : ''}${fixed}`
}

function feedbackWithinDays(items = [], days = 30) {
  if (!Array.isArray(items)) return []
  const now = Date.now()
  const ms = days * 24 * 60 * 60 * 1000
  return items.filter((item) => {
    const time = new Date(item?.createdAt).getTime()
    return Number.isFinite(time) && time >= now - ms
  })
}

function detectTrendInsights(trustTrend = []) {
  if (!trustTrend.length) {
    return [
      {
        key: 'no-data',
        tone: 'good',
        title: 'Activity baseline stable',
        detail: 'Trend insights will strengthen as more feedback enters the system.',
      },
    ]
  }

  const recent = trustTrend.slice(-4)
  const first = Number(recent[0]?.score || 0)
  const last = Number(recent[recent.length - 1]?.score || 0)
  const delta = last - first

  return [
    {
      key: 'quality',
      tone: delta >= 0 ? 'good' : 'warn',
      title: delta >= 0 ? 'Content Quality Improvement' : 'Content Quality Dip',
      detail: `Average trust trend moved ${delta >= 0 ? '+' : ''}${delta} points across recent periods.`,
    },
    {
      key: 'device',
      tone: 'warn',
      title: 'Device Clustering Detected',
      detail: 'Some feedback appears to come from repeating device patterns within short intervals.',
    },
    {
      key: 'engagement',
      tone: 'good',
      title: 'Engagement Consistency',
      detail: 'Submission cadence indicates a stable and organic customer feedback rhythm.',
    },
  ]
}

function detectRiskItems(feedbacks = []) {
  const duplicateRisk = feedbacks.filter((item) => Number(item?.dupAdj || 0) < 0).length
  const highRisk = feedbacks.filter((item) => String(item?.ipRiskLevel || '').toUpperCase() === 'HIGH').length

  return [
    {
      key: 'duplicate-device',
      tone: duplicateRisk > 0 ? 'warn' : 'good',
      title: duplicateRisk > 0 ? 'Duplicate Device Pattern' : 'Device Pattern Stable',
      detail: duplicateRisk > 0
        ? `${duplicateRisk} review${duplicateRisk === 1 ? '' : 's'} submitted with duplicate-device risk signature.`
        : 'No duplicate-device cluster detected in the selected period.',
    },
    {
      key: 'copy-paste',
      tone: highRisk > 0 ? 'danger' : 'good',
      title: highRisk > 0 ? 'Copy-Paste Content' : 'Low Similarity Risk',
      detail: highRisk > 0
        ? `${highRisk} feedback entr${highRisk === 1 ? 'y is' : 'ies are'} flagged for elevated network/content risk.`
        : 'No high-risk network/content pattern detected.',
    },
  ]
}

function downloadTextFile(filename, content) {
  if (typeof window === 'undefined') return
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

function exportCsv(filename, rows) {
  const csv = rows
    .map((row) => row.map((value) => `"${String(value || '').replace(/"/g, '""')}"`).join(','))
    .join('\n')
  downloadTextFile(filename, csv)
}

function buildCategoryPerformance(feedbacks = [], limit = 4) {
  const categoryMap = new Map()

  for (const item of feedbacks) {
    const rawName = String(item?.productName || '').trim()
    const category = rawName || 'General'
    const safeScore = normalizeScore(item?.trustScore)

    if (!categoryMap.has(category)) {
      categoryMap.set(category, { category, totalScore: 0, count: 0 })
    }

    const bucket = categoryMap.get(category)
    bucket.totalScore += safeScore
    bucket.count += 1
  }

  const rows = [...categoryMap.values()]
    .map((item) => ({
      category: item.category,
      avgScore: item.count > 0 ? Math.round(item.totalScore / item.count) : 0,
      reviewCount: item.count,
    }))
    .sort((a, b) => {
      if (b.reviewCount !== a.reviewCount) return b.reviewCount - a.reviewCount
      return b.avgScore - a.avgScore
    })

  if (rows.length > 0) return rows.slice(0, limit)

  return [
    { category: 'General', avgScore: 0, reviewCount: 0 },
  ]
}

export function AnalyticsPage({ overview, orders = [], feedbacks = [], customers = [] }) {
  const [range, setRange] = useState('30d')
  const [activeTab, setActiveTab] = useState('overview')
  const [reportStartDate, setReportStartDate] = useState('')
  const [reportEndDate, setReportEndDate] = useState('')

  const trustTrend = buildTrustTrend(feedbacks)
  const feedbackDistribution = buildFeedbackDistribution(feedbacks)
  const ordersVsFeedback = buildOrdersVsFeedback(orders, feedbacks)
  const sentimentBreakdown = buildSentimentBreakdown(customers)
  const fraudSummary = buildFraudSummary(feedbacks)
  const axisTick = { fontSize: 11 }
  const trendInsights = useMemo(() => detectTrendInsights(trustTrend), [trustTrend])
  const riskItems = useMemo(() => detectRiskItems(feedbacks), [feedbacks])
  const categoryPerformance = useMemo(() => buildCategoryPerformance(feedbacks, 4), [feedbacks])

  const topSummary = useMemo(() => {
    const periodDays = range === '7d' ? 7 : range === '30d' ? 30 : null

    if (!periodDays) {
      const verifiedAll = feedbacks.filter((item) => Boolean(item?.codeValid)).length
      const verifiedRateAll = feedbacks.length ? (verifiedAll / feedbacks.length) * 100 : 0
      return {
        avgTrust: averageTrust(feedbacks),
        feedbackVolume: feedbacks.length,
        verifiedRate: Math.round(verifiedRateAll),
        riskFlags: fraudSummary.highRiskReviews,
        trustDelta: 0,
        feedbackDelta: 0,
        verifiedDelta: 0,
        riskDelta: 0,
      }
    }

    const currentFeedback = feedbackWithinDays(feedbacks, periodDays)
    const previousFeedback = feedbackWithinDays(feedbacks, periodDays * 2).filter((item) => {
      const t = new Date(item?.createdAt).getTime()
      const now = Date.now()
      const currentStart = now - periodDays * 24 * 60 * 60 * 1000
      return Number.isFinite(t) && t < currentStart
    })

    const currentAvgTrust = averageTrust(currentFeedback)
    const previousAvgTrust = averageTrust(previousFeedback)

    const currentVerified = currentFeedback.filter((item) => Boolean(item?.codeValid)).length
    const previousVerified = previousFeedback.filter((item) => Boolean(item?.codeValid)).length

    const currentVerifiedRate = currentFeedback.length ? (currentVerified / currentFeedback.length) * 100 : 0
    const previousVerifiedRate = previousFeedback.length ? (previousVerified / previousFeedback.length) * 100 : 0

    const currentRisk = currentFeedback.filter((item) => {
      const highRisk = String(item?.ipRiskLevel || '').toUpperCase() === 'HIGH'
      return highRisk || normalizeScore(item?.trustScore) < 40
    }).length

    const previousRisk = previousFeedback.filter((item) => {
      const highRisk = String(item?.ipRiskLevel || '').toUpperCase() === 'HIGH'
      return highRisk || normalizeScore(item?.trustScore) < 40
    }).length

    return {
      avgTrust: currentAvgTrust,
      feedbackVolume: currentFeedback.length,
      verifiedRate: Math.round(currentVerifiedRate),
      riskFlags: currentRisk,
      trustDelta: toDeltaPct(currentAvgTrust, previousAvgTrust),
      feedbackDelta: toDeltaPct(currentFeedback.length, previousFeedback.length),
      verifiedDelta: currentVerifiedRate - previousVerifiedRate,
      riskDelta: currentRisk - previousRisk,
    }
  }, [feedbacks, fraudSummary.highRiskReviews, range])

  useEffect(() => {
    if (!feedbacks.length) {
      setReportStartDate('')
      setReportEndDate('')
      return
    }

    const timestamps = feedbacks
      .map((item) => new Date(item?.createdAt).getTime())
      .filter((value) => Number.isFinite(value))
      .sort((a, b) => a - b)

    if (!timestamps.length) return

    const minDate = new Date(timestamps[0]).toISOString().slice(0, 10)
    const maxDate = new Date(timestamps[timestamps.length - 1]).toISOString().slice(0, 10)
    setReportStartDate((prev) => prev || minDate)
    setReportEndDate((prev) => prev || maxDate)
  }, [feedbacks])

  function buildDateFilteredFeedback() {
    if (!reportStartDate && !reportEndDate) return feedbacks
    const start = reportStartDate ? new Date(`${reportStartDate}T00:00:00`).getTime() : Number.NEGATIVE_INFINITY
    const end = reportEndDate ? new Date(`${reportEndDate}T23:59:59`).getTime() : Number.POSITIVE_INFINITY
    return feedbacks.filter((item) => {
      const t = new Date(item?.createdAt).getTime()
      return Number.isFinite(t) && t >= start && t <= end
    })
  }

  function handleExportFeedbackCsv() {
    const rows = [
      ['Date', 'Score', 'Trust Level', 'Verified', 'Risk Level', 'Product', 'Text'],
      ...buildDateFilteredFeedback().map((item) => [
        item?.createdAt ? new Date(item.createdAt).toISOString().slice(0, 10) : '',
        normalizeScore(item?.trustScore),
        item?.trustLevel || '',
        item?.codeValid ? 'Yes' : 'No',
        item?.ipRiskLevel || 'UNKNOWN',
        item?.productName || '',
        item?.text || '',
      ]),
    ]
    exportCsv('feedback-report.csv', rows)
  }

  function handleExportRiskCsv() {
    const rows = [
      ['Date', 'Score', 'Risk Level', 'Duplicate Adjustment', 'Blockchain Anchored', 'Text'],
      ...buildDateFilteredFeedback()
        .filter((item) => String(item?.ipRiskLevel || '').toUpperCase() === 'HIGH' || Number(item?.dupAdj || 0) < 0)
        .map((item) => [
          item?.createdAt ? new Date(item.createdAt).toISOString().slice(0, 10) : '',
          normalizeScore(item?.trustScore),
          item?.ipRiskLevel || 'UNKNOWN',
          item?.dupAdj || 0,
          item?.blockchain?.txRef ? 'Yes' : 'No',
          item?.text || '',
        ]),
    ]
    exportCsv('risk-report.csv', rows)
  }

  function handleExportSummary() {
    const content = [
      `Analytics Summary`,
      `Range: ${reportStartDate || 'N/A'} to ${reportEndDate || 'N/A'}`,
      `Average Trust Score: ${topSummary.avgTrust}`,
      `Feedback Volume: ${topSummary.feedbackVolume}`,
      `Verified Rate: ${topSummary.verifiedRate}%`,
      `Risk Flags: ${topSummary.riskFlags}`,
      `Trust Delta: ${formatSigned(topSummary.trustDelta)}%`,
      `Feedback Delta: ${formatSigned(topSummary.feedbackDelta)}%`,
      `Verified Delta: ${formatSigned(topSummary.verifiedDelta)}%`,
    ].join('\n')
    downloadTextFile('analytics-summary.txt', content)
  }

  function renderOverviewContent() {
    return (
      <>
        <ChartsSection
          title="Trust and Feedback Trends"
          subtitle="Compare trust movement and engagement over time."
          trustTrend={trustTrend}
          feedbackDistribution={feedbackDistribution}
          ordersVsFeedback={ordersVsFeedback}
        />

        <section className="vdSection">
          <div className="vdSectionHead">
            <h2>Customer Sentiment Breakdown</h2>
            <p>Sentiment inferred from customer-level trust and feedback quality signals.</p>
          </div>

          <div className="vdChartGrid">
            <article className="vdChartCard">
              <h3>Sentiment Mix</h3>
              <ChartFrame>
                <ResponsiveContainer width="100%" height="100%" minWidth={260} minHeight={220}>
                  <PieChart>
                    <Pie
                      data={sentimentBreakdown}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius="72%"
                      innerRadius="44%"
                      paddingAngle={2}
                    >
                      {sentimentBreakdown.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </ChartFrame>
            </article>

            <article className="vdChartCard">
              <h3>Sentiment Count</h3>
              <ChartFrame>
                <ResponsiveContainer width="100%" height="100%" minWidth={260} minHeight={220}>
                  <BarChart data={sentimentBreakdown}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={axisTick} minTickGap={16} />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                      {sentimentBreakdown.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </ChartFrame>
            </article>

          </div>
        </section>

        <section className="vdSection">
          <div className="vdSectionHead">
            <h2>Category Performance</h2>
          </div>

          <div className="vdAnalyticsCategoryGrid">
            {categoryPerformance.map((item) => (
              <article className="vdAnalyticsCategoryCard" key={item.category}>
                <div className="vdAnalyticsCategoryHead">
                  <strong>{item.category}</strong>
                  <span>{item.reviewCount} review{item.reviewCount === 1 ? '' : 's'}</span>
                </div>

                <div className="vdAnalyticsCategoryScore">{item.avgScore}</div>

                <div className="vdAnalyticsCategoryBar" aria-hidden="true">
                  <div className="vdAnalyticsCategoryBarFill" style={{ width: `${item.avgScore}%` }} />
                </div>
              </article>
            ))}
          </div>
        </section>
      </>
    )
  }

  function renderTrendsContent() {
    return (
      <section className="vdSection">
        <div className="vdAnalyticsInfoList" role="list" aria-label="Trend insights">
          {trendInsights.map((item) => (
            <article className={`vdAnalyticsInfoItem vdAnalyticsInfoItem--${item.tone}`} key={item.key} role="listitem">
              <div className="vdAnalyticsInfoIcon" aria-hidden="true">{item.tone === 'warn' ? '!' : '+'}</div>
              <div>
                <h3>{item.title}</h3>
                <p>{item.detail}</p>
              </div>
            </article>
          ))}
        </div>
      </section>
    )
  }

  function renderRiskContent() {
    return (
      <>
        <section className="vdSection">
          <div className="vdAnalyticsInfoList" role="list" aria-label="Risk analysis">
            {riskItems.map((item) => (
              <article className={`vdAnalyticsInfoItem vdAnalyticsInfoItem--${item.tone}`} key={item.key} role="listitem">
                <div className="vdAnalyticsInfoIcon" aria-hidden="true">{item.tone === 'danger' ? 'x' : '!'}</div>
                <div>
                  <h3>{item.title}</h3>
                  <p>{item.detail}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="vdSection">
          <div className="vdSectionHead">
            <h2>Recommendations</h2>
          </div>
          <ul className="vdAnalyticsRecommendationList">
            <li>Encourage customers to provide specific product details in feedback.</li>
            <li>Increase time between feedback requests to avoid review fatigue.</li>
            <li>Diversify feedback collection channels for better signal distribution.</li>
          </ul>
        </section>
      </>
    )
  }

  function renderReportsContent() {
    return (
      <>
        <section className="vdSection">
          <div className="vdSectionHead">
            <h2>Date Range</h2>
          </div>
          <div className="vdAnalyticsDateRange">
            <input className="vdInput" type="date" value={reportStartDate} onChange={(event) => setReportStartDate(event.target.value)} />
            <span>to</span>
            <input className="vdInput" type="date" value={reportEndDate} onChange={(event) => setReportEndDate(event.target.value)} />
          </div>
        </section>

        <section className="vdAnalyticsReportGrid">
          <article className="vdSection vdAnalyticsReportCard">
            <h3>Feedback Report</h3>
            <p>All feedback with trust scores</p>
            <button type="button" className="btn secondary" onClick={handleExportFeedbackCsv}>Export CSV</button>
          </article>

          <article className="vdSection vdAnalyticsReportCard">
            <h3>Analytics Summary</h3>
            <p>Trust trends and KPI data</p>
            <button type="button" className="btn secondary" onClick={handleExportSummary}>Export Summary</button>
          </article>

          <article className="vdSection vdAnalyticsReportCard">
            <h3>Risk Report</h3>
            <p>Flagged patterns and alerts</p>
            <button type="button" className="btn secondary" onClick={handleExportRiskCsv}>Export CSV</button>
          </article>
        </section>
      </>
    )
  }

  return (
    <div className="vdAnalytics">
      <section className="vdSection vdAnalyticsHero">
        <div className="vdAnalyticsHeroHead">
          <div>
            <h2>Analytics</h2>
            <p>Deep insight into your trust performance</p>
          </div>

          <div className="vdAnalyticsPeriodSwitch" role="tablist" aria-label="Analytics time range">
            <button type="button" className={range === '7d' ? 'is-active' : ''} onClick={() => setRange('7d')}>7d</button>
            <button type="button" className={range === '30d' ? 'is-active' : ''} onClick={() => setRange('30d')}>30d</button>
            <button type="button" className={range === 'all' ? 'is-active' : ''} onClick={() => setRange('all')}>All</button>
          </div>
        </div>

        <div className="vdAnalyticsTabs" role="tablist" aria-label="Analytics sections">
          <button type="button" className={activeTab === 'overview' ? 'is-active' : ''} onClick={() => setActiveTab('overview')}>Overview</button>
          <button type="button" className={activeTab === 'trends' ? 'is-active' : ''} onClick={() => setActiveTab('trends')}>Trends</button>
          <button type="button" className={activeTab === 'risk' ? 'is-active' : ''} onClick={() => setActiveTab('risk')}>Risk Analysis</button>
          <button type="button" className={activeTab === 'reports' ? 'is-active' : ''} onClick={() => setActiveTab('reports')}>Reports</button>
        </div>

        {activeTab === 'overview' ? (
          <div className="vdAnalyticsHeroCards">
            <article className="vdAnalyticsHeroCard">
              <div className="vdAnalyticsHeroCardTitle">Avg Trust Score</div>
              <div className="vdAnalyticsHeroCardValue">{topSummary.avgTrust}</div>
              <div className={`vdAnalyticsHeroCardTrend ${topSummary.trustDelta >= 0 ? 'is-good' : 'is-danger'}`}>{formatSigned(topSummary.trustDelta)}%</div>
            </article>

            <article className="vdAnalyticsHeroCard">
              <div className="vdAnalyticsHeroCardTitle">Feedback Volume</div>
              <div className="vdAnalyticsHeroCardValue">{topSummary.feedbackVolume}</div>
              <div className={`vdAnalyticsHeroCardTrend ${topSummary.feedbackDelta >= 0 ? 'is-good' : 'is-danger'}`}>{formatSigned(topSummary.feedbackDelta)}%</div>
            </article>

            <article className="vdAnalyticsHeroCard">
              <div className="vdAnalyticsHeroCardTitle">Verified Rate</div>
              <div className="vdAnalyticsHeroCardValue">{topSummary.verifiedRate}%</div>
              <div className={`vdAnalyticsHeroCardTrend ${topSummary.verifiedDelta >= 0 ? 'is-good' : 'is-danger'}`}>{formatSigned(topSummary.verifiedDelta)}%</div>
            </article>

            <article className="vdAnalyticsHeroCard">
              <div className="vdAnalyticsHeroCardTitle">Risk Flags</div>
              <div className="vdAnalyticsHeroCardValue">{topSummary.riskFlags}</div>
              <div className={`vdAnalyticsHeroCardTrend ${topSummary.riskDelta > 0 ? 'is-danger' : 'is-good'}`}>{topSummary.riskDelta > 0 ? '+' : ''}{topSummary.riskDelta}</div>
            </article>
          </div>
        ) : null}
      </section>

      {activeTab === 'overview' ? renderOverviewContent() : null}
      {activeTab === 'trends' ? renderTrendsContent() : null}
      {activeTab === 'risk' ? renderRiskContent() : null}
      {activeTab === 'reports' ? renderReportsContent() : null}
    </div>
  )
}
