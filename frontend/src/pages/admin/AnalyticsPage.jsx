import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar } from 'recharts'
import { AnalyticsChart, SectionCard } from '../../components/admin/AdminUi'

const pieColors = ['#16a34a', '#f59e0b', '#dc2626', '#475569']

export function AnalyticsPage({ isDark, analytics }) {
  const trend = analytics?.trustScoreTrend || []
  const distribution = analytics?.feedbackDistribution || []
  const vendorPerformance = analytics?.vendorPerformance || []

  return (
    <div className="tw-space-y-6 lg:tw-space-y-8">
      <SectionCard title="Trust Score Trend" subtitle="Platform-wide trust evolution over time.">
        <AnalyticsChart isDark={isDark}>
          <ResponsiveContainer width="100%" height="100%" minWidth={240} minHeight={220}>
            <LineChart data={trend}>
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

      <div className="tw-grid tw-gap-6 xl:tw-grid-cols-2">
        <SectionCard title="Feedback Distribution" subtitle="Trust-level breakdown across all feedback.">
          <AnalyticsChart isDark={isDark}>
            <ResponsiveContainer width="100%" height="100%" minWidth={240} minHeight={220}>
              <PieChart>
                <Pie data={distribution} dataKey="count" nameKey="level" innerRadius={60} outerRadius={100}>
                  {distribution.map((entry, idx) => (
                    <Cell key={entry.level} fill={pieColors[idx % pieColors.length]} />
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
        </SectionCard>

        <SectionCard title="Vendor Performance" subtitle="Top vendors by trust score.">
          <AnalyticsChart isDark={isDark}>
            <ResponsiveContainer width="100%" height="100%" minWidth={240} minHeight={220}>
              <BarChart data={vendorPerformance}>
                <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#334155' : '#dbe4ef'} />
                <XAxis dataKey="vendorName" tick={{ fontSize: 11, fill: isDark ? '#94a3b8' : '#64748B' }} interval={0} angle={-18} textAnchor="end" height={70} />
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
                <Bar dataKey="averageTrust" fill="#0ea5e9" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </AnalyticsChart>
        </SectionCard>
      </div>
    </div>
  )
}
