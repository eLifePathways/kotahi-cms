import { z } from 'zod'

// A group's website settings: its description, contact details and look.
// Stored as the formData of the group's 'general' settings row.

// Curated Google Fonts for the font pickers; the first of each is the
// default. Admins can also pick any other Google Font ("Other..."), which the
// server checks with Google before saving.
export const serifFonts = [
  'Roboto Slab',
  'Bitter',
  'Crimson Pro',
  'EB Garamond',
  'Libre Baskerville',
  'Literata',
  'Lora',
  'Merriweather',
  'Noto Serif',
  'Playfair Display',
  'PT Serif',
  'Source Serif 4',
  'Spectral',
  'Zilla Slab',
]

export const sansSerifFonts = [
  'Work Sans',
  'DM Sans',
  'Figtree',
  'IBM Plex Sans',
  'Inter',
  'Lato',
  'Montserrat',
  'Noto Sans',
  'Nunito Sans',
  'Open Sans',
  'Poppins',
  'Public Sans',
  'Raleway',
  'Source Sans 3',
]

export const isCuratedFont = (family: string) =>
  serifFonts.includes(family) || sansSerifFonts.includes(family)

const HEX_COLOUR = /^#[0-9a-f]{6}$/i

// Google Fonts family names are letters, digits and spaces (as in "M PLUS
// 1p"), with the odd hyphen. Nothing else, so they're safe inside CSS quotes.
export const fontFamilySchema = z
  .string()
  .trim()
  .regex(/^[A-Za-z0-9][A-Za-z0-9 -]{0,63}$/, {
    error: 'Enter a Google Fonts family name',
  })

const optionalText = z.string().trim().max(2000)

export const websiteSettingsSchema = z.object({
  description: optionalText,
  // Shown on /:groupSlug/contact; each part only when filled in.
  contact: z.object({
    email: z.union([z.literal(''), z.email()]),
    phone: optionalText,
    address: optionalText,
    officeHours: optionalText,
    mediaIntro: optionalText,
    mediaEmail: z.union([z.literal(''), z.email()]),
  }),
  theme: z.object({
    // Uploaded images (/api/upload), or null for none.
    faviconUrl: z.string().nullable(),
    // Not shown yet: for the header layouts in docs/backlog.md.
    logoUrl: z.string().nullable(),
    // A banner across the group's home page, under the navigation.
    heroImageUrl: z.string().nullable(),
    showHeroImage: z.boolean(),
    // Kotahi's primary and secondary colours, as #rrggbb.
    primaryColor: z
      .string()
      .regex(HEX_COLOUR, { error: 'Use a #rrggbb colour' }),
    secondaryColor: z
      .string()
      .regex(HEX_COLOUR, { error: 'Use a #rrggbb colour' }),
    serifFont: fontFamilySchema,
    sansSerifFont: fontFamilySchema,
  }),
})

export type WebsiteSettings = z.infer<typeof websiteSettingsSchema>

// The app's own look (client/src/index.css), which is Kotahi's default.
export const defaultWebsiteSettings: WebsiteSettings = {
  description: '',
  contact: {
    email: '',
    phone: '',
    address: '',
    officeHours: '',
    mediaIntro: '',
    mediaEmail: '',
  },
  theme: {
    faviconUrl: null,
    logoUrl: null,
    heroImageUrl: null,
    showHeroImage: false,
    primaryColor: '#4a7c59',
    secondaryColor: '#6b7280',
    serifFont: 'Roboto Slab',
    sansSerifFont: 'Work Sans',
  },
}

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

// Stored settings over the defaults, so rows saved before a setting existed
// (or with an older shape) still give a complete, valid object. A section
// that doesn't validate falls back to its defaults on its own.
export const withWebsiteDefaults = (stored: unknown): WebsiteSettings => {
  const source = isObject(stored) ? stored : {}
  const { shape } = websiteSettingsSchema
  const storedSection = (key: string) =>
    isObject(source[key]) ? source[key] : {}

  const description = shape.description.safeParse(source.description)
  const contact = shape.contact.safeParse({
    ...defaultWebsiteSettings.contact,
    ...storedSection('contact'),
  })
  const theme = shape.theme.safeParse({
    ...defaultWebsiteSettings.theme,
    ...storedSection('theme'),
  })

  return {
    description: description.success
      ? description.data
      : defaultWebsiteSettings.description,
    contact: contact.success ? contact.data : defaultWebsiteSettings.contact,
    theme: theme.success ? theme.data : defaultWebsiteSettings.theme,
  }
}

// The Google Fonts stylesheet for the families. The original CSS API, as it
// serves whichever of the weights a family has; the newer css2 API rejects
// the whole request if one is missing, and custom fonts' weights are unknown.
export const googleFontsUrl = (families: string[]): string =>
  `https://fonts.googleapis.com/css?family=${families
    .map(family => `${encodeURIComponent(family)}:300,400,500,600,700`)
    .join('|')}&display=swap`
