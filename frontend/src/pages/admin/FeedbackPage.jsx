import { useMemo, useState } from 'react'
import { BadgeCheck, Clock3, Link2, PackageCheck, ShieldCheck, UserRound } from 'lucide-react'
import { FeedbackExplanation } from '../../components/FeedbackExplanation'
import { SectionCard } from '../../components/admin/AdminUi'

export function FeedbackPage({ isDark, feedbacks = [], filters, onFilterChange }) {
  const [query, setQuery] = useState('')
  const [onlyFlagged, setOnlyFlagged] = useState(false)
  const [onlyVerified, setOnlyVerified] = useState(false)
  const [sortBy, setSortBy] = useState('newest')

  const vendorOptions = useMemo(() => {
    const map = new Map()
    feedbacks.forEach((item) => {
      const id = String(item.vendorId || '')
      if (!id || map.has(id)) return
      map.set(id, `Vendor ${id.slice(0, 8)}...`)
    })
    return Array.from(map.entries()).map(([value, label]) => ({ value, label }))
  }, [feedbacks])

  const trustCounts = useMemo(() => {
    const base = { all: feedbacks.length, HIGH: 0, MEDIUM: 0, LOW: 0 }
    feedbacks.forEach((item) => {
      const level = String(item.trustLevel || '').toUpperCase()
      if (level === 'HIGH' || level === 'MEDIUM' || level === 'LOW') base[level] += 1
    })
    return base
  }, [feedbacks])

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()

    const list = feedbacks.filter((item) => {
      if (filters.vendorId && String(item.vendorId) !== String(filters.vendorId)) return false

      if (filters.trust !== 'ALL' && String(item.trustLevel || '').toUpperCase() !== filters.trust) return false

      if (filters.anonymous) {
        const name = String(item.displayName || '').trim().toLowerCase()
        if (name && name !== 'anonymous') return false
      }

      if (filters.duplicate) {
        const hasDuplicateTag = (item.tags || []).some((tag) => String(tag).toLowerCase() === 'duplicate')
        if (!hasDuplicateTag && Number(item.dupAdj || 0) >= 0) return false
      }

      if (onlyFlagged) {
        const hasRiskTag = (item.tags || []).some((tag) => ['duplicate', 'suspicious', 'ai-flag'].includes(String(tag).toLowerCase()))
        const lowTrust = String(item.trustLevel || '').toUpperCase() === 'LOW'
        if (!hasRiskTag && !lowTrust) return false
      }

      if (onlyVerified && !item.codeValid) return false

      if (normalizedQuery) {
        const haystack = [
          item.text,
          item.displayName,
          item.productName,
          item.blockchain?.txRef,
          item.vendorId,
          (item.tags || []).join(' '),
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
        if (!haystack.includes(normalizedQuery)) return false
      }

      return true
    })

    if (sortBy === 'oldest') {
      return list.slice().sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0))
    }

    if (sortBy === 'trust-high') {
      return list.slice().sort((a, b) => Number(b.trustScore || 0) - Number(a.trustScore || 0))
    }

    if (sortBy === 'trust-low') {
      return list.slice().sort((a, b) => Number(a.trustScore || 0) - Number(b.trustScore || 0))
    }

    return list.slice().sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
  }, [feedbacks, filters, onlyFlagged, onlyVerified, query, sortBy])

  function resetFilters() {
    onFilterChange({ ...filters, vendorId: '', trust: 'ALL', anonymous: false, duplicate: false })
    setOnlyFlagged(false)
    setOnlyVerified(false)
    setQuery('')
    setSortBy('newest')
  }

  return (
    <SectionCard title="Feedbacks" subtitle="All platform feedbacks - read-only moderation view">
      <div className={[
        'tw-sticky tw-top-0 tw-z-20 tw--mt-8 tw-mb-3 tw-rounded-xl tw-border tw-p-3 tw-shadow-sm md:tw--mt-9 md:tw-mb-4 md:tw-p-4',
        isDark ? 'tw-border-slate-700 tw-bg-[#0f1b2f]/95 tw-backdrop-blur' : 'tw-border-[#DDE7F2] tw-bg-white/95 tw-backdrop-blur',
      ].join(' ')}>
        <div className="tw-flex tw-flex-wrap tw-items-center tw-gap-2">
          <select
            className={[
              'tw-h-10 tw-min-w-[170px] tw-flex-1 tw-rounded-xl tw-border tw-px-3 tw-text-sm tw-font-medium tw-outline-none focus:tw-border-sky-500 focus:tw-ring-2 lg:tw-max-w-[240px]',
              isDark
                ? 'tw-border-slate-700 tw-bg-slate-900 tw-text-slate-100 focus:tw-ring-sky-900'
                : 'tw-border-[#E5E7EB] tw-bg-white tw-text-[#111827] focus:tw-ring-sky-100',
            ].join(' ')}
            value={filters.vendorId}
            onChange={(event) => onFilterChange({ ...filters, vendorId: event.target.value })}
          >
            <option value="">All Vendors</option>
            {vendorOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>

          <select
            className={[
              'tw-h-10 tw-min-w-[130px] tw-rounded-xl tw-border tw-px-3 tw-text-sm tw-font-medium tw-outline-none focus:tw-border-sky-500 focus:tw-ring-2',
              isDark
                ? 'tw-border-slate-700 tw-bg-slate-900 tw-text-slate-100 focus:tw-ring-sky-900'
                : 'tw-border-[#E5E7EB] tw-bg-white tw-text-[#111827] focus:tw-ring-sky-100',
            ].join(' ')}
            value={filters.trust}
            onChange={(event) => onFilterChange({ ...filters, trust: event.target.value })}
          >
            <option value="ALL">All</option>
            <option value="HIGH">High Trust</option>
            <option value="MEDIUM">Medium Trust</option>
            <option value="LOW">Low Trust</option>
          </select>

          <select
            className={[
              'tw-h-10 tw-min-w-[150px] tw-rounded-xl tw-border tw-px-3 tw-text-sm tw-font-medium tw-outline-none focus:tw-border-sky-500 focus:tw-ring-2',
              isDark
                ? 'tw-border-slate-700 tw-bg-slate-900 tw-text-slate-100 focus:tw-ring-sky-900'
                : 'tw-border-[#E5E7EB] tw-bg-white tw-text-[#111827] focus:tw-ring-sky-100',
            ].join(' ')}
            value={sortBy}
            onChange={(event) => setSortBy(event.target.value)}
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="trust-high">Highest Trust</option>
            <option value="trust-low">Lowest Trust</option>
          </select>

          <input
            className={[
              'tw-h-10 tw-min-w-[220px] tw-flex-1 tw-rounded-xl tw-border tw-px-3 tw-text-sm tw-font-medium tw-outline-none focus:tw-border-sky-500 focus:tw-ring-2',
              isDark
                ? 'tw-border-slate-700 tw-bg-slate-900 tw-text-slate-100 placeholder:tw-text-slate-500 focus:tw-ring-sky-900'
                : 'tw-border-[#E5E7EB] tw-bg-white tw-text-[#111827] placeholder:tw-text-[#94A3B8] focus:tw-ring-sky-100',
            ].join(' ')}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search text, tx, product..."
          />

          <button
            type="button"
            className={[
              'tw-h-10 tw-rounded-xl tw-border tw-px-3 tw-text-xs tw-font-semibold',
              isDark
                ? 'tw-border-slate-700 tw-bg-slate-900 tw-text-slate-200 hover:tw-bg-slate-800'
                : 'tw-border-[#E5E7EB] tw-bg-white tw-text-[#334155] hover:tw-bg-[#F8FAFC]',
            ].join(' ')}
            onClick={resetFilters}
          >
            Clear Filters
          </button>
        </div>

        <div className="tw-mt-2 tw-flex tw-flex-wrap tw-items-center tw-gap-2">
          <FilterPill
            isDark={isDark}
            active={filters.anonymous}
            label="Anonymous"
            onClick={() => onFilterChange({ ...filters, anonymous: !filters.anonymous })}
          />
          <FilterPill
            isDark={isDark}
            active={filters.duplicate}
            label="Duplicate"
            onClick={() => onFilterChange({ ...filters, duplicate: !filters.duplicate })}
          />
          <FilterPill
            isDark={isDark}
            active={onlyVerified}
            label="Verified"
            onClick={() => setOnlyVerified((prev) => !prev)}
          />
          <FilterPill
            isDark={isDark}
            active={onlyFlagged}
            label="Risk Flags"
            onClick={() => setOnlyFlagged((prev) => !prev)}
          />
        </div>

        <div className="tw-mt-2 tw-grid tw-gap-2 sm:tw-grid-cols-2 lg:tw-grid-cols-4">
          <StatTile isDark={isDark} title="Total" value={trustCounts.all} />
          <StatTile isDark={isDark} title="High Trust" value={trustCounts.HIGH} tone="high" />
          <StatTile isDark={isDark} title="Medium Trust" value={trustCounts.MEDIUM} tone="medium" />
          <StatTile isDark={isDark} title="Low Trust" value={trustCounts.LOW} tone="low" />
        </div>
      </div>

      <div className="tw-space-y-3">
        {filtered.map((feedback) => (
          <article
            key={feedback._id}
            className={[
              'tw-rounded-xl tw-border tw-p-3 md:tw-p-4 tw-shadow-soft',
              isDark ? 'tw-border-slate-700 tw-bg-slate-950' : 'tw-border-[#E5E7EB] tw-bg-white',
            ].join(' ')}
          >
            <div className="tw-flex tw-flex-wrap tw-items-start tw-justify-between tw-gap-3">
              <div className="tw-flex tw-items-start tw-gap-3">
                <ScoreRing score={feedback.trustScore} level={feedback.trustLevel} />
                <div className="tw-space-y-2">
                  <div className="tw-flex tw-flex-wrap tw-items-center tw-gap-2">
                    <TrustBandBadge level={feedback.trustLevel} />
                    {deriveBadges(feedback).map((badge) => (
                      <SignalBadge key={badge.label} badge={badge} />
                    ))}
                  </div>
                  <p className={['tw-text-base md:tw-text-lg tw-leading-relaxed tw-font-medium', isDark ? 'tw-text-slate-100' : 'tw-text-[#1E293B]'].join(' ')}>
                    {feedback.text}
                  </p>
                </div>
              </div>

              <div className={[
                'tw-inline-flex tw-items-center tw-gap-1.5 tw-text-sm tw-font-semibold',
                isDark ? 'tw-text-slate-400' : 'tw-text-[#94A3B8]',
              ].join(' ')}>
                <Clock3 size={14} />
                {formatDate(feedback.createdAt)}
              </div>
            </div>

            <div className={[
              'tw-mt-3 tw-border-t tw-pt-3 tw-text-sm tw-italic tw-font-medium',
              isDark ? 'tw-border-slate-700 tw-text-slate-300' : 'tw-border-[#E5E7EB] tw-text-[#64748B]',
            ].join(' ')}>
              {buildModerationSummary(feedback)}
            </div>

            <div className="tw-mt-3 tw-grid tw-gap-2 sm:tw-grid-cols-2 lg:tw-grid-cols-5">
              {buildSignalBlocks(feedback).map((item) => (
                <div
                  key={item.label}
                  className={[
                    'tw-rounded-lg tw-border tw-px-3 tw-py-1.5 tw-text-center',
                    isDark ? 'tw-border-slate-700 tw-bg-slate-900' : 'tw-border-[#E5E7EB] tw-bg-[#F8FAFC]',
                  ].join(' ')}
                >
                  <div className={['tw-text-xs tw-font-semibold', isDark ? 'tw-text-slate-400' : 'tw-text-[#64748B]'].join(' ')}>{item.label}</div>
                  <div className={['tw-text-2xl tw-leading-none tw-font-bold tw-mt-1', isDark ? 'tw-text-slate-100' : 'tw-text-[#111827]'].join(' ')}>{item.value}</div>
                </div>
              ))}
            </div>

            <div className="tw-mt-3 tw-flex tw-flex-wrap tw-items-center tw-justify-between tw-gap-3">
              <div className={['tw-text-sm tw-font-mono', isDark ? 'tw-text-slate-400' : 'tw-text-[#64748B]'].join(' ')}>
                Blockchain TX: {feedback.blockchain?.txRef || 'N/A'}
              </div>
              <FeedbackExplanation
                feedback={feedback}
                buttonLabel="Explain"
                buttonClassName={[
                  'tw-rounded-lg tw-border tw-px-3 tw-py-1.5 tw-text-xs tw-font-semibold tw-transition-all tw-duration-200',
                  isDark
                    ? 'tw-border-slate-600 tw-bg-slate-900 tw-text-slate-100 hover:tw-bg-slate-800'
                    : 'tw-border-[#E5E7EB] tw-bg-white tw-text-[#111827] hover:tw-bg-[#F9FAFB]',
                ].join(' ')}
              />
            </div>
          </article>
        ))}

        {!filtered.length ? (
          <div className={[
            'tw-rounded-2xl tw-border tw-p-6 tw-text-center tw-text-sm tw-font-medium',
            isDark ? 'tw-border-slate-700 tw-bg-slate-950 tw-text-slate-400' : 'tw-border-[#E5E7EB] tw-bg-white tw-text-[#64748B]',
          ].join(' ')}>
            No feedback matched current filters.
          </div>
        ) : null}
      </div>
    </SectionCard>
  )
}

