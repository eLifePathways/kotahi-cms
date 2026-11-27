import { useEffect } from 'react'
import {
  defaultWebsiteSettings,
  googleFontsUrl,
  type WebsiteSettings,
} from '@shared/website'

type Theme = WebsiteSettings['theme']

const defaults = defaultWebsiteSettings.theme

/**
 * The admin pages that aren't about one group (dashboard, Manage Groups,
 * users, analytics): Kotahi's fonts and secondary grey, with a dark grey
 * primary in place of the green, so they read as the CMS rather than a group.
 */
export const globalAdminTheme: Theme = {
  ...defaults,
  primaryColor: '#1f2937',
}

const hexToRgb = (hex: string): [number, number, number] => {
  const value = parseInt(hex.slice(1), 16)

  return [(value >> 16) & 255, (value >> 8) & 255, value & 255]
}

// "#4a7c59" → [138, 25.3, 38.8], as hue, saturation % and lightness %.
const hexToHsl = (hex: string): [number, number, number] => {
  const [r, g, b] = hexToRgb(hex).map(channel => channel / 255)
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const lightness = (max + min) / 2
  const delta = max - min

  if (delta === 0) return [0, 0, Math.round(lightness * 1000) / 10]

  const saturation = delta / (1 - Math.abs(2 * lightness - 1))
  const hue =
    max === r
      ? ((g - b) / delta) % 6
      : max === g
        ? (b - r) / delta + 2
        : (r - g) / delta + 4

  return [
    Math.round(((hue * 60 + 360) % 360) * 10) / 10,
    Math.round(saturation * 1000) / 10,
    Math.round(lightness * 1000) / 10,
  ]
}

// The "H S% L%" form the theme's CSS variables hold (client/src/index.css).
const hslComponents = ([h, s, l]: [number, number, number]) =>
  `${h} ${s}% ${l}%`

// WCAG relative luminance and contrast ratio.
const luminance = (hex: string) => {
  const [r, g, b] = hexToRgb(hex).map(channel => {
    const c = channel / 255

    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })

  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/** The WCAG contrast ratio of two #rrggbb colours, from 1 to 21. */
export const contrastRatio = (a: string, b: string) => {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x)

  return (light + 0.05) / (dark + 0.05)
}

// [138, 25.3, 38.8] → "#4a7c59"
const hslToHex = ([h, s, l]: [number, number, number]) => {
  const saturation = s / 100
  const lightness = l / 100
  const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation
  const x = chroma * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = lightness - chroma / 2
  const [r, g, b] =
    h < 60
      ? [chroma, x, 0]
      : h < 120
        ? [x, chroma, 0]
        : h < 180
          ? [0, chroma, x]
          : h < 240
            ? [0, x, chroma]
            : h < 300
              ? [x, 0, chroma]
              : [chroma, 0, x]

  return `#${[r, g, b]
    .map(channel =>
      Math.round((channel + m) * 255)
        .toString(16)
        .padStart(2, '0'),
    )
    .join('')}`
}

// Kotahi's secondary is its grey: muted text, and the light surfaces (as
// index.css derives them from #6b7280) are tints of it. As light as
// index.css's, which lets the default grey and green pass WCAG AA on them.
const surfaceTint = (secondaryColor: string): [number, number, number] => {
  const [h, s] = hexToHsl(secondaryColor)

  return [h, Math.min(s * 1.6, 30), 97.2]
}

const WHITE = '#ffffff'
const NEAR_BLACK = '#111111' // the theme's foreground

/** White or near-black, whichever reads better on the colour. */
export const readableTextOn = (hex: string) =>
  contrastRatio(hex, WHITE) >= contrastRatio(hex, NEAR_BLACK)
    ? WHITE
    : NEAR_BLACK

/**
 * The CSS variables that restyle the app for a theme. Only what differs from
 * the defaults is set, so the default theme leaves index.css untouched.
 */
export const themeCssVariables = (theme: Theme): Record<string, string> => {
  const variables: Record<string, string> = {}

  if (theme.primaryColor.toLowerCase() !== defaults.primaryColor) {
    const primary = hslComponents(hexToHsl(theme.primaryColor))
    const foreground = hslComponents(
      hexToHsl(readableTextOn(theme.primaryColor)),
    )

    for (const name of [
      '--primary',
      '--link',
      '--ring',
      '--chart-1',
      '--sidebar-primary',
      '--sidebar-ring',
    ]) {
      variables[name] = primary
    }

    variables['--primary-foreground'] = foreground
    variables['--sidebar-primary-foreground'] = foreground
  }

  if (theme.secondaryColor.toLowerCase() !== defaults.secondaryColor) {
    const surface = hslComponents(surfaceTint(theme.secondaryColor))

    variables['--muted-foreground'] = hslComponents(
      hexToHsl(theme.secondaryColor),
    )

    for (const name of ['--secondary', '--muted', '--accent']) {
      variables[name] = surface
    }
  }

  if (theme.sansSerifFont !== defaults.sansSerifFont) {
    variables['--font-sans'] =
      `'${theme.sansSerifFont}', ui-sans-serif, system-ui, sans-serif`
  }

  if (theme.serifFont !== defaults.serifFont) {
    variables['--font-heading'] =
      `'${theme.serifFont}', ui-serif, Georgia, serif`
  }

  return variables
}

