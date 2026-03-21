export function AboutIcon({ name }) {
  if (name === 'shield') {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M12 3l7 3v5c0 5-3.2 8.6-7 10-3.8-1.4-7-5-7-10V6l7-3z" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  }

  if (name === 'bot') {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <rect x="5" y="7" width="14" height="11" rx="3" stroke="currentColor" strokeWidth="1.9" />
        <path d="M12 4v3M9 12h.01M15 12h.01" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
      </svg>
    )
  }

  if (name === 'hidden') {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M3 3l18 18" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
        <path d="M10.6 10.6a2 2 0 002.8 2.8" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
        <path d="M9.4 5.4A10.2 10.2 0 0121 12s-1.4 2.3-3.9 4.2M6.8 6.9C4 8.8 3 12 3 12s3.2 5.2 9 5.2a9.5 9.5 0 003.3-.6" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
      </svg>
    )
  }

  if (name === 'verify') {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.9" />
        <path d="M8 12.4l2.7 2.7L16 9.8" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  }

  if (name === 'score') {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M4 18V9M9 18V6M14 18v-4M19 18V8" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
      </svg>
    )
  }

  if (name === 'lock') {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <rect x="5" y="10" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.9" />
        <path d="M8 10V8a4 4 0 118 0v2" stroke="currentColor" strokeWidth="1.9" />
      </svg>
    )
  }

  if (name === 'chain') {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M9.4 8.6l2.2-2.2a3 3 0 014.2 4.2l-2.1 2.1M14.6 15.4l-2.2 2.2a3 3 0 11-4.2-4.2l2.1-2.1" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
        <path d="M9 15l6-6" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
      </svg>
    )
  }

  if (name === 'eye') {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M2.5 12s3.4-6 9.5-6 9.5 6 9.5 6-3.4 6-9.5 6-9.5-6-9.5-6z" stroke="currentColor" strokeWidth="1.9" strokeLinejoin="round" />
        <circle cx="12" cy="12" r="2.5" stroke="currentColor" strokeWidth="1.9" />
      </svg>
    )
  }

  if (name === 'token') {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <rect x="5" y="5" width="14" height="14" rx="3" stroke="currentColor" strokeWidth="1.9" />
        <path d="M9 12h6" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
      </svg>
    )
  }

  if (name === 'payment') {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <rect x="3" y="6" width="18" height="12" rx="2" stroke="currentColor" strokeWidth="1.9" />
        <path d="M3 10h18" stroke="currentColor" strokeWidth="1.9" />
        <circle cx="16.5" cy="14" r="1.3" fill="currentColor" />
      </svg>
    )
  }

  if (name === 'behavior') {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M5 18V9M10 18V6M15 18v-4M20 18V8" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
      </svg>
    )
  }

  if (name === 'device') {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <rect x="7" y="3" width="10" height="18" rx="2.2" stroke="currentColor" strokeWidth="1.9" />
        <path d="M10 6h4M11 17h2" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
      </svg>
    )
  }

  if (name === 'context') {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M4 6h16v10H8l-4 3V6z" stroke="currentColor" strokeWidth="1.9" strokeLinejoin="round" />
        <path d="M8 10h8M8 13h5" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
      </svg>
    )
  }

  if (name === 'vector') {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="6" cy="6" r="2" stroke="currentColor" strokeWidth="1.9" />
        <circle cx="18" cy="8" r="2" stroke="currentColor" strokeWidth="1.9" />
        <circle cx="8" cy="18" r="2" stroke="currentColor" strokeWidth="1.9" />
        <path d="M7.8 7.2l8.4 1.6M7.3 16.4L16.8 9.4" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
      </svg>
    )
  }

  if (name === 'brain') {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M9 5a3 3 0 00-3 3v7a3 3 0 003 3m6-13a3 3 0 013 3v7a3 3 0 01-3 3M9 9h6M9 13h6" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
      </svg>
    )
  }

  if (name === 'spark') {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M12 3l1.7 4.1L18 9l-4.3 1.9L12 15l-1.7-4.1L6 9l4.3-1.9L12 3z" stroke="currentColor" strokeWidth="1.9" strokeLinejoin="round" />
      </svg>
    )
  }

  return null
}