function getTrustTone(level) {
  const normalized = String(level || '').toUpperCase()
  if (normalized === 'HIGH') return 'high'
  if (normalized === 'MEDIUM') return 'medium'
  return 'low'
}

function getToneClasses(tone) {
  if (tone === 'high') {
    return {
      ring: '#2cb67d',
      bg: 'tw-bg-[#EAFBF3]',
      text: 'tw-text-[#1f9d67]',
      border: 'tw-border-[#BFE9D3]',
    }
  }
  if (tone === 'medium') {
    return {
      ring: '#f59e0b',
      bg: 'tw-bg-[#FFF7E8]',
      text: 'tw-text-[#d48a00]',
      border: 'tw-border-[#F3D8A1]',
    }
  }
  return {
    ring: '#ef4444',
    bg: 'tw-bg-[#FFF1F1]',
    text: 'tw-text-[#dc4f4f]',
    border: 'tw-border-[#F4C7C7]',
  }
}

function ScoreRing({ score, level }) {
  const safeScore = Math.max(0, Math.min(100, Number(score || 0)))
  const tone = getToneClasses(getTrustTone(level))
  const angle = Math.round((safeScore / 100) * 360)

  return (
    <div
      className="tw-grid tw-h-14 tw-w-14 tw-place-items-center tw-rounded-full"
      style={{ background: `conic-gradient(${tone.ring} ${angle}deg, #e9eef5 ${angle}deg)` }}
    >
      <div className="tw-grid tw-h-11 tw-w-11 tw-place-items-center tw-rounded-full tw-bg-white tw-text-lg tw-font-bold tw-text-[#334155]">
        {safeScore}
      </div>
    </div>
  )
}

