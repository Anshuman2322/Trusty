import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { apiGet, apiPost } from '../lib/api'
import { FeedbackExplanation } from '../components/FeedbackExplanation'
import StarRating from '../components/StarRating'
import { getDeviceFingerprintHash, getOrCreateSessionId } from '../lib/device'

const MAX_FEEDBACK_CHARS = 500
const MIN_FEEDBACK_CHARS = 20
const GEOLOCATION_TIMEOUT_MS = 4500

function formatTrustLevel(level) {
  if (!level) return '—'
  return level.charAt(0) + level.slice(1).toLowerCase()
}

function reviewTrustTone(score) {
  const n = Number(score)
  if (!Number.isFinite(n)) return 'hidden'
  if (n >= 71) return 'high'
  if (n >= 40) return 'medium'
  return 'low'
}

function reviewTrustPillClass(score) {
  const tone = reviewTrustTone(score)
  if (tone === 'high') return 'publicTrustPill publicTrustPill--high'
  if (tone === 'medium') return 'publicTrustPill publicTrustPill--medium'
  if (tone === 'hidden') return 'publicTrustPill publicTrustPill--hidden'
  return 'publicTrustPill publicTrustPill--low'
}

function reviewTrustLabel(score) {
  const tone = reviewTrustTone(score)
  if (tone === 'high') return 'High Trust'
  if (tone === 'medium') return 'Medium Trust'
  if (tone === 'hidden') return 'Trust Hidden'
  return 'Low Trust'
}

function TrustPillIcon() {
  return (
    <span className="publicTrustIcon" aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none" focusable="false" aria-hidden="true">
        <path d="M12 3l7 3v5c0 5-3.2 8.6-7 10-3.8-1.4-7-5-7-10V6l7-3z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M8.7 11.8l2.1 2.1 4.5-4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  )
}

function reviewScoreRingClass(score) {
  const tone = reviewTrustTone(score)
  if (tone === 'high') return 'reviewScoreRing reviewScoreRing--high'
  if (tone === 'medium') return 'reviewScoreRing reviewScoreRing--medium'
  if (tone === 'hidden') return 'reviewScoreRing reviewScoreRing--hidden'
  return 'reviewScoreRing reviewScoreRing--low'
}

function vendorStatusPillClass(statusBadge) {
  const normalized = String(statusBadge || '').trim().toLowerCase()
  if (normalized === 'new vendor' || normalized === 'no reviews yet') return 'publicVendorStatus publicVendorStatus--private'
  if (normalized === 'trusted' || normalized === 'high') return 'publicVendorStatus publicVendorStatus--trusted'
  if (normalized === 'medium') return 'publicVendorStatus publicVendorStatus--medium'
  if (normalized === 'risky' || normalized === 'low') return 'publicVendorStatus publicVendorStatus--risky'
  if (normalized === 'private') return 'publicVendorStatus publicVendorStatus--private'
  return 'publicVendorStatus'
}

function vendorTrustRingClass(score) {
  const tone = reviewTrustTone(score)
  if (tone === 'high') return 'publicVendorRing publicVendorRing--high'
  if (tone === 'medium') return 'publicVendorRing publicVendorRing--medium'
  if (tone === 'hidden') return 'publicVendorRing publicVendorRing--hidden'
  return 'publicVendorRing publicVendorRing--low'
}

function clampReviewScore(score) {
  const n = Number(score)
  if (!Number.isFinite(n)) return null
  return Math.max(0, Math.min(100, Math.round(n)))
}

function clampStarRating(rating) {
  const n = Number(rating)
  if (!Number.isFinite(n)) return null
  const roundedHalf = Math.round(n * 2) / 2
  return Math.max(0, Math.min(5, roundedHalf))
}

function deriveRatingFromTrustScore(trustScore) {
  const score = clampReviewScore(trustScore)
  if (score == null) return null
  return clampStarRating(score / 20)
}

function formatReviewDate(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'

  const MONTH_NAMES = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ]

  const dd = String(d.getDate()).padStart(2, '0')
  const month = MONTH_NAMES[d.getMonth()] || MONTH_NAMES[0]
  const yyyy = d.getFullYear()
  return `${dd}-${month}-${yyyy}`
}

function roleTagMeta(tag) {
  if (tag === 'AI Verified') return { label: 'AI Verified', className: 'pill pill--ai', iconKind: 'ai' }
  if (tag === 'Blockchain Anchored' || tag === 'Blockchain Verified') {
    return { label: 'Blockchain Verified', className: 'pill pill--blockchain', iconKind: 'blockchain' }
  }
  if (tag === 'Payment Verified') return { label: 'Payment Verified', className: 'pill pill--payment', iconKind: 'payment' }
  if (tag === 'Delivered') return { label: 'Delivered', className: 'pill pill--delivered', iconKind: 'delivered' }
  return { label: tag, className: 'pill', iconKind: 'generic' }
}

