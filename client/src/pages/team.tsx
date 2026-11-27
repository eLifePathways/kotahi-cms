import HeroSection from '@/components/sections/hero-section'
import TeamSection from '@/components/sections/team-section'
import { useQuery } from '@tanstack/react-query'
import { useTRPC } from '@/utils/trpc'
import { useGroup } from '@/hooks/use-group'

const Team = () => {
  const trpc = useTRPC()
  const { id: groupId } = useGroup()

  const { data: heroSectionData, isLoading: heroSectionLoading } = useQuery(
    trpc.heroSectionByName.queryOptions({ groupId, name: 'team' }),
  )

  const { description = '', title = '' } = heroSectionData ?? {}
  return (
    <main className="container mx-auto px-4">
      <HeroSection
        description={description}
        loading={heroSectionLoading}
        title={title}
      />
      <div className="border-b border-border mb-10"></div>
      <TeamSection showAllMembers />
    </main>
  )
}

export default Team