function TrustBandBadge({ level }) {
  const toneKey = getTrustTone(level)
  const tone = getToneClasses(toneKey)
  const label = toneKey === 'high' ? 'High Trust' : toneKey === 'medium' ? 'Medium Trust' : 'Low Trust'

  return (
    <span className={['tw-inline-flex tw-items-center tw-gap-1.5 tw-rounded-full tw-border tw-px-3 tw-py-1 tw-text-sm tw-font-semibold', tone.bg, tone.text, tone.border].join(' ')}>
      <ShieldCheck size={14} />
      {label}
    </span>
  )
}

function deriveBadges(feedback) {
  const badges = []
  const breakdown = feedback?.trustBreakdown || {}
  const ai = Number(breakdown?.aiBehavior?.score || 0)
  const aiMax = Number(breakdown?.aiBehavior?.maxScore || 12)
  const payment = Number(breakdown?.paymentProof?.score || 0)
  const delivered = !feedback?.notReceived

  if (ai > 0 && ai / Math.max(aiMax, 1) >= 0.7) {
    badges.push({ label: 'AI Verified', tone: 'violet' })
  }

  if (feedback?.blockchain?.txRef) {
    badges.push({ label: 'Blockchain Verified', tone: 'blue' })
  }

  if (payment > 0 || feedback?.codeValid) {
    badges.push({ label: 'Payment Verified', tone: 'green' })
  }

  if (delivered) {
    badges.push({ label: 'Delivered', tone: 'amber' })
  }

  if (!feedback?.displayName || String(feedback.displayName).toLowerCase() === 'anonymous') {
    badges.push({ label: 'Anonymous', tone: 'slate' })
  }

  return badges
}

