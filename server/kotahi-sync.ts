import { existsSync } from 'fs'
import { storage } from './storage'
import { imagesHandler } from './manuscript-images'
import { makeSvgsFromLatex } from './manuscript-math'
import { MANUSCRIPTS_PUBLISHED_SINCE_DATE } from '@shared/queries'
import { getValidDate, getYearFromInput } from '@shared/utils'
import type {
  InsertPublication,
  KotahiPublishedManuscript,
  KotahiPublishedReview,
  KotahiReviewField,
  KotahiSettingsFormData,
  Publication,
} from '@shared/schema'

type KotahiAuthor = { firstName?: string; lastName?: string }

type KotahiSubmission = {
  $title?: string
  $abstract?: string
  $sourceUri?: string
  $authors?: KotahiAuthor[]
  // Some older forms carried these instead of $authors and the
  // Kotahi publish date.
  firstAuthor?: string
  datePublished?: string
}

export type SyncResult = {
  synced: number
  failed: Array<{ kotahiManuscriptId: string; error: string }>
}

const parseJson = <T>(value: string | null | undefined, fallback: T): T => {
  if (!value) return fallback

  try {
    return JSON.parse(value) ?? fallback
  } catch {
    return fallback
  }
}

const formatAuthors = (submission: KotahiSubmission): string => {
  const names = (submission.$authors ?? [])
    .map(a => [a.firstName, a.lastName].filter(Boolean).join(' '))
    .filter(Boolean)

  return names.length ? names.join(', ') : submission.firstAuthor || ''
}

// Inside a container, localhost is the container itself rather than the
// machine running Kotahi.
const runningInDocker = existsSync('/.dockerenv')
const localHostnames = ['localhost', '127.0.0.1', '[::1]', '0.0.0.0']

// fetch, but a request that can't reach Kotahi at all fails with a message an
// admin can act on rather than "fetch failed".
export const fetchFromKotahi = async (endpoint: string, init: RequestInit) => {
  try {
    return await fetch(endpoint, init)
  } catch (error) {
    const { hostname, port } = new URL(endpoint)
    const hint =
      runningInDocker && localHostnames.includes(hostname)
        ? ` Inside Docker, ${hostname} is the CMS container; use http://host.docker.internal${port ? `:${port}` : ''}/… to reach Kotahi on your machine.`
        : ''

    throw new Error(`Can't reach ${endpoint}.${hint}`, { cause: error })
  }
}

const fetchPublishedManuscripts = async ({
  endpoint,
  groupId,
}: KotahiSettingsFormData): Promise<KotahiPublishedManuscript[]> => {
  const response = await fetchFromKotahi(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(groupId ? { 'group-id': groupId } : {}),
    },
    body: JSON.stringify(MANUSCRIPTS_PUBLISHED_SINCE_DATE),
  })

  if (!response.ok) {
    throw new Error(`Kotahi responded with ${response.status}`)
  }

  const { data, errors } = await response.json()

  if (errors?.length) {
    throw new Error(
      errors.map((e: { message: string }) => e.message).join('; '),
    )
  }

  return data?.manuscriptsPublishedSinceDate ?? []
}

const GROUPS_QUERY = 'query groups { groups { id name } }'

type KotahiGroupSummary = { id: string; name: string | null }

export const fetchKotahiGroup = async ({
  apiKey,
  endpoint,
  kotahiGroupId,
}: {
  endpoint: string
  apiKey: string | null
  kotahiGroupId: string
}): Promise<KotahiGroupSummary | undefined> => {
  const response = await fetchFromKotahi(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
    },
    body: JSON.stringify({ query: GROUPS_QUERY }),
  })

  if (!response.ok) {
    throw new Error(`Kotahi responded with ${response.status}`)
  }

  const { data, errors } = await response.json()

  if (errors?.length) {
    throw new Error(
      errors.map((e: { message: string }) => e.message).join('; '),
    )
  }

  const groups: KotahiGroupSummary[] = data?.groups ?? []

  return groups.find(group => group.id === kotahiGroupId)
}

