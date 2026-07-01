// Derive an Omni-safe `entity` key from a website URL.
// e.g. "https://www.portseattle.org/sea-tac" -> "portseattle"
//      "https://www.mypassglobal.com/about-us" -> "mypassglobal"
//      "stripe.com" -> "stripe"
export function domainToEntityKey(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') return ''
  try {
    const withProto = rawUrl.startsWith('http') ? rawUrl : `https://${rawUrl}`
    const u = new URL(withProto)
    const host = u.hostname.replace(/^www\./i, '')
    const firstLabel = host.split('.')[0] || ''
    return firstLabel.toLowerCase().replace(/[^a-z0-9-]/g, '')
  } catch {
    return ''
  }
}
