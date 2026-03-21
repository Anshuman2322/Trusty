import { useEffect, useId, useMemo, useState } from 'react'

const STAR_VALUES = [1, 2, 3, 4, 5]

function normalizeRating(value) {
  const n = Number(value)
  if (!Number.isFinite(n)) return 0
  const roundedHalf = Math.round(n * 2) / 2
  return Math.max(0, Math.min(5, roundedHalf))
}

function starFillPercent(effectiveRating, starValue) {
  const fill = Math.max(0, Math.min(1, effectiveRating - (starValue - 1)))
  return Math.round(fill * 100)
}

function StarGlyph({ fillPercent, active, gradientId, sizeClass }) {
  const isDarkTheme = typeof document !== 'undefined' && document.body?.dataset?.theme === 'dark'
  const clipPathId = `${gradientId}-clip`
  const shineGradientId = `${gradientId}-shine`
  const baseFill = isDarkTheme ? 'rgba(148,163,184,0.22)' : 'rgba(148,163,184,0.16)'
  const baseStroke = isDarkTheme ? 'rgba(148,163,184,0.72)' : 'rgba(100,116,139,0.45)'
  const inactiveStroke = isDarkTheme ? 'rgba(148,163,184,0.84)' : 'rgba(100,116,139,0.52)'

  return (
    <span
      className={`tw-relative tw-inline-flex tw-items-center tw-justify-center tw-rounded-full tw-transition-all tw-duration-200 tw-ease-in-out ${
        active
          ? 'tw-scale-110 tw-drop-shadow-[0_0_10px_rgba(245,158,11,0.5)]'
          : 'tw-scale-100 tw-drop-shadow-none'
      }`}
      aria-hidden="true"
    >
      <svg className={`${sizeClass} tw-overflow-visible`} viewBox="0 0 24 24" fill="none" focusable="false">
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#fde047" />
            <stop offset="45%" stopColor="#facc15" />
            <stop offset="100%" stopColor="#f97316" />
          </linearGradient>
          <linearGradient id={shineGradientId} x1="4" y1="4" x2="18" y2="18" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="rgba(255,255,255,0.88)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0)" />
          </linearGradient>
          <clipPath id={clipPathId}>
            <rect x="0" y="0" width={`${(24 * fillPercent) / 100}`} height="24" />
          </clipPath>
        </defs>

        <path
          d="M12 2.75l2.78 5.63 6.22.9-4.5 4.39 1.06 6.2L12 17l-5.56 2.92 1.06-6.2-4.5-4.39 6.22-.9L12 2.75z"
          fill={baseFill}
          stroke={baseStroke}
          strokeWidth="1"
        />

        <g clipPath={`url(#${clipPathId})`}>
          <path
            d="M12 2.75l2.78 5.63 6.22.9-4.5 4.39 1.06 6.2L12 17l-5.56 2.92 1.06-6.2-4.5-4.39 6.22-.9L12 2.75z"
            fill={`url(#${gradientId})`}
          />
          <path
            className="starRatingSparkle"
            d="M12 2.75l2.78 5.63 6.22.9-4.5 4.39 1.06 6.2L12 17l-5.56 2.92 1.06-6.2-4.5-4.39 6.22-.9L12 2.75z"
            fill={`url(#${shineGradientId})`}
          />
        </g>

        <path
          d="M12 2.75l2.78 5.63 6.22.9-4.5 4.39 1.06 6.2L12 17l-5.56 2.92 1.06-6.2-4.5-4.39 6.22-.9L12 2.75z"
          fill="none"
          stroke={active ? 'rgba(234, 88, 12, 0.85)' : inactiveStroke}
          strokeWidth="1"
        />
      </svg>

      {active ? <span className="starRatingShine" /> : null}
    </span>
  )
}

export default function StarRating({
  rating = 0,
  onChange,
  readOnly = false,
  size = 'md',
  showValue = true,
  className = '',
}) {
  const [selectedRating, setSelectedRating] = useState(() => normalizeRating(rating))
  const [hoverRating, setHoverRating] = useState(0)
  const instanceId = useId()

  useEffect(() => {
    setSelectedRating(normalizeRating(rating))
  }, [rating])

  const isInteractive = !readOnly && typeof onChange === 'function'
  const effectiveRating = hoverRating > 0 ? hoverRating : selectedRating

  const starSizeClass = useMemo(() => {
    if (size === 'sm') return 'tw-h-5 tw-w-5 sm:tw-h-5 sm:tw-w-5'
    if (size === 'lg') return 'tw-h-8 tw-w-8 sm:tw-h-9 sm:tw-w-9'
    return 'tw-h-6 tw-w-6 sm:tw-h-7 sm:tw-w-7'
  }, [size])

  function handleSelect(next) {
    if (!isInteractive) return
    const normalized = normalizeRating(next)
    setSelectedRating(normalized)
    onChange(normalized)
  }

  const displayedValue = Number.isFinite(selectedRating) ? selectedRating.toFixed(1) : '0.0'

  return (
    <div className={`tw-inline-flex tw-flex-col tw-gap-1.5 ${className}`}>
      <div className="tw-flex tw-items-center tw-gap-0.5">
        {STAR_VALUES.map((value) => {
          const fillPercent = starFillPercent(effectiveRating, value)
          const active = fillPercent > 0
          const gradientId = `${instanceId.replace(/:/g, '-')}-star-${value}`

          return (
            <button
              key={value}
              type="button"
              className={`tw-relative tw-inline-flex tw-min-h-9 tw-min-w-9 tw-items-center tw-justify-center tw-rounded-xl tw-border-0 tw-bg-transparent tw-p-1 tw-transition-all tw-duration-200 tw-ease-in-out ${
                isInteractive
                  ? 'tw-cursor-pointer hover:tw-scale-110 focus:tw-outline-none focus-visible:tw-ring-2 focus-visible:tw-ring-amber-300/70'
                  : 'tw-cursor-default'
              }`}
              onMouseEnter={() => {
                if (isInteractive) setHoverRating(value)
              }}
              onMouseLeave={() => {
                if (isInteractive) setHoverRating(0)
              }}
              onFocus={() => {
                if (isInteractive) setHoverRating(value)
              }}
              onBlur={() => {
                if (isInteractive) setHoverRating(0)
              }}
              onClick={() => handleSelect(value)}
              disabled={!isInteractive}
              aria-label={`${value} star${value === 1 ? '' : 's'}`}
              title={isInteractive ? `Click to rate ${value} star${value === 1 ? '' : 's'}` : `${displayedValue} / 5`}
            >
              <StarGlyph
                fillPercent={fillPercent}
                active={active}
                gradientId={gradientId}
                sizeClass={starSizeClass}
              />
            </button>
          )
        })}
      </div>

      {showValue ? (
        <div className="tw-text-xs sm:tw-text-sm tw-font-semibold tw-text-[var(--pv-text)]">{displayedValue} / 5</div>
      ) : null}
    </div>
  )
}