const toPublicationPayload = async (
  groupId: string,
  manuscript: KotahiPublishedManuscript,
): Promise<InsertPublication> => {
  const submission = parseJson<KotahiSubmission>(manuscript.submission, {})
  const publishedOn =
    submission.datePublished || String(manuscript.publishedDate ?? '')

  // Download any remote (signed, expiring) images referenced in the
  // manuscript to local storage and rewrite their src to the local copy, then
  // convert LaTeX in Wax math nodes to inline SVG, mirroring flax.
  const manuscriptText = makeSvgsFromLatex(
    await imagesHandler(manuscript.meta?.source || '', manuscript.id),
  )

  return {
    groupId,
    title: submission.$title || '',
    kotahiManuscriptId: manuscript.id,
    kotahiShortId: manuscript.shortId,
    authors: formatAuthors(submission),
    year: getYearFromInput(publishedOn),
    abstract: submission.$abstract || '',
    publicationDate: getValidDate(publishedOn),
    link: submission.$sourceUri || null,
    manuscriptText,
  }
}

// Mirror the manuscript's published reviews and decisions onto the
// publication: update the ones we already hold, add new ones and drop any
// Kotahi no longer publishes.
const syncReviews = async (
  publicationId: string,
  manuscript: KotahiPublishedManuscript,
) => {
  const incoming: Array<[KotahiPublishedReview, boolean]> = [
    ...(manuscript.reviews ?? []).map(r => [r, false] as [typeof r, boolean]),
    ...(manuscript.decisions ?? []).map(r => [r, true] as [typeof r, boolean]),
  ]

  const existing = await storage.getReviewsForPublication(publicationId)
  const existingByKotahiId = new Map(
    existing.map(review => [review.kotahiReviewId, review]),
  )
  const keptIds = new Set<string>()

  for (const [review, isDecision] of incoming) {
    // Kotahi has already stripped fields that may not be published.
    const jsonData = parseJson<KotahiReviewField[]>(review.jsonData, [])
    if (!Array.isArray(jsonData) || !jsonData.length) continue

    const payload = {
      publicationId,
      kotahiReviewId: review.id,
      created: review.created ? new Date(review.created) : null,
      users: review.users ?? [],
      jsonData,
      isDecision,
    }

    const match = existingByKotahiId.get(review.id)

    if (match) {
      await storage.updateReview(match.id, payload)
      keptIds.add(match.id)
    } else {
      const created = await storage.createReview(payload)
      keptIds.add(created.id)
    }
  }

  await storage.deleteReviews(
    existing.filter(review => !keptIds.has(review.id)).map(r => r.id),
  )
}

export const syncFromKotahi = async (
  groupId: string,
  settings: KotahiSettingsFormData,
): Promise<SyncResult> => {
  const manuscripts = await fetchPublishedManuscripts(settings)
  const existing = await storage.getAllPublicationsForGroup(groupId)

  // Kotahi returns the latest published version of each manuscript, whose id
  // changes between versions; shortId does not.
  const byShortId = new Map(existing.map(p => [p.kotahiShortId, p]))

  const result: SyncResult = { synced: 0, failed: [] }

  // Sequential on purpose: each manuscript may download several images.
  for (const manuscript of manuscripts) {
    try {
      const payload = await toPublicationPayload(groupId, manuscript)
      const match = byShortId.get(manuscript.shortId)

      const publication: Publication | undefined = match
        ? await storage.updatePublication(match.id, payload)
        : await storage.createPublication(payload)

      if (!publication) throw new Error('Publication could not be saved')

      await syncReviews(publication.id, manuscript)
      result.synced += 1
    } catch (error) {
      console.error(`Failed to sync manuscript ${manuscript.id}:`, error)
      result.failed.push({
        kotahiManuscriptId: manuscript.id,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  return result
}
