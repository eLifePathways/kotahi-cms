import { useQuery } from '@tanstack/react-query'
import { useTRPC } from '@/utils/trpc'
import { useGroup } from '@/hooks/use-group'
import { useApplyTheme } from '@/lib/group-theme'
import DocumentHead from './document-head'

/**
 * Gives the page the current group's look (colours, fonts and favicon), and
 * its name as the title. Public pages also get its description; admin pages
 * are marked as such, to tell the browser tabs apart.
 */
export default function GroupTheme({ admin = false }: { admin?: boolean }) {
  const trpc = useTRPC()
  const group = useGroup()

  const { data: website } = useQuery(
    trpc.groupWebsite.queryOptions({ groupId: group.id }),
  )

  useApplyTheme(website?.theme)

  return admin ? (
    <DocumentHead title={`${group.name} · Admin`} />
  ) : (
    <DocumentHead
      title={group.name}
      description={website?.description || undefined}
    />
  )
}