function RoleTagIcon({ kind }) {
  if (kind === 'ai') {
    return (
      <span className="tagRoleIcon" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" focusable="false" aria-hidden="true">
          <rect x="6" y="8" width="12" height="10" rx="2" stroke="currentColor" strokeWidth="2" />
          <path d="M10 12h4M9 15h6M12 6V4M4 11h2M18 11h2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    )
  }

  if (kind === 'blockchain') {
    return (
      <span className="tagRoleIcon" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" focusable="false" aria-hidden="true">
          <path d="M9.5 8.5l2.3-2.3a3.2 3.2 0 014.5 4.5l-2.2 2.2M14.5 15.5l-2.3 2.3a3.2 3.2 0 11-4.5-4.5l2.2-2.2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M9 15l6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </span>
    )
  }

  if (kind === 'payment') {
    return (
      <span className="tagRoleIcon" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" focusable="false" aria-hidden="true">
          <rect x="3.5" y="6" width="17" height="12" rx="2" stroke="currentColor" strokeWidth="2" />
          <path d="M3.5 10h17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </span>
    )
  }

  if (kind === 'delivered') {
    return (
      <span className="tagRoleIcon" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" focusable="false" aria-hidden="true">
          <path d="M12 3l7 4-7 4-7-4 7-4z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
          <path d="M5 7v8l7 4 7-4V7M12 11v8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    )
  }

  return (
    <span className="tagRoleIcon" aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none" focusable="false" aria-hidden="true">
        <circle cx="12" cy="12" r="4" fill="currentColor" />
      </svg>
    </span>
  )
}

function ProfileStatIcon({ kind }) {
  if (kind === 'trust') {
    return (
      <span className="publicVendorStatIcon" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" focusable="false" aria-hidden="true">
          <path d="M12 3l2.8 5.7L21 9.6l-4.5 4.4 1.1 6.2L12 17.2 6.4 20.2l1.1-6.2L3 9.6l6.2-.9L12 3z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
        </svg>
      </span>
    )
  }

  if (kind === 'feedbacks') {
    return (
      <span className="publicVendorStatIcon" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" focusable="false" aria-hidden="true">
          <path d="M12 3l7 4v10l-7 4-7-4V7l7-4z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
          <path d="M5 7l7 4 7-4M12 11v10" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
        </svg>
      </span>
    )
  }

  return (
    <span className="publicVendorStatIcon" aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none" focusable="false" aria-hidden="true">
        <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="2" />
        <path d="M8.8 12.2l2.1 2.1 4.3-4.3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  )
}

function PublicVendorInfoIcon({ kind }) {
  if (kind === 'location') {
    return (
      <span className="publicVendorInfoIcon" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" focusable="false" aria-hidden="true">
          <path d="M12 21s6-4.9 6-10a6 6 0 10-12 0c0 5.1 6 10 6 10z" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="12" cy="11" r="2.1" stroke="currentColor" strokeWidth="1.9" />
        </svg>
      </span>
    )
  }

  if (kind === 'businessCategory') {
    return (
      <span className="publicVendorInfoIcon" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" focusable="false" aria-hidden="true">
          <path d="M4 20h16" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
          <path d="M6 20V9h12v11M8.5 9V6.5h7V9" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M10 13h1M13 13h1M10 16h1M13 16h1" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
        </svg>
      </span>
    )
  }

  if (kind === 'businessEmail' || kind === 'supportEmail') {
    return (
      <span className="publicVendorInfoIcon" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" focusable="false" aria-hidden="true">
          <rect x="3.5" y="6.5" width="17" height="11" rx="2" stroke="currentColor" strokeWidth="1.9" />
          <path d="M4.5 8l7.5 5.3L19.5 8" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    )
  }

  if (kind === 'phoneNumber') {
    return (
      <span className="publicVendorInfoIcon" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" focusable="false" aria-hidden="true">
          <path d="M7.5 4.7l3 1.1-.7 3-2 1.1a15.3 15.3 0 006.2 6.2l1.1-2 3 .7 1.1 3c.2.5 0 1.1-.6 1.3-1.3.6-2.7.8-4.1.4a18 18 0 01-11.1-11c-.4-1.4-.2-2.9.4-4.1.3-.6.8-.8 1.3-.6z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    )
  }

  if (kind === 'businessWebsite') {
    return (
      <span className="publicVendorInfoIcon" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" focusable="false" aria-hidden="true">
          <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.9" />
          <path d="M4 12h16M12 4a12.7 12.7 0 013 8 12.7 12.7 0 01-3 8 12.7 12.7 0 01-3-8 12.7 12.7 0 013-8z" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    )
  }

  if (kind === 'businessId') {
    return (
      <span className="publicVendorInfoIcon" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" focusable="false" aria-hidden="true">
          <rect x="3.5" y="6.5" width="17" height="11" rx="2" stroke="currentColor" strokeWidth="1.9" />
          <circle cx="8.5" cy="12" r="1.7" stroke="currentColor" strokeWidth="1.8" />
          <path d="M12 10h6M12 12.5h6M12 15h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      </span>
    )
  }

  if (kind === 'contactPersonName') {
    return (
      <span className="publicVendorInfoIcon" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" focusable="false" aria-hidden="true">
          <circle cx="12" cy="8.5" r="3" stroke="currentColor" strokeWidth="1.9" />
          <path d="M5.5 19.5c.8-3.2 3.4-5 6.5-5s5.7 1.8 6.5 5" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
        </svg>
      </span>
    )
  }

  return (
    <span className="publicVendorInfoIcon" aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none" focusable="false" aria-hidden="true">
        <circle cx="12" cy="12" r="3" fill="currentColor" />
      </svg>
    </span>
  )
}

function FeedbackPanelIcon({ kind }) {
  if (kind === 'shield') {
    return (
      <span className="publicFeedbackHeadIconGlyph" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" focusable="false" aria-hidden="true">
          <path d="M12 3l7 3v5c0 5-3.2 8.6-7 10-3.8-1.4-7-5-7-10V6l7-3z" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    )
  }

  if (kind === 'privacy') {
    return (
      <span className="publicFeedbackInlineIcon" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" focusable="false" aria-hidden="true">
          <rect x="5" y="10" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.8" />
          <path d="M8.5 10V8a3.5 3.5 0 017 0v2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      </span>
    )
  }

  if (kind === 'delivered') {
    return (
      <span className="publicFeedbackInlineIcon" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" focusable="false" aria-hidden="true">
          <path d="M12 3l7 4-7 4-7-4 7-4z" stroke="currentColor" strokeWidth="1.9" strokeLinejoin="round" />
          <path d="M5 7v8l7 4 7-4V7M12 11v8" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    )
  }

  if (kind === 'delayed') {
    return (
      <span className="publicFeedbackInlineIcon" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" focusable="false" aria-hidden="true">
          <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.9" />
          <path d="M12 8v4l2.6 1.5" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    )
  }

  if (kind === 'notReceived') {
    return (
      <span className="publicFeedbackInlineIcon" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" focusable="false" aria-hidden="true">
          <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.9" />
          <path d="M9.4 9.4l5.2 5.2M14.6 9.4l-5.2 5.2" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
        </svg>
      </span>
    )
  }

  if (kind === 'submit') {
    return (
      <span className="publicFeedbackInlineIcon" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" focusable="false" aria-hidden="true">
          <path d="M4 11.5l15-7-4.3 15-3.1-4.9L4 11.5z" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    )
  }

  if (kind === 'thumb') {
    return (
      <span className="publicFeedbackInlineIcon" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" focusable="false" aria-hidden="true">
          <defs>
            <linearGradient id="thumbDarkGreenGradient" x1="3" y1="3" x2="20" y2="21" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#dcfce7" />
              <stop offset="52%" stopColor="#86efac" />
              <stop offset="100%" stopColor="#4ade80" />
            </linearGradient>
          </defs>
          <path
            d="M2 21h4V9H2v12zm20-11c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L13.17 1 6.59 7.59C6.22 7.95 6 8.45 6 9v10c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-2z"
            fill="url(#thumbDarkGreenGradient)"
            stroke="#2f855a"
            strokeWidth="0.6"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    )
  }

  return (
    <span className="publicFeedbackInlineIcon" aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none" focusable="false" aria-hidden="true">
        <circle cx="12" cy="12" r="3" fill="currentColor" />
      </svg>
    </span>
  )
}

function formatLocationText(location) {
  if (!location) return 'Location unavailable'
  const parts = [location.area, location.city, location.state, location.country || location.countryCode]
    .map((value) => String(value || '').trim())
    .filter(Boolean)
  return parts.length ? parts.join(', ') : 'Location unavailable'
}

function normalizeLocationPieces(parts) {
  const seen = new Set()
  const normalized = []
  parts.forEach((part) => {
    const value = String(part || '').trim()
    if (!value) return
    const key = value.toLowerCase()
    if (seen.has(key)) return
    seen.add(key)
    normalized.push(value)
  })
  return normalized
}

function getCurrentPositionWithTimeout(timeoutMs = GEOLOCATION_TIMEOUT_MS) {
  return new Promise((resolve, reject) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      reject(new Error('Geolocation not available'))
      return
    }

    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: false,
      timeout: timeoutMs,
      maximumAge: 10 * 60 * 1000,
    })
  })
}

