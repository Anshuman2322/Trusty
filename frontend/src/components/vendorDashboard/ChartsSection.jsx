import { useEffect, useRef, useState } from 'react'
import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

function hasPieData(data = []) {
  return data.some((item) => Number(item?.value || 0) > 0)
}

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

export function ChartsSection({
  trustTrend = [],
  feedbackDistribution = [],
  ordersVsFeedback = [],
  title = 'Analytics',
  subtitle = 'Visualize trust and feedback performance over time.',
}) {
  const axisTick = { fontSize: 11 }

  return (
    <section className="vdSection">
      <div className="vdSectionHead">
        <h2>{title}</h2>
        <p>{subtitle}</p>
      </div>

      <div className="vdChartGrid">
        <article className="vdChartCard">
          <h3>Trust Score Trend</h3>
          <ChartFrame>
            <ResponsiveContainer width="100%" height="100%" minWidth={260} minHeight={220}>
              <LineChart data={trustTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" tick={axisTick} minTickGap={18} />
                <YAxis domain={[0, 100]} />
                <Tooltip formatter={(value) => [`${value}`, 'Trust Score']} />
                <Area type="monotone" dataKey="score" stroke="none" fill="#5B61EA" fillOpacity={0.16} />
                <Line type="monotone" dataKey="score" stroke="#5B61EA" strokeWidth={4} dot={false} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </ChartFrame>
        </article>

        <article className="vdChartCard">
          <h3>Feedback Distribution</h3>
          <ChartFrame>
            {hasPieData(feedbackDistribution) ? (
              <ResponsiveContainer width="100%" height="100%" minWidth={260} minHeight={220}>
                <PieChart>
                  <Pie
                    data={feedbackDistribution}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius="72%"
                    innerRadius="44%"
                    paddingAngle={2}
                  >
                    {feedbackDistribution.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value, name) => [`${value}`, name]} />
                  <Legend verticalAlign="bottom" height={26} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="vdChartEmpty">No feedback distribution data yet.</div>
            )}
          </ChartFrame>
        </article>

        <article className="vdChartCard vdChartCard--wide">
          <h3>Orders vs Feedback</h3>
          <ChartFrame>
            <ResponsiveContainer width="100%" height="100%" minWidth={260} minHeight={220}>
              <BarChart data={ordersVsFeedback}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" tick={axisTick} minTickGap={18} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Legend />
                <Bar dataKey="orders" fill="#0ea5b7" radius={[6, 6, 0, 0]} name="Orders" />
                <Bar dataKey="feedback" fill="#4f46e5" radius={[6, 6, 0, 0]} name="Feedback" />
              </BarChart>
            </ResponsiveContainer>
          </ChartFrame>
        </article>
      </div>
    </section>
  )
}
