import { Readable } from 'stream'
import type { Request, Response, NextFunction } from 'express'
import {
  GetObjectCommand,
  NoSuchKey,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3'

// Uploaded and synced files live in S3-compatible storage, as in Kotahi:
// MinIO in development (see docker-compose.yml), S3 or similar in production.
//
// A file is stored under a key such as "manuscripts/<id>/x.png" and served by
// this server at /uploads/<key>, so the bucket can stay private and the URLs
// saved in the database don't depend on where the bucket is.

export const UPLOADS_URL_PATH = '/uploads'

const {
  S3_ACCESS_KEY_ID,
  S3_BUCKET,
  S3_REGION,
  S3_SECRET_ACCESS_KEY,
  S3_URL,
} = process.env

if (!S3_BUCKET || !S3_ACCESS_KEY_ID || !S3_SECRET_ACCESS_KEY) {
  throw new Error(
    'S3_BUCKET, S3_ACCESS_KEY_ID and S3_SECRET_ACCESS_KEY must be set: files are stored in S3 (MinIO in development)',
  )
}

const s3 = new S3Client({
  // Without S3_URL the SDK uses AWS itself.
  ...(S3_URL ? { endpoint: S3_URL, forcePathStyle: true } : {}),
  region: S3_REGION || 'us-east-1',
  credentials: {
    accessKeyId: S3_ACCESS_KEY_ID,
    secretAccessKey: S3_SECRET_ACCESS_KEY,
  },
})

// Keys are built by us, but check anyway that one can't climb out of its
// folder or start with a slash.
const assertSafeKey = (key: string) => {
  if (!key || key.startsWith('/') || key.split('/').includes('..')) {
    throw new Error(`Unsafe file key: ${key}`)
  }
}

// Stores a file and returns the URL path it is served at.
export const saveFile = async (
  key: string,
  body: Buffer,
  contentType?: string,
): Promise<string> => {
  assertSafeKey(key)

  await s3.send(
    new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: key,
      Body: body,
      ContentType: contentType,
    }),
  )

  return `${UPLOADS_URL_PATH}/${key}`
}

// Serves stored files at /uploads, streaming them from the bucket.
export const serveUploads = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') return next()

  const key = decodeURIComponent(req.path.replace(/^\//, ''))

  try {
    assertSafeKey(key)
  } catch {
    return res.status(400).end()
  }

  try {
    const object = await s3.send(
      new GetObjectCommand({ Bucket: S3_BUCKET, Key: key }),
    )

    if (object.ContentType) res.type(object.ContentType)
    if (object.ContentLength !== undefined)
      res.setHeader('Content-Length', object.ContentLength)
    // Keys are never reused for different content.
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')

    if (req.method === 'HEAD') return res.end()
    ;(object.Body as Readable).pipe(res)
  } catch (error) {
    if (error instanceof NoSuchKey) return res.status(404).end()
    next(error)
  }
}
