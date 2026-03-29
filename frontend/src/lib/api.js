import { getToken } from './session'

const API_BASE = import.meta.env.VITE_API_URL || "https://trusty-tnsg.onrender.com";
console.log("API_BASE:", API_BASE);
console.log("NEW BUILD TRIGGER");
export { API_BASE }
async function request(path, options = {}) {
  const token = getToken()
  let res
  try {
    res = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {}),
      },
    })
  } catch {
    throw new Error(`Failed to fetch: cannot reach backend at ${API_BASE} (CORS or server down)`)
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
