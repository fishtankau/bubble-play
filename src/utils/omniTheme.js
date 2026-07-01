import { generatePalette, getContrastColor } from './colors'

// Generate an Omni `customTheme` JSON from the brand's primary/secondary colors.
// Schema reference: https://docs.omni.co/embed/customization/themes
//
// We generate two variants — light and dark — based on the `prefersDark` flag,
// so the embedded dashboard tracks the app's dark-mode toggle.
export function buildOmniCustomTheme(brand, { prefersDark = false } = {}) {
  const primary = brand?.primaryColor || '#6366f1'
  const palette = generatePalette(primary)
  const onPrimary = getContrastColor(primary)

  // Chart series — a 6-color sequence rooted in the brand palette so the
  // first series is always the brand color, the rest harmonize.
  const chartColors = [
    primary,
    palette.primaryDark,
    palette.primaryLight,
    '#64748b', // slate
    '#f59e0b', // amber accent
    '#10b981', // emerald accent
  ]

  if (prefersDark) {
    return {
      'dashboard-background': '#0f172a',
      'dashboard-tile-background': '#1e293b',
      'dashboard-tile-title-color': '#f1f5f9',
      'dashboard-text-color': '#cbd5e1',
      'dashboard-key-color': palette.primaryLight,
      'dashboard-tile-border-color': '#334155',
      'chart-colors': chartColors,
      // Used as foreground on filled buttons/badges
      'on-key-color': onPrimary,
    }
  }

  return {
    'dashboard-background': '#ffffff',
    'dashboard-tile-background': '#ffffff',
    'dashboard-tile-title-color': '#0f172a',
    'dashboard-text-color': '#475569',
    'dashboard-key-color': primary,
    'dashboard-tile-border-color': '#e2e8f0',
    'chart-colors': chartColors,
    'on-key-color': onPrimary,
  }
}
