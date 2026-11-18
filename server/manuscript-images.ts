import { saveFile } from './file-storage'

// Manuscript images go to file storage under manuscripts/<Kotahi id>/, and
// are served at /uploads/manuscripts/<Kotahi id>/<file>.

const stringIsAValidUrl = (s: string): boolean => {
  try {
    new URL(s)
    return true
  } catch {
    return false
  }
}

// Keep only characters that are safe in a filename/URL segment. The original
// name (from the image's alt attribute) usually carries the extension, e.g.
// "IMG_036BC36FD137-1.jpeg", which we want to preserve.
const sanitizeFileName = (name: string): string =>
  name.replace(/[^a-zA-Z0-9._-]/g, '_')

// Downloads a file into storage; returns the URL path it is served at, or
// null if it couldn't be downloaded.
const downloadFile = async (
  url: string,
  key: string,
): Promise<string | null> => {
  try {
    const res = await fetch(url)

    if (!res.ok) {
      console.error(
        `Failed to download manuscript image (${res.status}): ${url}`,
      )
      return null
    }

    const buffer = Buffer.from(await res.arrayBuffer())
    return await saveFile(
      key,
      buffer,
      res.headers.get('content-type') ?? undefined,
    )
  } catch (err) {
    console.error('Error downloading manuscript image:', url, err)
    return null
  }
}

/**
 * The equivalent of flax's `imagesHandler`: given a piece of published
 * manuscript HTML, download every remote `<img>` to file storage and rewrite
 * its `src` to point at the copy this server serves. Returns the rewritten HTML.
 *
 * Remote sources (e.g. signed DigitalOcean Spaces URLs) expire, so persisting
 * the HTML with those URLs is not durable — this makes the images permanent.
 */
export const imagesHandler = async (
  content: string,
  manuscriptId: string,
): Promise<string> => {
  if (!content) {
    return content
  }

  const folderName =
    manuscriptId || (Math.random() + 1).toString(36).substring(5)

  const imgTags = content.match(/<img\b[^>]*>/gi)

  if (!imgTags?.length) {
    return content
  }

  let result = content

  for (const tag of imgTags) {
    const srcMatch = tag.match(/\ssrc="([^"]*)"/i)

    if (!srcMatch) {
      continue
    }

    // The stored HTML encodes `&` as `&amp;`; decode it for the actual request.
    const remoteSrc = srcMatch[1].replace(/&amp;/g, '&')

    if (!stringIsAValidUrl(remoteSrc)) {
      continue
    }

    const altMatch = tag.match(/\salt="([^"]*)"/i)
    const dataIdMatch = tag.match(/\sdata-id="([^"]*)"/i)
    const baseName = altMatch?.[1] || dataIdMatch?.[1] || 'image'

    const fileName = sanitizeFileName(`${folderName}-${baseName}`)
    const localUrl = await downloadFile(
      remoteSrc,
      `manuscripts/${folderName}/${fileName}`,
    )

    if (!localUrl) {
      continue
    }

    const rewrittenTag = tag.replace(/\ssrc="[^"]*"/i, ` src="${localUrl}"`)
    result = result.replace(tag, rewrittenTag)
  }

  return result
}
