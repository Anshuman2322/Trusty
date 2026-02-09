function getOrCreateDeviceId() {
  // Per-browser salt to prevent cross-site correlation.
  // This is not identity; it only stabilizes the hash for repetition detection.
  const key = 'tl_device_salt'
  const existing = localStorage.getItem(key)
  if (existing) return existing
  const created = (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random())
  localStorage.setItem(key, created)
  return created
}

export function getOrCreateSessionId() {
  const key = 'tl_session_id'
  const existing = sessionStorage.getItem(key)
  if (existing) return existing
  const created = (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random())
  sessionStorage.setItem(key, created)
  return created
}

function detectBrowser(ua) {
  const u = String(ua || '')
  if (/Edg\//.test(u)) return 'Edge'
  if (/Chrome\//.test(u) && !/Edg\//.test(u)) return 'Chrome'
  if (/Firefox\//.test(u)) return 'Firefox'
  if (/Safari\//.test(u) && !/Chrome\//.test(u)) return 'Safari'
  return 'Other'
}

function detectOS(ua) {
  const u = String(ua || '')
  if (/Windows NT/.test(u)) return 'Windows'
  if (/Android/.test(u)) return 'Android'
  if (/iPhone|iPad|iPod/.test(u)) return 'iOS'
  if (/Mac OS X/.test(u)) return 'macOS'
  if (/Linux/.test(u)) return 'Linux'
  return 'Other'
}

function getCoarseDeviceMeta() {
  const ua = navigator.userAgent || ''
  const browser = detectBrowser(ua)
  const os = detectOS(ua)
  const screenRes = `${window.screen?.width || 0}x${window.screen?.height || 0}`
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || ''
  const locale = navigator.language || ''
  const country = locale.includes('-') ? locale.split('-')[1] : ''
  return { browser, os, screenRes, timezone, country }
}

function bytesToHex(bytes) {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

export async function getDeviceFingerprintHash() {
  // Hash only coarse environment data + a local salt. No IP/GPS/hardware IDs.
  const salt = getOrCreateDeviceId()
  const meta = getCoarseDeviceMeta()
  const payload = JSON.stringify({ ...meta, salt })
  const enc = new TextEncoder().encode(payload)
  const digest = await crypto.subtle.digest('SHA-256', enc)
  return bytesToHex(new Uint8Array(digest))
}
