import 'dotenv/config'
import { createExpressMiddleware } from '@trpc/server/adapters/express'
import express, { type Request, Response, NextFunction } from 'express'
import { registerRoutes } from './routes'
import { setupVite, serveStatic, log } from './vite'
import { initDatabase } from './db'
import { storage } from './storage'
import { analyticsMiddleware } from './analytics'
import cookieParser from 'cookie-parser'
import { appRouter } from './appRouter'
import { createContext } from './trpc'

const app = express()
// Increase the payload size limit to handle larger screenshots (50MB)
app.use(express.json({ limit: '50mb' }))
app.use(express.urlencoded({ extended: false, limit: '50mb' }))
app.use(cookieParser())
app.use(analyticsMiddleware)

app.use((req, res, next) => {
  const start = Date.now()
  const path = req.path
  let capturedJsonResponse: Record<string, any> | undefined = undefined

  const originalResJson = res.json
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson
    return originalResJson.apply(res, [bodyJson, ...args])
  }

  res.on('finish', () => {
    const duration = Date.now() - start
    if (path.startsWith('/api')) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + '…'
      }

      log(logLine)
    }
  })

  next()
})
;(async () => {
  // Schema changes are applied via drizzle migrations (yarn db:migrate, run
  // automatically by start:prod / dev). See server/migrate.ts.
  try {
    await initDatabase()
    await storage.seedAdmin()
  } catch (error) {
    console.error('Database initialisation failed:', error)
    process.exit(1)
  }

  app.use(
    '/api/trpc',
    createExpressMiddleware({
      createContext,
      router: appRouter,
      onError: ({ error, path }) => {
        if (
          error.code === 'INTERNAL_SERVER_ERROR' ||
          error.code === 'BAD_GATEWAY'
        ) {
          console.error(`tRPC ${path ?? ''} failed:`, error.cause ?? error)
        }
      },
    }),
  )

  const server = await registerRoutes(app)

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500
    const message = err.message || 'Internal Server Error'

    res.status(status).json({ message })
    throw err
  })

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get('env') === 'development') {
    await setupVite(app, server)
  } else {
    serveStatic(app)
  }

  // ALWAYS serve the app on port 5120
  // this serves both the API and the client
  const port = process.env.PORT || 5120
  server.listen(
    {
      host: '0.0.0.0',
      port,
    },
    () => {
      log(`serving on port ${port}`)
    },
  )
})()
