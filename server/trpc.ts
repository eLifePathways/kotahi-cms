import { initTRPC, TRPCError } from '@trpc/server'
import superjson from 'superjson'
import { CreateExpressContextOptions } from '@trpc/server/adapters/express'
import { verifyToken } from './auth'
import { storage } from './storage'

export const createContext = async ({ req }: CreateExpressContextOptions) => {
  const token = req.headers.authorization?.replace(/^Bearer /, '')
  if (!token) return { user: null }

  try {
    const { userId } = verifyToken(token) as { userId: string }
    const user = await storage.getUser(userId)
    return { user: user ? { id: user.id, username: user.username } : null }
  } catch {
    return { user: null } // invalid or expired token
  }
}

type Context = Awaited<ReturnType<typeof createContext>>

// superjson keeps Dates (and other non-JSON values) intact, so the client
// receives the same types the procedures return.
const t = initTRPC.context<Context>().create({ transformer: superjson })

export const router = t.router
export const publicProcedure = t.procedure

export const adminProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED' })
  }

  // Pass the checked user on, so procedures see it as non-null.
  return next({ ctx: { user: ctx.user } })
})
