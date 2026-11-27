import { KotahiReviewField, KotahiSettingsFormData } from './schema'

import { parse, isValid } from 'date-fns'

const POSSIBLE_FORMATS = [
  'yyyy-MM-dd',
  'yyyy/MM/dd',
  'dd/MM/yyyy',
  'MMMM yyyy', // January 2011
  'MMM yyyy', // Jan 2011
  'yyyy', // 2011
]

export const getYearFromInput = (input: string): number => {
  for (const fmt of POSSIBLE_FORMATS) {
    const parsed = parse(input, fmt, new Date())

    if (isValid(parsed)) {
      return parsed.getFullYear()
    }
  }

  const timestamp = Date.parse(input)
  if (!Number.isNaN(timestamp)) return new Date(timestamp).getFullYear()

  return new Date().getFullYear()
}

export const getValidDate = (input: string): string => {
  for (const fmt of POSSIBLE_FORMATS) {
    const parsed = parse(input, fmt, new Date())

    if (isValid(parsed)) {
      return parsed.toISOString().slice(0, 10)
    }
  }

  const ts = Date.parse(input)
  if (!Number.isNaN(ts)) {
    return new Date(ts).toISOString().slice(0, 10)
  }

  return new Date().toISOString().slice(0, 10)
}

export function isKotahiSettingsFormData(
  data: unknown,
): data is KotahiSettingsFormData {
  return (
    typeof data === 'object' &&
    data !== null &&
    'endpoint' in data &&
    'groupId' in data &&
    'apiKey' in data
  )
}
export const getValueFromReviewField = (
  reviewField: KotahiReviewField | undefined,
): string[] => {
  if (!reviewField) return []

  const { value } = reviewField

  if (Array.isArray(value)) return value
  if (value) return [value]

  return []
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export const isUuid = (value: unknown): value is string =>
  typeof value === 'string' && UUID_PATTERN.test(value)

// Lowercase letters and digits, in words joined by single hyphens or
// underscores. Underscores because Kotahi group names use them, as in
// "single_form".
export const GROUP_SLUG_PATTERN = /^[a-z0-9]+(?:[-_][a-z0-9]+)*$/

// First path segments the app routes itself, at / or /admin, so a group
// with one of these slugs would be unreachable.
export const reservedGroupSlugs = [
  'admin',
  'analytics',
  'login',
  'manage',
  'users',
]

// "Acme Press Ltd." → "acme-press-ltd", "single_form" → "single_form".
// Separators collapse to one: a hyphen if the run had any, else underscore.
export const slugify = (value: string): string =>
  value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, '-')
    .replace(/[-_]*-[-_]*/g, '-')
    .replace(/_+/g, '_')
    .replace(/^[-_]+|[-_]+$/g, '')