function SignalBadge({ badge }) {
  const palette = {
    violet: 'tw-bg-[#F3EDFF] tw-text-[#8458D6] tw-border-[#DCCCFB]',
    blue: 'tw-bg-[#E8F5FF] tw-text-[#3197D9] tw-border-[#BFDFF3]',
    green: 'tw-bg-[#EAFBF3] tw-text-[#1f9d67] tw-border-[#BFE9D3]',
    amber: 'tw-bg-[#FFF7E8] tw-text-[#d48a00] tw-border-[#F3D8A1]',
    slate: 'tw-bg-[#EFF3F8] tw-text-[#64748B] tw-border-[#D8E0EA]',
  }

  const Icon =
    badge.tone === 'violet'
      ? BadgeCheck
      : badge.tone === 'blue'
        ? Link2
        : badge.tone === 'green'
          ? ShieldCheck
          : badge.tone === 'amber'
            ? PackageCheck
            : UserRound

  return (
    <span className={['tw-inline-flex tw-items-center tw-gap-1.5 tw-rounded-full tw-border tw-px-2.5 tw-py-1 tw-text-xs tw-font-semibold', palette[badge.tone] || palette.slate].join(' ')}>
      <Icon size={13} />
      {badge.label}
    </span>
  )
}

function buildSignalBlocks(feedback) {
  const breakdown = feedback?.trustBreakdown || {}

  return [
    { label: 'Token Verification', value: Number(breakdown?.tokenVerification?.score || 0) },
    { label: 'Payment Proof', value: Number(breakdown?.paymentProof?.score || 0) },
    { label: 'Ai Content Quality', value: Number(breakdown?.aiBehavior?.score || 0) },
    { label: 'Behavior Analysis', value: Number(breakdown?.contextDepth?.score || 0) },
    { label: 'Device Uniqueness', value: Number(breakdown?.devicePattern?.score || 0) },
  ]
}

