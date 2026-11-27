import { useQueryClient } from '@tanstack/react-query'
import { useTRPC } from '@/utils/trpc'

/** Refetches everything that reads groups or their settings, after a change. */
export const useInvalidateGroups = () => {
  const trpc = useTRPC()
  const queryClient = useQueryClient()

  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: trpc.groups.queryKey() }),
      queryClient.invalidateQueries({ queryKey: trpc.activeGroups.queryKey() }),
      queryClient.invalidateQueries({ queryKey: trpc.group.pathKey() }),
      queryClient.invalidateQueries({ queryKey: trpc.groupBySlug.pathKey() }),
      queryClient.invalidateQueries({ queryKey: trpc.groupWebsite.pathKey() }),
      queryClient.invalidateQueries({
        queryKey: trpc.settingsByPurpose.pathKey(),
      }),
    ])
}
