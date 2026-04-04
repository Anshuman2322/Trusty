import { getToken } from './session'

const configuredApiBase = String(import.meta.env.VITE_API_URL || '').trim().replace(/\/$/, '')
const isLocalBrowser = typeof window !== 'undefined' && ['localhost', '127.0.0.1'].includes(window.location.hostname)
const fallbackApiBase = isLocalBrowser ? 'http://localhost:5000' : ''
const API_BASE = configuredApiBase || fallbackApiBase
export { API_BASE }

function getApiBaseCandidates() {
  const localApiBase = 'http://localhost:5000'
  const candidates = []

  // In local development, prefer local backend first.
  if (isLocalBrowser) {
    candidates.push(localApiBase)
  }

  candidates.push(API_BASE)
  return [...new Set(candidates.filter(Boolean))]
}

async function request(path, options = {}) {
  const token = getToken()
  let res
  let networkError = null
  const baseCandidates = getApiBaseCandidates()
  const localApiBase = 'http://localhost:5000'

  for (const base of baseCandidates) {
    try {
      res = await fetch(`${base}${path}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(options.headers || {}),
        },
      })

      // If hosted API is temporarily down, try local backend during local development.
      if (
        res.status >= 500 &&
        isLocalBrowser &&
        base !== localApiBase &&
        baseCandidates.includes(localApiBase)
      ) {
        res = undefined
        continue
      }

      networkError = null
      break
    } catch (err) {
      networkError = err
    }
  }

  if (!res) {
    const fallbackInfo = baseCandidates.length > 1 ? ` (tried: ${baseCandidates.join(', ')})` : ''
    throw new Error(`Failed to fetch: cannot reach backend${fallbackInfo}. Check server and CORS settings.`)
  }

  const data = await res.json().catch(() => ({}))
  if (!res.ok || data?.ok === false) {
    const msg = data?.error?.message || `Request failed (${res.status})`
    const err = new Error(msg)
    err.status = res.status
    err.payload = data
    throw err
  }
  return data
}

export async function apiGet(path) {
  return request(path)
}

export async function apiPost(path, body) {
  return request(path, { method: 'POST', body: JSON.stringify(body || {}) })
}

export async function apiGetBlob(path) {
  const token = getToken()
  let res
  try {
    res = await fetch(`${API_BASE}${path}`, {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    })
  } catch {
    throw new Error(`Failed to fetch file: cannot reach backend at ${API_BASE} (CORS or server down)`)
  }

  if (!res.ok) {
    throw new Error(`File request failed (${res.status})`)
  }

  return res.blob()
}
