import { createContext, useContext, type ReactNode } from 'react'
import { useParams } from 'wouter'
import { useQuery } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import NotFound from '@/pages/not-found'
import DocumentHead, { APP_NAME } from '@/components/layout/document-head'
import { useTRPC, type RouterOutputs } from '@/utils/trpc'

export type Group = RouterOutputs['groupBySlug']

/** The group slug from the URL, for pages under a `/:groupSlug` route. */
export const useGroupSlug = (): string => {
  const { groupSlug } = useParams<{ groupSlug?: string }>()

  if (!groupSlug) {
    throw new Error('useGroupSlug must be used under a /:groupSlug route')
  }

  return groupSlug
}

const GroupContext = createContext<Group | null>(null)

/**
 * Looks up the URL's group once and shares it with the pages below, so they
 * can scope their queries with `useGroup().id`. Unknown (or, for visitors,
 * inactive) groups render the not-found page.
 */
export const GroupProvider = ({ children }: { children: ReactNode }) => {
  const trpc = useTRPC()
  const slug = useGroupSlug()

  const { data: group, isLoading } = useQuery(
    trpc.groupBySlug.queryOptions({ slug }),
  )

  // Below, GroupTheme gives the page the group's title; until then, these.
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-40">
        <DocumentHead title={APP_NAME} />
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!group) {
    return (
      <>
        <DocumentHead title={`Page not found · ${APP_NAME}`} />
        <NotFound />
      </>
    )
  }

  return <GroupContext.Provider value={group}>{children}</GroupContext.Provider>
}

/** The current group, for components rendered inside a `GroupProvider`. */
export const useGroup = (): Group => {
  const group = useContext(GroupContext)

  if (!group) {
    throw new Error('useGroup must be used inside a GroupProvider')
  }

  return group
}