function parseReverseGeocodeAddress(address) {
  const source = address && typeof address === 'object' && !Array.isArray(address) ? address : {}

  return {
    area:
      String(
        source.suburb ||
          source.neighbourhood ||
          source.neighborhood ||
          source.city_district ||
          source.county ||
          source.township ||
          ''
      ).trim() || undefined,
    city: String(source.city || source.town || source.village || source.municipality || '').trim() || undefined,
    state: String(source.state || source.region || source.state_district || '').trim() || undefined,
    country: String(source.country || '').trim() || undefined,
    countryCode: String(source.country_code || '').trim().toUpperCase() || undefined,
  }
}

async function fetchClientLocationSnapshot() {
  try {
    const position = await getCurrentPositionWithTimeout(GEOLOCATION_TIMEOUT_MS)
    const latitude = Number(position?.coords?.latitude)
    const longitude = Number(position?.coords?.longitude)

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null

    const url =
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2` +
      `&lat=${encodeURIComponent(latitude)}` +
      `&lon=${encodeURIComponent(longitude)}` +
      `&zoom=18&addressdetails=1`

    const response = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    })

    if (!response.ok) {
      return {
        latitude,
        longitude,
        source: 'browser_geolocation_coords',
      }
    }

    const payload = await response.json()
    const parsed = parseReverseGeocodeAddress(payload?.address)

    return {
      ...parsed,
      latitude,
      longitude,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || undefined,
      source: 'browser_geolocation_reverse',
    }
  } catch {
    return null
  }
}

function normalizeWebsiteHref(value) {
  const text = String(value || '').trim()
  if (!text) return ''
  return /^https?:\/\//i.test(text) ? text : `https://${text}`
}

function renderPublicDetailValue(row) {
  const text = String(row?.value || '').trim()
  if (!text) return 'Not provided'

  if (row.key === 'businessWebsite') {
    const href = normalizeWebsiteHref(text)
    return (
      <a className="publicVendorInfoLink" href={href} target="_blank" rel="noreferrer">
        <span>{text}</span>
        <svg viewBox="0 0 24 24" fill="none" focusable="false" aria-hidden="true">
          <path d="M14 5h5v5M10 14l9-9M19 13v6h-8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M5 9V5h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" opacity="0.3" />
        </svg>
      </a>
    )
  }

  if (row.key === 'businessEmail' || row.key === 'supportEmail') {
    return (
      <a className="publicVendorInfoLink" href={`mailto:${text}`}>
        {text}
      </a>
    )
  }

  if (row.key === 'phoneNumber') {
    const telValue = text.replace(/\s+/g, '')
    return (
      <a className="publicVendorInfoLink" href={`tel:${telValue}`}>
        {text}
      </a>
    )
  }

  return text
}

export function PublicView({ vendors, defaultVendorId }) {
  const [searchParams, setSearchParams] = useSearchParams()
  const vendorFromUrl = searchParams.get('vendor')
  const codeFromUrl = searchParams.get('code')

  const [vendorId, setVendorId] = useState(vendorFromUrl || defaultVendorId)
  const [profile, setProfile] = useState(null)
  const [feedbacks, setFeedbacks] = useState([])
  const [publicRules, setPublicRules] = useState({
    showTrustScorePublicly: true,
    showLocationInFeedback: true,
    enableFeedbackLabels: true,
  })
  const [vendorOptions, setVendorOptions] = useState(() => vendors || [])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showAllReviews, setShowAllReviews] = useState(false)

  const [mode, setMode] = useState(codeFromUrl ? 'verified' : 'anonymous')
  const [code, setCode] = useState(codeFromUrl || '')
  const [codeCheck, setCodeCheck] = useState({ checking: false, valid: null, order: null })
  const [rating, setRating] = useState(0)
  const [serviceHighlights, setServiceHighlights] = useState({
    response: false,
    quality: false,
    delivery: false,
  })

  const [text, setText] = useState('')
  const [notReceived, setNotReceived] = useState(false)
  const typingStartRef = useRef(null)
  const editCountRef = useRef(0)
  const firstInputRef = useRef(null)
  const lastLengthRef = useRef(0)
  const maxDeltaCharsRef = useRef(0)
  const lastInputTsRef = useRef(null)
  const intervalsRef = useRef([])

  const [submitState, setSubmitState] = useState({ submitting: false, result: null, warning: '' })

  const isFeedbackLinkFlow = Boolean(codeFromUrl)
  const isAutoProfileLocked = Boolean(
    isFeedbackLinkFlow &&
      mode === 'verified' &&
      codeCheck?.valid &&
      codeCheck?.order &&
      typeof codeCheck.order === 'object'
  )

  useEffect(() => {
    setVendorOptions(vendors || [])
  }, [vendors])

  useEffect(() => {
    let cancelled = false

    async function loadVendors() {
      try {
        const data = await apiGet('/api/public/vendors')
        if (cancelled) return
        setVendorOptions(data?.vendors || [])
      } catch {
        // Keep fallback options from props when refresh fails.
      }
    }

    loadVendors()

    return () => {
      cancelled = true
    }
  }, [])

  const orderedFeedbacks = useMemo(() => {
    return [...feedbacks].sort((a, b) => {
      const aTime = Number(new Date(a?.createdAt).getTime()) || 0
      const bTime = Number(new Date(b?.createdAt).getTime()) || 0
      return bTime - aTime
    })
  }, [feedbacks])
  const visibleFeedbacks = useMemo(() => {
    return showAllReviews ? orderedFeedbacks : orderedFeedbacks.slice(0, 4)
  }, [orderedFeedbacks, showAllReviews])
  const hiddenReviewCount = Math.max(0, orderedFeedbacks.length - 4)
  const vendorAverageScore = clampReviewScore(profile?.averageTrustScore)
  const vendorFeedbackCount = Number(profile?.totalFeedbacks || 0)
  const hasVendorReviews = vendorFeedbackCount > 0
  const vendorDisplayScore = hasVendorReviews ? vendorAverageScore : null
  const vendorTrustDescriptor = hasVendorReviews ? reviewTrustLabel(vendorAverageScore) : 'No reviews yet'
  const vendorStatusText = hasVendorReviews
    ? (profile?.statusBadge ||
      (vendorAverageScore == null ? 'Private' : vendorTrustDescriptor.replace(/\s+Trust$/i, '')))
    : 'New Vendor'
  const hasBusinessLogo = Boolean(String(profile?.businessLogo || '').trim())
  const vendorInitial = String(profile?.name || 'V').trim().charAt(0).toUpperCase() || 'V'
  const profileLocationText = formatLocationText(profile?.location)
  const additionalInfoHeading = String(profile?.additionalInfo?.heading || '').trim()
  const additionalInfoResult = String(profile?.additionalInfo?.result || '').trim()
  const hasAdditionalInfo = Boolean(additionalInfoHeading || additionalInfoResult)
  const feedbackTargetName = String(profile?.name || 'this vendor').trim()
  const textCharacterCount = text.length
  const trimmedLength = text.trim().length
  const meetsTextMinimum = trimmedLength >= MIN_FEEDBACK_CHARS
  const hasSelectedRating = rating > 0
  const publicDetailRows = [
    { key: 'businessCategory', label: 'Business Category', value: profile?.businessCategory },
    { key: 'businessEmail', label: 'Business Email', value: profile?.businessEmail },
    { key: 'supportEmail', label: 'Support Email', value: profile?.supportEmail },
    { key: 'phoneNumber', label: 'Phone Number', value: profile?.phoneNumber },
    { key: 'businessWebsite', label: 'Website', value: profile?.businessWebsite },
    { key: 'businessId', label: 'GST / Business ID', value: profile?.businessId },
    { key: 'contactPersonName', label: 'Contact Person', value: profile?.contactPersonName },
  ].filter((row) => String(row.value || '').trim())

  useEffect(() => {
    if (!vendorId && defaultVendorId) setVendorId(defaultVendorId)
  }, [defaultVendorId, vendorId])

  useEffect(() => {
    if (!vendorOptions.length) return

    const currentExists = vendorOptions.some((vendor) => String(vendor?._id || '') === String(vendorId || ''))
    if (currentExists) return

    const fallbackVendorId = String(vendorFromUrl || defaultVendorId || vendorOptions?.[0]?._id || '')
    if (fallbackVendorId) setVendorId(fallbackVendorId)
  }, [vendorOptions, vendorId, vendorFromUrl, defaultVendorId])

  useEffect(() => {
    if (!vendorId) return
    const next = new URLSearchParams(searchParams)
    next.set('vendor', vendorId)
    if (codeFromUrl) next.set('code', codeFromUrl)
    setSearchParams(next, { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vendorId])

  async function refresh() {
    if (!vendorId) return
    try {
      setLoading(true)
      setError('')
      const [p, f] = await Promise.all([
        apiGet(`/api/public/vendor/${vendorId}`),
        apiGet(`/api/public/vendor/${vendorId}/feedbacks`),
      ])
      setProfile(p.vendor)
      setFeedbacks(f.feedbacks || [])
      setPublicRules({
        showTrustScorePublicly: Boolean(
          f?.visibilityRules?.showTrustScorePublicly ?? p?.vendor?.settings?.showTrustScorePublicly ?? true
        ),
        showLocationInFeedback: Boolean(
          f?.visibilityRules?.showLocationInFeedback ?? p?.vendor?.settings?.showLocationInFeedback ?? true
        ),
        enableFeedbackLabels: Boolean(
          f?.visibilityRules?.enableFeedbackLabels ?? p?.vendor?.settings?.enableFeedbackLabels ?? true
        ),
      })
    } catch (e) {
      setError(e?.message || 'Failed to load vendor data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vendorId])

  useEffect(() => {
    setShowAllReviews(false)
  }, [vendorId])

  useEffect(() => {
    let cancelled = false
    async function check() {
      if (mode !== 'verified' || !vendorId) {
        setCodeCheck({ checking: false, valid: null, order: null })
        return
      }
      const c = code.trim()
      if (!c) {
        setCodeCheck({ checking: false, valid: null, order: null })
        return
      }
      try {
        setCodeCheck((s) => ({ ...s, checking: true }))
        const data = await apiGet(`/api/public/vendor/${vendorId}/verify-code/${encodeURIComponent(c)}`)
        if (cancelled) return
        setCodeCheck({ checking: false, valid: Boolean(data.valid), order: data.order || null })
      } catch {
        if (cancelled) return
        setCodeCheck({ checking: false, valid: false, order: null })
      }
    }
    check()
    return () => {
      cancelled = true
    }
  }, [code, mode, vendorId])

  async function onSubmit(e) {
    e.preventDefault()
    if (!vendorId) return

    const trimmed = text.trim()
    if (!trimmed) {
      setSubmitState({ submitting: false, result: null, warning: 'Feedback text is required.' })
      return
    }

    if (!hasSelectedRating) {
      setSubmitState({ submitting: false, result: null, warning: 'Please select a star rating before submitting.' })
      return
    }

    if (trimmed.length < MIN_FEEDBACK_CHARS) {
      setSubmitState({
        submitting: false,
        result: null,
        warning: `Please write at least ${MIN_FEEDBACK_CHARS} characters so your review has meaningful detail.`,
      })
      return
    }

    try {
      setSubmitState({ submitting: true, result: null, warning: '' })

      const deviceHash = await getDeviceFingerprintHash()
      const sessionId = getOrCreateSessionId()
      const typingTimeMs = typingStartRef.current ? Date.now() - typingStartRef.current : 0
      const editCount = editCountRef.current
      const firstInputGapMs = firstInputRef.current ? Date.now() - firstInputRef.current : 0
      const maxDeltaChars = maxDeltaCharsRef.current
      const intervals = intervalsRef.current || []
      const typingIntervalsCount = intervals.length
      let typingIntervalMeanMs = 0
      let typingIntervalVarianceMs2 = 0

      if (typingIntervalsCount >= 2) {
        const sum = intervals.reduce((acc, v) => acc + v, 0)
        typingIntervalMeanMs = sum / typingIntervalsCount
        const varianceSum = intervals.reduce((acc, v) => acc + Math.pow(v - typingIntervalMeanMs, 2), 0)
        typingIntervalVarianceMs2 = varianceSum / typingIntervalsCount
      }

      const clientLocation = await fetchClientLocationSnapshot()

      const body = {
        text: trimmed,
        rating,
        serviceHighlights,
        code: mode === 'verified' ? code.trim() : '',
        deviceHash,
        sessionId,
        behavior: {
          typingTimeMs,
          editCount,
          maxDeltaChars,
          firstInputGapMs,
          typingIntervalsCount,
          typingIntervalMeanMs,
          typingIntervalVarianceMs2,
        },
        notReceived,
        clientLocation,
      }

      const data = await apiPost(`/api/public/vendor/${vendorId}/feedbacks`, body)
      setSubmitState({
        submitting: false,
        result: data.result,
        warning: data.result?.code?.provided && !data.result?.code?.valid ? 'Code is invalid; treated as anonymous.' : '',
      })

      // Reset signals for next submission
      typingStartRef.current = null
      editCountRef.current = 0
      firstInputRef.current = null
      lastLengthRef.current = 0
      maxDeltaCharsRef.current = 0
      lastInputTsRef.current = null
      intervalsRef.current = []
      setText('')
      setNotReceived(false)
      setRating(0)
      setServiceHighlights({ response: false, quality: false, delivery: false })
      await refresh()
    } catch (e2) {
      setSubmitState({ submitting: false, result: null, warning: e2?.message || 'Submit failed' })
    }
  }

  function onTextChange(next) {
    if (!typingStartRef.current) typingStartRef.current = Date.now()
    if (!firstInputRef.current) firstInputRef.current = Date.now()
    editCountRef.current += 1

    const now = Date.now()
    if (lastInputTsRef.current) {
      const delta = now - lastInputTsRef.current
      if (delta > 0 && delta <= 5000) {
        intervalsRef.current.push(delta)
        if (intervalsRef.current.length > 200) intervalsRef.current.shift()
      }
    }
    lastInputTsRef.current = now

    const prevLen = lastLengthRef.current || 0
    const delta = Math.abs((next || '').length - prevLen)
    if (delta > maxDeltaCharsRef.current) maxDeltaCharsRef.current = delta
    lastLengthRef.current = (next || '').length

    setText(next)
  }

  function handleNotReceivedToggle(nextChecked) {
    setNotReceived(nextChecked)
  }

  function toggleServiceHighlight(key) {
    setServiceHighlights((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  return (
    <div className="publicPage revealUp" style={{ '--reveal-delay': '0ms' }}>
      <section className="publicHero">
        <div className="publicSectionInner publicSectionInner--hero">
          <p className="publicEyebrow">Public Trust Layer</p>
          <h1>Public Reviews Backed by Proof</h1>
          <p>
            AI-verified scoring, privacy-safe signals, and seamless feedback submission.
            <br />
            Every review is blockchain-anchored for tamper-evident trust.
          </p>
        </div>
      </section>

      <section className="publicMainSection">
        <div className="publicSectionInner publicTopGrid">
          <section className="card publicPanel publicPanel--profile">
            <div className="cardTitle">Vendor Public Profile (read-only)</div>

            <div className="field" style={{ marginBottom: 10 }}>
              <label>Vendor</label>
              <select className="select" value={vendorId} onChange={(e) => setVendorId(e.target.value)}>
                {vendorOptions.map((v) => (
                  <option key={v._id} value={v._id}>
                    {v.name}{v.category ? ` — ${v.category}` : ''}
                  </option>
                ))}
              </select>
            </div>

            {loading ? <div className="muted">Loading…</div> : null}
            {error ? <div className="alert error">{error}</div> : null}

            {profile ? (
              <article className="publicVendorSpotlight">
                <div className="publicVendorTop">
                  <div className="publicVendorMain">
                    <div className="publicVendorIdentity">
                      <h3>{profile.name}</h3>
                      <p>
                        {profile?.businessCategory
                          ? `${profile.businessCategory} vendor profile`
                          : 'Verified vendor profile'}
                      </p>
                    </div>

                    <div className="publicVendorSpotlightBody publicVendorSpotlightBody--compact">
                      <div className="publicVendorLogoWrap" aria-label="Vendor logo">
                        {hasBusinessLogo ? (
                          <img
                            src={profile.businessLogo}
                            alt={`${profile.name || 'Vendor'} logo`}
                            className="publicVendorLogoLarge"
                          />
                        ) : (
                          <span className="publicVendorLogoFallback">{vendorInitial}</span>
                        )}
                      </div>

                      <div className="publicVendorStats">
                        <div className="publicVendorStatLine">
                          <ProfileStatIcon kind="trust" />
                          <span className="publicVendorStatText">
                            Average Trust Score{' '}
                            <strong>{hasVendorReviews ? `${vendorAverageScore}/100` : 'Not yet rated'}</strong>
                          </span>
                        </div>
                        <div className="publicVendorStatLine">
                          <ProfileStatIcon kind="feedbacks" />
                          <span className="publicVendorStatText">
                            Total Feedbacks <strong>{vendorFeedbackCount}</strong>
                          </span>
                        </div>
                        <div className="publicVendorVerified">
                          <ProfileStatIcon kind="verified" />
                          <span>Verified Vendor</span>
                        </div>
                      </div>

                      <div className="publicVendorStatusStack">
                        <div className="publicVendorRingWrap publicVendorRingWrap--status">
                          {vendorDisplayScore != null ? (
                            <div
                              className={vendorTrustRingClass(vendorDisplayScore)}
                              style={{ '--ring-progress': `${vendorDisplayScore}%` }}
                            >
                              <span>{vendorDisplayScore}</span>
                            </div>
                          ) : (
                            <div className={vendorTrustRingClass(vendorDisplayScore)}>
                              <span>--</span>
                            </div>
                          )}
                        </div>
                        <span className={vendorStatusPillClass(vendorStatusText)}>{vendorStatusText}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {profileLocationText !== 'Location unavailable' ? (
                  <section className="publicVendorInfoSection publicVendorInfoSection--divider">
                    <h4>Location</h4>
                    <p className="publicVendorInfoText publicVendorInfoText--withIcon">
                      <PublicVendorInfoIcon kind="location" />
                      <span>{profileLocationText}</span>
                    </p>
                  </section>
                ) : null}

                {publicDetailRows.length ? (
                  <section className="publicVendorInfoSection publicVendorInfoSection--divider">
                    <h4>Public Contact and Business Info</h4>
                    <dl className="publicVendorInfoList">
                      {publicDetailRows.map((row) => (
                        <div className="publicVendorInfoRow" key={row.key}>
                          <dt>
                            <span className="publicVendorInfoLabel">
                              <PublicVendorInfoIcon kind={row.key} />
                              <span>{row.label}</span>
                            </span>
                          </dt>
                          <dd>{renderPublicDetailValue(row)}</dd>
                        </div>
                      ))}
                    </dl>
                  </section>
                ) : null}

                {String(profile?.description || '').trim() ? (
                  <section className="publicVendorInfoSection publicVendorInfoSection--divider publicVendorDescription">
                    <h4>About This Vendor</h4>
                    <p className="publicVendorInfoText">{profile.description}</p>
                  </section>
                ) : null}

                {hasAdditionalInfo ? (
                  <section className="publicVendorInfoSection publicVendorInfoSection--divider publicVendorDescription">
                    <h4>{additionalInfoHeading || 'Additional Information'}</h4>
                    <p className="publicVendorInfoText">{additionalInfoResult || 'Not provided'}</p>
                  </section>
                ) : null}
              </article>
            ) : null}
          </section>

          <section className="card publicPanel publicPanel--submit">
            <div className="publicFeedbackShell">
              <header className="publicFeedbackHead">
                <div className="publicFeedbackHeadIcon">
                  <FeedbackPanelIcon kind="shield" />
                </div>
                <div className="cardTitle publicFeedbackTitle">Submit Feedback</div>
                <p className="publicFeedbackSubtitle">
                  Share your experience with <strong>{feedbackTargetName}</strong>
                </p>
              </header>

              <div className="publicFeedbackPrivacy">
                <FeedbackPanelIcon kind="privacy" />
                <div>
                  <strong>Privacy Protected</strong>
                  <p>
                    No login required. Trust checks are verified through behavior analysis, not identity.
                  </p>
                </div>
              </div>

              <form onSubmit={onSubmit} className="publicFeedbackForm">
                <div className="publicFeedbackTopGrid">
                  <div className="field">
                    <label>Mode</label>
                    <select className="select" value={mode} onChange={(e) => setMode(e.target.value)}>
                      <option value="anonymous">Anonymous Feedback</option>
                      <option value="verified">Verified Feedback (via code)</option>
                    </select>
                  </div>

                  <div className="field">
                    <label>Feedback Code (Optional)</label>
                    <input
                      className="input"
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      placeholder="Enter code from your email (e.g., ABC12345)"
                      disabled={mode !== 'verified'}
                    />
                    <div className="publicFeedbackCodeHint">
                      Having a code increases your trust score through payment verification.
                    </div>
                    {mode === 'verified' ? (
                      <div className="publicFeedbackCodeStatus">
                        {codeCheck.checking
                          ? 'Checking code...'
                          : codeCheck.valid === true
                            ? 'Code is valid. Order details auto-filled below.'
                            : codeCheck.valid === false
                              ? 'Code is invalid. You can still submit anonymous feedback.'
                              : 'Enter code to verify your order.'}
                      </div>
                    ) : null}
                  </div>
                </div>

                {mode === 'verified' && codeCheck.valid && codeCheck.order ? (
                  <div className="card publicInlineCard publicFeedbackOrderCard">
                    <div className="cardTitle">Auto-filled order details</div>
                    <div className="kvs">
                      <div className="kv">
                        <div className="k">Client Name</div>
                        <div className="v">{codeCheck.order.customerName || 'Not available'}</div>
                      </div>
                      <div className="kv">
                        <div className="k">Country</div>
                        <div className="v">{codeCheck.order.country || 'Not available'}</div>
                      </div>
                      <div className="kv">
                        <div className="k">Product</div>
                        <div className="v">{codeCheck.order.productDetails}</div>
                      </div>
                      <div className="kv">
                        <div className="k">Price</div>
                        <div className="v">₹{codeCheck.order.price}</div>
                      </div>
                      <div className="kv">
                        <div className="k">Payment</div>
                        <div className="v">{codeCheck.order.paymentStatus}</div>
                      </div>
                      <div className="kv">
                        <div className="k">Delivery</div>
                        <div className="v">{codeCheck.order.deliveryStatus}</div>
                      </div>
                    </div>
                  </div>
                ) : null}

                <div className="field">
                  <label>Service Highlights</label>
                  <div className="publicFeedbackSignalRow" role="group" aria-label="Service highlights">
                    {[
                      { key: 'response', label: 'Response' },
                      { key: 'quality', label: 'Quality' },
                      { key: 'delivery', label: 'Delivery' },
                    ].map((item) => (
                      <button
                        key={item.key}
                        type="button"
                        className={`publicFeedbackSignalBtn ${serviceHighlights[item.key] ? 'is-active' : ''}`}
                        onClick={() => toggleServiceHighlight(item.key)}
                      >
                        <FeedbackPanelIcon kind="thumb" />
                        <span>{item.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="field">
                  <label>Rate this experience</label>
                  <StarRating
                    rating={rating}
                    onChange={setRating}
                    size="lg"
                    className="publicFeedbackStarRating"
                  />
                  <div className="publicFeedbackCodeHint">Click stars to set your rating (1 to 5).</div>
                </div>

                <div className="field">
                  <label>Your Experience</label>
                  <textarea
                    className="textarea publicFeedbackTextarea"
                    value={text}
                    onChange={(e) => onTextChange(e.target.value)}
                    placeholder="Describe your experience in detail. What happened? Was the product as described? How was the delivery?"
                    maxLength={MAX_FEEDBACK_CHARS}
                  />
                  <div className="publicFeedbackCounter">
                    <span>{textCharacterCount}/{MAX_FEEDBACK_CHARS} characters</span>
                    <span className={meetsTextMinimum ? 'is-valid' : 'is-invalid'}>
                      Minimum {MIN_FEEDBACK_CHARS} required
                    </span>
                  </div>
                </div>

                <div className="field publicFeedbackCheckboxRow">
                  <label>
                    <input
                      type="checkbox"
                      checked={notReceived}
                      onChange={(e) => handleNotReceivedToggle(e.target.checked)}
                    />{' '}
                    Mark as “Not Received”
                  </label>
                </div>

                {submitState.warning ? <div className="alert error">{submitState.warning}</div> : null}

                <button className="btn publicFeedbackSubmitBtn" type="submit" disabled={submitState.submitting}>
                  <FeedbackPanelIcon kind="submit" />
                  <span>{submitState.submitting ? 'Submitting...' : 'Submit Feedback & Compute Trust Score'}</span>
                </button>
              </form>
            </div>

            {submitState.result ? (
              <div style={{ marginTop: 12 }} className="card publicInlineCard">
                <div className="cardTitle">Trust Result</div>
                <div className="kvs">
                  <div className="kv">
                    <div className="k">Your Rating</div>
                    <div className="v">{Number(submitState.result.rating || 0).toFixed(1)} / 5</div>
                  </div>
                  <div className="kv">
                    <div className="k">Trust Score</div>
                    <div className="v">{submitState.result.trustScore}</div>
                  </div>
                  <div className="kv">
                    <div className="k">Trust Level</div>
                    <div className="v">{formatTrustLevel(submitState.result.trustLevel)}</div>
                  </div>
                  <div className="kv">
                    <div className="k">Blockchain TX Ref</div>
                    <div className="v">{submitState.result.blockchain?.txRef}</div>
                  </div>
                  <div className="kv">
                    <div className="k">Anchored Hash</div>
                    <div className="v">{submitState.result.blockchain?.hash?.slice(0, 12)}…</div>
                  </div>
                  <div className="kv">
                    <div className="k">Detected Location</div>
                    <div className="v">{formatLocationText(submitState.result.location)}</div>
                  </div>
                  <div className="kv">
                    <div className="k">Location Risk</div>
                    <div className="v">{submitState.result.ipRiskLevel || 'UNKNOWN'}</div>
                  </div>
                </div>

                <div style={{ height: 10 }} />
                <FeedbackExplanation feedback={submitState.result} buttonLabel="Why this score and tags?" />
              </div>
            ) : null}
          </section>
        </div>
      </section>

      <section className="publicReviewsSection">
        <div className="publicSectionInner">
          <section className="card publicPanel publicPanel--reviews">
            <div className="publicReviewsHead">
              <div className="publicReviewsHeadText">
                <div className="cardTitle">Public Reviews (read-only)</div>
                <div className="muted">Transparency over censorship: nothing can be edited or deleted in this demo.</div>
              </div>
              {hiddenReviewCount > 0 ? (
                <button
                  type="button"
                  className="publicViewAllBtn"
                  onClick={() => setShowAllReviews((prev) => !prev)}
                >
                  {showAllReviews ? 'Show Recent 4' : `View All Reviews (${orderedFeedbacks.length})`}
                </button>
              ) : null}
            </div>

            <div style={{ height: 10 }} />
            <div className="list publicReviewsList">
              {orderedFeedbacks.length === 0 ? <div className="muted">No feedbacks yet.</div> : null}
              {visibleFeedbacks.map((f) => {
                const score = clampReviewScore(f.trustScore)
                const reviewRating = clampStarRating(f.rating) ?? deriveRatingFromTrustScore(f.trustScore)
                const reviewRatingText = reviewRating != null ? `${reviewRating.toFixed(1)} / 5` : ''
                const reviewDisplayName = String(f?.displayName || '').trim() || 'Anonymous Reviewer'
                const reviewDisplayLocation = (() => {
                  const area = String(f?.ipArea || '').trim()
                  const city = String(f?.ipCity || '').trim()
                  const state = String(f?.ipState || f?.ipRegion || '').trim()
                  const country =
                    String(f?.displayCountry || '').trim() ||
                    String(f?.ipCountryName || '').trim()

                  const composed = normalizeLocationPieces([area, city, state, country]).join(', ')
                  return composed || 'Location not shared'
                })()
                const reviewProductName = String(f?.productName || '').trim()
                const reviewInitial = String(reviewDisplayName || 'R').trim().charAt(0).toUpperCase() || 'R'
                const highlightsSource =
                  f?.serviceHighlights &&
                  typeof f.serviceHighlights === 'object' &&
                  !Array.isArray(f.serviceHighlights)
                    ? f.serviceHighlights
                    : {}
                const reviewServiceHighlights = [
                  { key: 'response', label: 'Response', enabled: Boolean(highlightsSource.response) },
                  { key: 'quality', label: 'Quality', enabled: Boolean(highlightsSource.quality) },
                  { key: 'delivery', label: 'Delivery', enabled: Boolean(highlightsSource.delivery) },
                ].filter((item) => item.enabled)
                const canShowScore = score != null && publicRules.showTrustScorePublicly
                const visibleTags = publicRules.enableFeedbackLabels ? (f.tags || []) : []
                const canExplainScore =
                  canShowScore &&
                  Boolean(f?.explanation || f?.trustBreakdown || f?.trustBreakdownList || f?.breakdown)

                return (
                  <div key={f._id} className="card publicReviewCard">
                    <div className="publicReviewLayout">
                      <div className="publicReviewScoreStack">
                        <div className="publicReviewScoreTop">
                          <span className={reviewTrustPillClass(canShowScore ? score : null)}>
                            <TrustPillIcon />
                            <span>{reviewTrustLabel(canShowScore ? score : null)}</span>
                          </span>

                          {canShowScore ? (
                            <div className={reviewScoreRingClass(score)} style={{ '--ring-progress': `${score}%` }}>
                              <span className="reviewScoreRingValue">{score}</span>
                            </div>
                          ) : (
                            <div className={reviewScoreRingClass(null)}>
                              <span className="reviewScoreRingValue">--</span>
                            </div>
                          )}
                        </div>

                        {canExplainScore ? <FeedbackExplanation feedback={f} buttonLabel="Why this score and explanation" /> : null}
                      </div>

                      <div className="publicReviewContent">
                        <div className="publicReviewIdentityRow">
                          <div className="publicReviewAvatar" aria-hidden="true">
                            {reviewInitial}
                          </div>
                          <div className="publicReviewIdentityContent">
                            <div className="publicReviewIdentityLine">
                              <strong>{reviewDisplayName}</strong>
                              <span className="publicReviewIdentityDivider">|</span>
                              <span>{reviewDisplayLocation}</span>
                            </div>

                            {reviewRating ? (
                              <div className="publicReviewRatingStrip" title={reviewRatingText}>
                                <StarRating
                                  rating={reviewRating}
                                  onChange={undefined}
                                  readOnly
                                  size="sm"
                                  showValue={false}
                                  className="publicReviewStarRating"
                                />
                                <span className="publicReviewRatingValue">{reviewRatingText}</span>
                              </div>
                            ) : null}
                          </div>
                        </div>

                        <div className="publicReviewProductLine">
                          {reviewProductName ? <span>Product Name : {reviewProductName}</span> : null}
                        </div>

                        {reviewServiceHighlights.length ? (
                          <div className="publicReviewServiceSignals">
                            {reviewServiceHighlights.map((item) => (
                              <span className="publicReviewServiceSignal" key={item.key}>
                                <span>{item.label}</span>
                                <FeedbackPanelIcon kind="thumb" />
                              </span>
                            ))}
                          </div>
                        ) : null}

                        <div className="publicReviewText">{f.text}</div>
                        {visibleTags.length ? (
                          <div className="pillRow reviewTags">
                            {visibleTags.map((t, idx) => {
                              const tagMeta = roleTagMeta(t)
                              return (
                                <span key={`${t}-${idx}`} className={tagMeta.className}>
                                  <RoleTagIcon kind={tagMeta.iconKind} />
                                  <span>{tagMeta.label}</span>
                                </span>
                              )
                            })}
                          </div>
                        ) : null}
                        {!canShowScore ? (
                          <div className="muted">Trust score details are hidden by vendor settings.</div>
                        ) : null}
                        {!publicRules.enableFeedbackLabels ? (
                          <div className="muted">Review badges are hidden by vendor settings.</div>
                        ) : null}
                      </div>

                      <div className="publicReviewFooterDate">{formatReviewDate(f.createdAt)}</div>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        </div>
      </section>
    </div>
  )
}
