const KG_PATTERN = /^\d+(\.\d{1,2})?$/

// Returns the kilograms as a number, or null when the text is not a number with at most
// 2 decimals. Phone keypads in some languages type a comma as the decimal separator.
export function parseKg(text) {
  const value = text.trim().replace(',', '.')
  return KG_PATTERN.test(value) ? Number(value) : null
}
