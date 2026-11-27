import { googleFontsUrl } from '@shared/website'

// Google Fonts' own catalogue, as fonts.google.com loads it. Unofficial but
// keyless; the official Developer API needs an API key.
const METADATA_URL = 'https://fonts.google.com/metadata/fonts'
const CACHE_FOR = 24 * 60 * 60 * 1000 // a day

export type GoogleFontFamily = {
  family: string
  // As Google Fonts classes it: Serif, Sans Serif, Display, Handwriting or
  // Monospace.
  category: string
}

type Metadata = {
  familyMetadataList?: Array<{
    family?: unknown
    category?: unknown
    popularity?: unknown
  }>
}

let cache: { families: GoogleFontFamily[]; fetchedAt: number } | null = null

/**
 * Every Google Fonts family, most popular first. Cached for a day; a failed
 * refresh keeps serving the last list.
 */
export const getGoogleFontFamilies = async (): Promise<GoogleFontFamily[]> => {
  if (cache && Date.now() - cache.fetchedAt < CACHE_FOR) return cache.families

  try {
    const response = await fetch(METADATA_URL)

    if (!response.ok) {
      throw new Error(`Google Fonts responded with ${response.status}`)
    }

    const { familyMetadataList = [] } = (await response.json()) as Metadata

    // The catalogue is alphabetical; `popularity` is a rank, 1 the most used.
    const rank = (popularity: unknown) =>
      typeof popularity === 'number' ? popularity : Infinity

    const families = [...familyMetadataList]
      .sort((a, b) => rank(a.popularity) - rank(b.popularity))
      .flatMap(({ category, family }) =>
        typeof family === 'string' && typeof category === 'string'
          ? [{ family, category }]
          : [],
      )

    if (!families.length) throw new Error('Google Fonts listed no fonts')

    cache = { families, fetchedAt: Date.now() }

    return families
  } catch (error) {
    if (cache) return cache.families

    throw error
  }
}

/**
 * Whether Google Fonts serves the family: its CSS API answers 400 for an
 * unknown one. Throws when Google Fonts can't be reached.
 */
export const googleFontExists = async (family: string): Promise<boolean> => {
  const response = await fetch(googleFontsUrl([family]))

  if (response.ok) return true
  if (response.status === 400) return false

  throw new Error(`Google Fonts responded with ${response.status}`)
}
