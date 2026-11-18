import HeroSection from '@/components/sections/hero-section'
import PublicationsSection from '@/components/sections/publications-section'
import { useQuery } from '@tanstack/react-query'
import { useTRPC } from '@/utils/trpc'

const Publications = () => {
  const trpc = useTRPC()

  const { data: heroSectionData, isLoading: heroSectionLoading } = useQuery(
    trpc.heroSectionByName.queryOptions({ name: 'publications' }),
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
      <PublicationsSection />
    </main>
  )
}

export default Publications
