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

export function AnalyticsPage({ overview, orders = [], feedbacks = [], customers = [] }) {
  const trustTrend = buildTrustTrend(feedbacks)
  const feedbackDistribution = buildFeedbackDistribution(feedbacks)
  const ordersVsFeedback = buildOrdersVsFeedback(orders, feedbacks)
  const sentimentBreakdown = buildSentimentBreakdown(customers)
  const fraudSummary = buildFraudSummary(feedbacks)
  const axisTick = { fontSize: 11 }

  return (
    <div className="vdAnalytics">
      <section className="vdSection">
        <div className="vdSectionHead">
          <h2>Analytics</h2>
          <p>Trust score trends, feedback behavior, customer sentiment, and fraud summary.</p>
        </div>

        <div className="vdCardGrid vdCardGrid--analyticsMeta">
          <article className="vdKpiCard">
            <h3>Average Trust Score</h3>
            <div className="vdKpiValue">{normalizeScore(overview?.averageTrustScore)}</div>
            <p>Live average across all submitted feedback.</p>
          </article>
          <article className="vdKpiCard">
            <h3>Total Feedback Volume</h3>
            <div className="vdKpiValue">{feedbacks.length}</div>
            <p>Signals flowing into trust scoring engine.</p>
          </article>
          <article className="vdKpiCard">
            <h3>Risk Signals</h3>
            <div className="vdKpiValue">{fraudSummary.totalRiskSignals}</div>
            <p>Aggregated warning clusters from fraud monitoring.</p>
          </article>
        </div>
      </section>

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
            <div className="vdChartWrap">
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
            </div>
          </article>

          <article className="vdChartCard">
            <h3>Sentiment Count</h3>
            <div className="vdChartWrap">
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
            </div>
          </article>

          <article className="vdChartCard vdChartCard--wide">
            <h3>Fraud Detection Summary</h3>
            <div className="vdFraudSummary">
              <div>
                <span>High Risk Reviews</span>
                <strong>{fraudSummary.highRiskReviews}</strong>
              </div>
              <div>
                <span>Low Trust Reviews</span>
                <strong>{fraudSummary.lowTrustReviews}</strong>
              </div>
              <div>
                <span>Risk Signal Clusters</span>
                <strong>{fraudSummary.totalRiskSignals}</strong>
              </div>
            </div>
          </article>
        </div>
      </section>
    </div>
  )
}