// WCAG AA for normal text (success criterion 1.4.3), as Kotahi checks.
export const WCAG_AA_CONTRAST = 4.5

// index.css's light surface (--secondary, --muted, --accent) for Kotahi's
// default grey.
const DEFAULT_SURFACE = '#f7f8f9'

export type ContrastIssue = {
  // Where the colour fails, e.g. "on white".
  where: string
  ratio: number
}

/**
 * Where a theme's colours fall short of WCAG AA, as the app uses them. The
 * primary colour is text (links, headings) on white and on the light grey
 * surfaces, and the background of buttons whose label is white or
 * near-black, whichever reads better. The secondary colour is muted text on
 * white and on the surfaces, which are a light tint of it.
 */
export const wcagContrastIssues = (
  theme: Pick<Theme, 'primaryColor' | 'secondaryColor'>,
): { primary: ContrastIssue[]; secondary: ContrastIssue[] } => {
  const { primaryColor, secondaryColor } = theme

  const check = (colour: string, against: string, where: string) => {
    const ratio = contrastRatio(colour, against)

    return ratio < WCAG_AA_CONTRAST ? [{ where, ratio }] : []
  }

  const buttonText = readableTextOn(primaryColor)
  const surface =
    secondaryColor.toLowerCase() === defaults.secondaryColor
      ? DEFAULT_SURFACE
      : hslToHex(surfaceTint(secondaryColor))

  return {
    primary: [
      ...check(primaryColor, WHITE, 'as text on white (links, headings)'),
      ...check(primaryColor, surface, 'as text on the light grey surfaces'),
      ...check(
        primaryColor,
        buttonText,
        `behind ${buttonText === WHITE ? 'white' : 'dark'} button text`,
      ),
    ],
    secondary: [
      ...check(secondaryColor, WHITE, 'as text on white'),
      ...check(secondaryColor, surface, 'as text on the light grey surfaces'),
    ],
  }
}

type ThemeFonts = Pick<Theme, 'serifFont' | 'sansSerifFont'>

/**
 * Loads the fonts of one or more themes while mounted, in one request. The
 * defaults come with index.html, so they're not loaded again.
 */
export const useGoogleFonts = (themes: ThemeFonts | ThemeFonts[]) => {
  const families = [
    ...new Set(
      (Array.isArray(themes) ? themes : [themes]).flatMap(theme => [
        theme.serifFont,
        theme.sansSerifFont,
      ]),
    ),
  ]
    .filter(
      family =>
        family !== defaults.serifFont && family !== defaults.sansSerifFont,
    )
    .sort()
    .join('|')

  useEffect(() => {
    if (!families) return undefined

    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = googleFontsUrl(families.split('|'))
    document.head.appendChild(link)

    return () => link.remove()
  }, [families])
}

/** Applies a theme's colours, fonts and favicon to the page while mounted. */
export const useApplyTheme = (theme: Theme | undefined) => {
  useGoogleFonts(theme ?? defaults)

  const variables = JSON.stringify(theme ? themeCssVariables(theme) : {})

  useEffect(() => {
    const root = document.documentElement
    const entries = Object.entries(
      JSON.parse(variables) as Record<string, string>,
    )

    for (const [name, value] of entries) root.style.setProperty(name, value)

    return () => {
      for (const [name] of entries) root.style.removeProperty(name)
    }
  }, [variables])

  const faviconUrl = theme?.faviconUrl

  useEffect(() => {
    if (!faviconUrl) return undefined

    const existing =
      document.querySelector<HTMLLinkElement>('link[rel~="icon"]')
    const link = existing ?? document.createElement('link')
    const previousHref = existing?.getAttribute('href')

    link.rel = 'icon'
    link.href = faviconUrl
    if (!existing) document.head.appendChild(link)

    return () => {
      if (!existing) link.remove()
      else if (previousHref) link.setAttribute('href', previousHref)
      else link.removeAttribute('href')
    }
  }, [faviconUrl])
}
