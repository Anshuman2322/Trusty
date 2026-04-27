export interface ParsedLead {
  name?: string
  email?: string
  phone?: string
  country?: string
  productRaw?: string
  productName?: string
  dosage?: string
  quantity?: number
  source: string
}

export function parseRawLead(raw: string): ParsedLead {
  const get = (re: RegExp) => raw.match(re)?.[1]?.trim()

  const emailMatch = raw.match(/([\w.+-]+@[\w-]+\.[\w.-]+)/i)
  const email = emailMatch?.[1]
  const phone = get(/(\+?\d[\d\s().-]{7,}\d)/)
  const name = get(/name[:\s]+([^\n]+)/i)
  const country = get(/country[:\s]+([^\n]+)/i)
  const product = get(/product[:\s]+([^\n]+)/i)
  const dosage = product?.match(/(\d+\s?(?:mg|ml|g|mcg))/i)?.[1]
  const productName = product?.replace(/\d+\s?(?:mg|ml|g|mcg)/i, '').trim()
  const qty = get(/(?:qty|quantity)[:\s]+(\d[\d,]*)/i)

  return {
    name,
    email,
    phone,
    country,
    productRaw: product,
    productName,
    dosage,
    quantity: qty ? Number.parseInt(qty.replace(/,/g, ''), 10) : undefined,
    source: /indiamart/i.test(raw) ? 'IndiaMART' : /whatsapp/i.test(raw) ? 'WhatsApp' : 'Manual paste',
  }
}
