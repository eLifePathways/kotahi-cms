import type { Express, Request, Response } from 'express'
import { createServer, type Server } from 'http'
import { upload, handleUploadErrors, saveUploadedImage } from './upload'
import { serveUploads, UPLOADS_URL_PATH } from './file-storage'
import { requireAuth } from './middleware'

// Everything else is served by tRPC (see appRouter.ts). File uploads stay REST
// because they are multipart, and stored files are plain downloads.
export async function registerRoutes(app: Express): Promise<Server> {
  // Uploaded and synced files, streamed from S3 (see file-storage.ts)
  app.use(UPLOADS_URL_PATH, serveUploads)

  // File upload endpoint
  app.post(
    '/api/upload',
    requireAuth,
    upload.single('image'),
    handleUploadErrors,
    async (req: Request, res: Response) => {
      try {
        if (!req.file) {
          return res
            .status(400)
            .json({ error: true, message: 'No file uploaded' })
        }

        const fileUrl = await saveUploadedImage(req.file)

        res.json({
          success: true,
          fileUrl,
          originalname: req.file.originalname,
          mimetype: req.file.mimetype,
          size: req.file.size,
        })
      } catch (error) {
        console.error('Error handling file upload:', error)
        res
          .status(500)
          .json({ error: true, message: 'Server error during file upload' })
      }
    },
  )

  // Unknown API paths get a 404 rather than falling through to the SPA's HTML.
  app.use('/api', (_req: Request, res: Response) => {
    res.status(404).json({ message: 'Not found' })
  })

  const httpServer = createServer(app)
  return httpServer
}
