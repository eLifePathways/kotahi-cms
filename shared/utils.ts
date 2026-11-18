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
