const BANNED_PATTERN = /banned|prohibit|interdit/i
const PERCENT_PATTERN = /(\d+(?:[.,]\d+)?)\s*%/

/**
 * Parses an IFRA limit string (e.g. "0.17 % Cat.4", "PROHIBITED", "indirect (~1 %)")
 * into a usable ceiling percentage. Returns 0 for an outright ban, null when the
 * text carries no quantifiable limit (e.g. "Non restreint", "?").
 */
export function parseIfraLimitPercent(ifraLimit?: string): number | null {
  if (!ifraLimit) return null
  if (BANNED_PATTERN.test(ifraLimit)) return 0
  const match = ifraLimit.match(PERCENT_PATTERN)
  if (!match) return null
  return parseFloat(match[1].replace(',', '.'))
}
