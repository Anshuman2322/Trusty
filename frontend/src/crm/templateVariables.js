export const TEMPLATE_VARIABLE_REGEX = /{{\s*([a-zA-Z0-9_]+)\s*}}/g

export function extractVariables(template) {
  const text = String(template || '')
  const found = []
  const seen = new Set()
  let match

  TEMPLATE_VARIABLE_REGEX.lastIndex = 0
  while ((match = TEMPLATE_VARIABLE_REGEX.exec(text)) !== null) {
    const key = match[1]
    if (!seen.has(key)) {
      seen.add(key)
      found.push(key)
    }
  }

  return found
}

export function renderTemplate(template, data) {
  const text = String(template || '')
  const values = data || {}
  return text.replace(TEMPLATE_VARIABLE_REGEX, (_, key) => {
    const value = values[key]
    return value === undefined || value === null ? '' : String(value)
  })
}