function buildModerationSummary(feedback) {
  const tone = getTrustTone(feedback?.trustLevel)
  const verificationText = feedback?.codeValid ? 'verified purchase with confirmed delivery' : 'anonymous feedback with no purchase verification'
  const riskTag = (feedback?.tags || []).some((tag) => ['duplicate', 'suspicious', 'ai-flag'].includes(String(tag).toLowerCase()))

  if (tone === 'high') {
    return `High trust: ${verificationText}, genuine behavior patterns, and original content${riskTag ? ' with minor review risk flags.' : '.'}`
  }

  if (tone === 'medium') {
    return `Medium trust: ${verificationText}. Content appears genuine but partially unverified.`
  }

  return `Low trust: ${verificationText}. Multiple risk indicators suggest closer moderation review.`
}

function formatDate(value) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toISOString().slice(0, 10)
}

function FilterPill({ isDark, active, label, onClick }) {
  return (
    <button
      type="button"
      className={[
        'tw-h-8 tw-rounded-full tw-border tw-px-3 tw-text-xs tw-font-semibold tw-transition-colors',
        active
          ? 'tw-border-sky-300 tw-bg-sky-50 tw-text-sky-700'
          : isDark
            ? 'tw-border-slate-700 tw-bg-slate-900 tw-text-slate-300 hover:tw-bg-slate-800'
            : 'tw-border-[#E5E7EB] tw-bg-white tw-text-[#475569] hover:tw-bg-[#F8FAFC]',
      ].join(' ')}
      onClick={onClick}
    >
      {label}
    </button>
  )
}

function StatTile({ isDark, title, value, tone = 'default' }) {
  const toneClass =
    tone === 'high'
      ? 'tw-text-emerald-700'
      : tone === 'medium'
        ? 'tw-text-amber-700'
        : tone === 'low'
          ? 'tw-text-rose-700'
          : isDark
            ? 'tw-text-slate-100'
            : 'tw-text-[#111827]'

  return (
    <div className={[
      'tw-rounded-xl tw-border tw-p-2.5',
      isDark ? 'tw-border-slate-700 tw-bg-slate-900' : 'tw-border-[#E5E7EB] tw-bg-white',
    ].join(' ')}>
      <div className={['tw-text-xs tw-font-semibold', isDark ? 'tw-text-slate-400' : 'tw-text-[#64748B]'].join(' ')}>{title}</div>
      <div className={['tw-mt-0.5 tw-text-xl tw-font-bold', toneClass].join(' ')}>{value}</div>
    </div>
  )
}
