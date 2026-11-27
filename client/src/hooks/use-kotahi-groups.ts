import { useCallback } from 'react'
import type { KotahiGroup } from '@shared/schema'
import { useTRPCClient } from '@/utils/trpc'

const GROUPS_QUERY = `query groups {
  groups {
    id
    name
    configs {
      active
      flaxSiteUrl
    }
  }
}`

// The groups in Kotahi's GraphQL response body, if it holds a list of them.
const getGroupsFromResponse = (body: unknown): KotahiGroup[] | null => {
  if (typeof body !== 'object' || body === null || !('data' in body)) {
    return null
  }

  const { data } = body

  if (typeof data !== 'object' || data === null || !('groups' in data)) {
    return null
  }

  return Array.isArray(data.groups) ? data.groups : null
}

/**
 * Lists a Kotahi instance's groups through the server's GraphQL proxy, so the
 * request comes from the server and never carries the CMS admin token. Throws
 * when the endpoint can't be reached or returns no groups.
 */
export const useFetchKotahiGroups = () => {
  const trpcClient = useTRPCClient()

  return useCallback(
    async (endpoint: string, apiKey?: string | null) => {
      const { data, status } = await trpcClient.graphqlProxy.mutate({
        endpoint,
        apiKey,
        query: GROUPS_QUERY,
      })

      const groups = getGroupsFromResponse(data)

      if (status < 200 || status >= 300 || !groups) {
        throw new Error(`Kotahi returned no groups (HTTP ${status})`)
      }

      return groups
    },
    [trpcClient],
  )
}
