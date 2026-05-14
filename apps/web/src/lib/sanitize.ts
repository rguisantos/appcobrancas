/**
 * Sanitize a CSS color value to prevent CSS injection attacks.
 * Only allows hex colors (#RRGGBB, #RGB) and rgb/rgba() formats.
 */
export function sanitizeColor(color: string | null | undefined): string {
  if (!color) return '#000000'
  
  const trimmed = color.trim()
  
  // Allow hex colors: #RGB or #RRGGBB or #RRGGBBAA
  if (/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(trimmed)) {
    return trimmed
  }
  
  // Allow rgb() and rgba() with numeric values only
  const rgbMatch = trimmed.match(/^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*(?:,\s*[01]?\.?\d*\s*)?\)$/)
  if (rgbMatch) {
    const [, r, g, b] = rgbMatch
    if (Number(r) <= 255 && Number(g) <= 255 && Number(b) <= 255) {
      return trimmed
    }
  }
  
  // Default fallback for invalid colors
  return '#000000'
}
