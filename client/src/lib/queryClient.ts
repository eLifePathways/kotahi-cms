import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query'
import { TRPCClientError } from '@trpc/client'
import { clearToken, getToken } from './utils'

// How long React Query treats fetched data as fresh before refetching.
const STALE_TIME = 5 * 60 * 1000 // 5 minutes

/**
 * A 401 from a request that carried a token means the stored token is invalid
 * or expired. Clear it and send the user to the login page. Login is excluded
 * because it legitimately returns 401 on bad credentials.
 */
function handleUnauthorized(path: string) {
  if (path.includes('login')) return
  clearToken()
  if (window.location.pathname !== '/login') {
    window.location.href = '/login'
  }
}

/**
 * Helper for handling response errors with optimized performance
 */
async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    // Only parse text if needed (error case)
    const err = await res.json().catch(() => ({}))
    // The upload route answers { error: true, message }, the auth check
    // { error: message }.
    const message =
      err.message ||
      (typeof err.error === 'string' && err.error) ||
      `${res.status}: ${res.statusText}`
    throw Object.assign(
      new Error(message),
      {
        status: res.status,
        data: err,
      },
    )
  }
}

/**
 * Perform a plain HTTP request to the API, for the few routes outside tRPC
 * (the image upload). Adds the auth header and handles an expired token.
 */
export async function apiRequest<T = any>(
  url: string,
  options: RequestInit = {},
): Promise<T> {
  const method = options.method || 'GET'

  // Default to JSON unless the body is FormData, where the browser must set
  // the multipart Content-Type (with its boundary) itself
  if (!(options.body instanceof FormData)) {
    const currentHeaders = (options.headers as Record<string, string>) || {}
    if (!currentHeaders['Content-Type']) {
      options.headers = {
        ...currentHeaders,
        'Content-Type': 'application/json',
      }
    }
  }

  // Authenticate every request, uploads included
  const token = getToken()
  if (token) {
    options.headers = {
      ...options.headers,
      Authorization: `Bearer ${token}`,
    }
  }

  // Only log in development mode to reduce console clutter in production
  if (process.env.NODE_ENV !== 'production' && method !== 'GET') {
    let bodyLog = ''
    if (options.body) {
      if (options.body instanceof FormData) {
        bodyLog = '[FormData]'
      } else if (typeof options.body === 'string') {
        try {
          bodyLog = JSON.parse(options.body)
        } catch {
          bodyLog = '[String Data]'
        }
      }
    }
    console.log(`API Request: ${method} ${url}`, bodyLog)
  }

  const res = await fetch(url, {
    ...options,
    credentials: 'include',
  })

  // An invalid or expired token should drop the session and redirect to login.
  if (res.status === 401 && getToken()) {
    handleUnauthorized(url)
  }

  await throwIfResNotOk(res)

  // If status is 204 No Content, return empty object
  if (res.status === 204) {
    return {} as T
  }

  return (await res.json()) as T
}

// The tRPC counterpart of the 401 check in apiRequest: a procedure rejected
// as UNAUTHORIZED while we hold a token means that token is no longer valid.
const onTRPCError = (error: unknown, path: string) => {
  if (
    error instanceof TRPCClientError &&
    error.data?.code === 'UNAUTHORIZED' &&
    getToken()
  ) {
    handleUnauthorized(path)
  }
}

/**
 * Configure the query client. React Query is the sole cache: reads are cached
 * per query key, and mutations refresh data by invalidating the relevant keys
 * in their onSuccess handlers.
 */
const makeQueryClient = () =>
  new QueryClient({
    queryCache: new QueryCache({
      onError: (error, query) =>
        onTRPCError(error, JSON.stringify(query.queryKey)),
    }),
    mutationCache: new MutationCache({
      onError: (error, _variables, _context, mutation) =>
        onTRPCError(error, JSON.stringify(mutation.options.mutationKey ?? '')),
    }),
    defaultOptions: {
      queries: {
        refetchInterval: false,
        refetchOnWindowFocus: false,
        staleTime: STALE_TIME,
        retry: false,
        gcTime: 10 * 60 * 1000, // 10 minutes (uses gcTime instead of cacheTime in v5)
        refetchOnMount: false, // Minimize refetches on component mount
      },
      mutations: {
        retry: false,
        gcTime: 5 * 60 * 1000, // 5 minutes in v5
      },
    },
  })

let browserQueryClient: QueryClient | undefined = undefined

export const getQueryClient = () => {
  if (typeof window === 'undefined') {
    return makeQueryClient()
  }

  if (!browserQueryClient) {
    browserQueryClient = makeQueryClient()
  }

  return browserQueryClient
}
