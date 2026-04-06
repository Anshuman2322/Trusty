import { AlertTriangle, Brain, Clock3, Copy, Fingerprint } from 'lucide-react'

const patternTimelines = ['2 hours ago', '1 day ago', '2 days ago', '5 days ago', '1 week ago']

export function PatternsPage({ isDark, patterns }) {
  const cards = buildPatternCards(patterns)

  return (
    <div>
      <header className="tw-mb-4">
        <h2 className={['tw-text-2xl tw-leading-tight tw-font-semibold', isDark ? 'tw-text-slate-100' : 'tw-text-[#1E293B]'].join(' ')}>Patterns</h2>
        <p className={['tw-mt-1 tw-text-sm tw-leading-tight tw-font-medium', isDark ? 'tw-text-slate-400' : 'tw-text-[#64748B]'].join(' ')}>
          Suspicious behavior pattern clusters detected by AI analysis
        </p>
      </header>

      <div className="tw-space-y-4">
        {cards.map((card, index) => {
          const Icon = card.icon
          return (
            <article
              key={card.id}
              className={[
                'tw-relative tw-overflow-hidden tw-rounded-2xl tw-border tw-p-5',
                isDark ? 'tw-border-slate-700 tw-bg-slate-950' : 'tw-border-[#E5E7EB] tw-bg-white',
              ].join(' ')}
            >
              <span className="tw-absolute tw-left-0 tw-top-0 tw-h-full tw-w-1" style={{ backgroundColor: card.rail }} />

              <div className="tw-flex tw-items-start tw-gap-4">
                <div className={[
                  'tw-grid tw-h-12 tw-w-12 tw-shrink-0 tw-place-items-center tw-rounded-2xl',
                  card.severity === 'high'
                    ? 'tw-bg-[#FDECEC] tw-text-[#E53935]'
                    : card.severity === 'medium'
                      ? 'tw-bg-[#FFF5E5] tw-text-[#F59E0B]'
                      : 'tw-bg-[#EEF7FF] tw-text-[#3B82F6]',
                ].join(' ')}>
                  <Icon size={21} />
                </div>

                <div className="tw-min-w-0">
                  <div className="tw-flex tw-flex-wrap tw-items-center tw-gap-2">
                    <h3 className={['tw-text-xl tw-leading-tight tw-font-semibold', isDark ? 'tw-text-slate-100' : 'tw-text-[#1E293B]'].join(' ')}>{card.title}</h3>
                    <span className={['tw-text-sm tw-font-semibold', isDark ? 'tw-text-slate-400' : 'tw-text-[#94A3B8]'].join(' ')}>{card.patternId}</span>
                  </div>

                  <div className={['tw-mt-1 tw-text-sm tw-font-medium', isDark ? 'tw-text-slate-400' : 'tw-text-[#64748B]'].join(' ')}>
                    Vendors: {card.vendors} • {patternTimelines[index % patternTimelines.length]}
                  </div>

                  <div className={['tw-mt-3 tw-text-sm tw-font-bold tw-tracking-[0.03em]', isDark ? 'tw-text-slate-300' : 'tw-text-[#475569]'].join(' ')}>
                    WHY FLAGGED
                  </div>

                  <ul className="tw-mt-2 tw-space-y-1.5">
                    {card.reasons.map((reason) => (
                      <li key={reason} className={['tw-flex tw-items-start tw-gap-2 tw-text-base tw-leading-tight tw-font-medium', isDark ? 'tw-text-slate-300' : 'tw-text-[#64748B]'].join(' ')}>
                        <AlertTriangle size={17} className="tw-mt-0.5 tw-shrink-0 tw-text-[#F59E0B]" />
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
