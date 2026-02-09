const KEY = 'trustlens_session_v1'

export function getSession() {
  try {
    const raw = window.localStorage.getItem(KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export function setSession(session) {
  window.localStorage.setItem(KEY, JSON.stringify(session || null))
}

export function clearSession() {
  window.localStorage.removeItem(KEY)
}

export function getToken() {
  return getSession()?.token || ''
}
