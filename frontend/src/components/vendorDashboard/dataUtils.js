function toDate(value) {
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? null : d
}

export function normalizeScore(value) {
  const n = Number(value)
  if (Number.isNaN(n)) return 0
  return Math.max(0, Math.min(100, Math.round(n)))
}

export function trustLabel(score) {
  const n = normalizeScore(score)
  if (n >= 70) return 'High Trust'
  if (n >= 40) return 'Medium Trust'
  return 'Low Trust'
}

export function trustTone(score) {
  const n = normalizeScore(score)
  if (n >= 70) return 'high'
  if (n >= 40) return 'medium'
  return 'low'
}

export function mapFeedbackByOrderId(feedbacks = []) {
  const map = new Map()

  for (const feedback of feedbacks) {
    if (!feedback?.orderId) continue
    const key = String(feedback.orderId)
    const existing = map.get(key)

    if (!existing) {
      map.set(key, feedback)
      continue
    }

    const existingTime = new Date(existing.createdAt).getTime() || 0
    const currentTime = new Date(feedback.createdAt).getTime() || 0
    if (currentTime > existingTime) map.set(key, feedback)
  }

  return map
}

function dateKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function shortDateLabel(d) {
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function buildTrustTrend(feedbacks = [], maxPoints = 10) {
  const grouped = new Map()

  for (const item of feedbacks) {
    const d = toDate(item?.createdAt)
    if (!d) continue
    const key = dateKey(d)
    const list = grouped.get(key) || []
    list.push(normalizeScore(item?.trustScore))
    grouped.set(key, list)
  }

  const rows = [...grouped.entries()]
    .map(([key, scores]) => {
      const [year, month, day] = key.split('-').map((v) => Number(v))
      const d = new Date(year, month - 1, day)
      const avg = scores.length
        ? Math.round(scores.reduce((sum, n) => sum + n, 0) / scores.length)
        : 0
      return { date: d, label: shortDateLabel(d), score: avg }
    })
    .sort((a, b) => a.date - b.date)

  const trimmed = rows.slice(-maxPoints)
  if (trimmed.length) return trimmed

  const today = new Date()
  return Array.from({ length: 7 }).map((_, idx) => {
    const d = new Date(today)
    d.setDate(today.getDate() - (6 - idx))
    return { date: d, label: shortDateLabel(d), score: 0 }
  })
}

export function buildFeedbackDistribution(feedbacks = []) {
  const distribution = { high: 0, medium: 0, low: 0 }

  for (const item of feedbacks) {
    const score = normalizeScore(item?.trustScore)
    if (score >= 70) distribution.high += 1
    else if (score >= 40) distribution.medium += 1
    else distribution.low += 1
  }

  return [
    { name: 'High Trust', value: distribution.high, color: '#10b981' },
    { name: 'Medium Trust', value: distribution.medium, color: '#f59e0b' },
    { name: 'Low Trust', value: distribution.low, color: '#ef4444' },
  ]
}

function monthKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function monthLabel(d) {
  return d.toLocaleString(undefined, { month: 'short' })
}

export function buildOrdersVsFeedback(orders = [], feedbacks = []) {
  const now = new Date()
  const months = []

  for (let i = 5; i >= 0; i -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    months.push({
      key: monthKey(d),
      label: monthLabel(d),
      orders: 0,
      feedback: 0,
    })
  }

  const monthMap = new Map(months.map((m) => [m.key, m]))

  for (const order of orders) {
    const d = toDate(order?.createdAt)
    if (!d) continue
    const bucket = monthMap.get(monthKey(d))
    if (bucket) bucket.orders += 1
  }

  for (const feedback of feedbacks) {
    const d = toDate(feedback?.createdAt)
    if (!d) continue
    const bucket = monthMap.get(monthKey(d))
    if (bucket) bucket.feedback += 1
  }

  return months
}

export function buildQuickInsights({ orders = [], feedbacks = [], averageTrustScore = 0 }) {
  const now = Date.now()
  const weekMs = 7 * 24 * 60 * 60 * 1000

  const thisWeek = feedbacks.filter((f) => {
    const t = new Date(f?.createdAt).getTime()
    return t && t >= now - weekMs
  })

  const previousWeek = feedbacks.filter((f) => {
    const t = new Date(f?.createdAt).getTime()
    return t && t >= now - 2 * weekMs && t < now - weekMs
  })

  const thisAvg = thisWeek.length
    ? thisWeek.reduce((sum, item) => sum + normalizeScore(item?.trustScore), 0) / thisWeek.length
    : 0
  const prevAvg = previousWeek.length
    ? previousWeek.reduce((sum, item) => sum + normalizeScore(item?.trustScore), 0) / previousWeek.length
    : 0

  const trustDeltaPct = prevAvg > 0 ? Math.round(((thisAvg - prevAvg) / prevAvg) * 100) : 0
  const suspiciousCount = feedbacks.filter((f) => {
    const lowScore = normalizeScore(f?.trustScore) < 40
    return lowScore || String(f?.ipRiskLevel || '').toUpperCase() === 'HIGH'
  }).length

  const customerFrequency = new Map()
  for (const order of orders) {
    const key = String(order?.email || order?.customerName || '').trim().toLowerCase()
    if (!key) continue
    customerFrequency.set(key, (customerFrequency.get(key) || 0) + 1)
  }

  const repeatCustomers = [...customerFrequency.values()].filter((count) => count > 1).length
  const lowTrustCount = feedbacks.filter((f) => normalizeScore(f?.trustScore) < 40).length

  return [
    {
      key: 'trust-delta',
      icon: 'TREND',
      tone: trustDeltaPct >= 0 ? 'good' : 'warn',
      title: `${trustDeltaPct >= 0 ? '+' : ''}${trustDeltaPct}% trust score change this week`,
      detail: `Current average trust score is ${normalizeScore(averageTrustScore)}.`,
    },
    {
      key: 'suspicious',
      icon: 'RISK',
      tone: suspiciousCount > 0 ? 'warn' : 'good',
      title: `${suspiciousCount} suspicious feedback detected`,
      detail: 'Risk patterns are monitored instead of hidden.',
    },
    {
      key: 'repeat-customers',
      icon: 'LOYAL',
      tone: repeatCustomers > 0 ? 'good' : 'neutral',
      title: `${repeatCustomers} repeat customers identified`,
      detail: 'Customer loyalty signal derived from order frequency.',
    },
    {
      key: 'low-trust',
      icon: 'ALERT',
      tone: lowTrustCount > 0 ? 'danger' : 'good',
      title: `${lowTrustCount} low trust review needs attention`,
      detail: 'Investigate details and response strategy.',
    },
  ]
}

export function buildAlerts(feedbacks = []) {
  const deviceCount = new Map()
  const networkCount = new Map()
  let suspiciousPatternCount = 0

  for (const feedback of feedbacks) {
    const device = String(feedback?.deviceFingerprintHash || feedback?.deviceHash || '').trim()
    const network = String(feedback?.ipHash || '').trim()

    if (device) deviceCount.set(device, (deviceCount.get(device) || 0) + 1)
    if (network) networkCount.set(network, (networkCount.get(network) || 0) + 1)

    const lowScore = normalizeScore(feedback?.trustScore) < 40
    const highRisk = String(feedback?.ipRiskLevel || '').toUpperCase() === 'HIGH'
    if (lowScore || highRisk) suspiciousPatternCount += 1
  }

  const repeatedDeviceReviews = [...deviceCount.values()].filter((count) => count > 1).reduce((a, b) => a + b, 0)
  const unusualNetworkBursts = [...networkCount.values()].filter((count) => count >= 3).length

  return [
    {
      key: 'repeated-device',
      severity: repeatedDeviceReviews > 0 ? 'warning' : 'safe',
      message: `Repeated device detected (${repeatedDeviceReviews} reviews)`,
    },
    {
      key: 'suspicious-pattern',
      severity: suspiciousPatternCount > 0 ? 'danger' : 'safe',
      message: `Suspicious feedback pattern detected (${suspiciousPatternCount})`,
    },
    {
      key: 'network-burst',
      severity: unusualNetworkBursts > 0 ? 'warning' : 'safe',
      message: `Unusual activity from same network (${unusualNetworkBursts} network clusters)`,
    },
  ]
}

function getSentiment(avgTrust) {
  if (avgTrust >= 70) return 'Positive'
  if (avgTrust >= 40) return 'Neutral'
  return 'Negative'
}

function getPurchaseProbability(orderCount, avgTrust) {
  if (orderCount >= 3 || avgTrust >= 70) return 'High'
  if (orderCount >= 2 || avgTrust >= 40) return 'Medium'
  return 'Low'
}

function getFeedbackQuality(avgLength, avgContextScore) {
  if (avgLength >= 120 || avgContextScore >= 9) return 'Detailed'
  return 'Generic'
}

export function buildCustomerInsights(orders = [], feedbacks = []) {
  const byOrderId = new Map()
  for (const feedback of feedbacks) {
    if (!feedback?.orderId) continue
    byOrderId.set(String(feedback.orderId), feedback)
  }

  const customerMap = new Map()

  for (const order of orders) {
    const customerKey = String(order?.email || order?.customerName || '').trim().toLowerCase()
    if (!customerKey) continue

    if (!customerMap.has(customerKey)) {
      customerMap.set(customerKey, {
        customerName: order?.customerName || 'Customer',
        email: order?.email || 'N/A',
        orderCount: 0,
        trustScores: [],
        feedbackLengths: [],
        contextScores: [],
        lastOrderAt: order?.createdAt,
      })
    }

    const record = customerMap.get(customerKey)
    record.orderCount += 1

    const orderTime = new Date(order?.createdAt).getTime() || 0
    const existingTime = new Date(record.lastOrderAt).getTime() || 0
    if (orderTime > existingTime) record.lastOrderAt = order?.createdAt

    const feedback = byOrderId.get(String(order._id))
    if (feedback) {
      record.trustScores.push(normalizeScore(feedback?.trustScore))
      record.feedbackLengths.push(String(feedback?.text || '').trim().length)
      record.contextScores.push(Number(feedback?.trustBreakdown?.contextDepth?.score || 0))
    }
  }

  const customers = [...customerMap.values()].map((record) => {
    const avgTrust = record.trustScores.length
      ? record.trustScores.reduce((sum, score) => sum + score, 0) / record.trustScores.length
      : 50
    const avgLength = record.feedbackLengths.length
      ? record.feedbackLengths.reduce((sum, len) => sum + len, 0) / record.feedbackLengths.length
      : 0
    const avgContextScore = record.contextScores.length
      ? record.contextScores.reduce((sum, n) => sum + n, 0) / record.contextScores.length
      : 0

    return {
      customerName: record.customerName,
      email: record.email,
      orders: record.orderCount,
      sentiment: getSentiment(avgTrust),
      nextPurchaseProbability: getPurchaseProbability(record.orderCount, avgTrust),
      feedbackQuality: getFeedbackQuality(avgLength, avgContextScore),
      averageTrust: Math.round(avgTrust),
      lastOrderAt: record.lastOrderAt,
    }
  })

  return customers.sort((a, b) => b.orders - a.orders)
}

export function buildSentimentBreakdown(customers = []) {
  const counts = { Positive: 0, Neutral: 0, Negative: 0 }
  for (const customer of customers) {
    counts[customer.sentiment] = (counts[customer.sentiment] || 0) + 1
  }

  return [
    { name: 'Positive', value: counts.Positive, color: '#10b981' },
    { name: 'Neutral', value: counts.Neutral, color: '#f59e0b' },
    { name: 'Negative', value: counts.Negative, color: '#ef4444' },
  ]
}

export function buildFraudSummary(feedbacks = []) {
  const alerts = buildAlerts(feedbacks)
  const totalRiskSignals = alerts.filter((item) => item.severity !== 'safe').length
  const highRiskReviews = feedbacks.filter((item) => String(item?.ipRiskLevel || '').toUpperCase() === 'HIGH').length
  const lowTrustReviews = feedbacks.filter((item) => normalizeScore(item?.trustScore) < 40).length

  return {
    totalRiskSignals,
    highRiskReviews,
    lowTrustReviews,
  }
}
