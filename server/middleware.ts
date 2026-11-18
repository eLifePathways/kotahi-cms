import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'

export interface AuthRequest extends Request {
  userId?: string
}

// Generic over the route's params so Express can still infer them for the
// handlers that follow (e.g. req.params.id on a '/:id' route).
export const requireAuth = <P>(
  req: Request<P> & Pick<AuthRequest, 'userId'>,
  res: Response,
  next: NextFunction,
) => {
  const header = req.headers.authorization
  if (!header)
    return res.status(401).json({ error: 'Missing Authorization header' })

  const token = header.split(' ')[1]
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as {
      userId: string
    }

    req.userId = payload.userId
    next()
  } catch (err) {
    res.status(401).json({ error: 'Invalid or expired token' })
  }
}
