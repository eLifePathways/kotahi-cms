import HeroSection from '@/components/sections/hero-section'
// import PublicationsSection from '@/components/sections/publications-section'
import { useQuery } from '@tanstack/react-query'
import { useTRPC } from '../utils/trpc'

const Home = () => {
  const trpc = useTRPC()

  const { data: heroSectionData, isLoading: heroSectionLoading } = useQuery(
    trpc.heroSectionByName.queryOptions({ name: 'home' }),
  )

  const {
    data: whatWeDoHeroSectionData,
    isLoading: whatWeDoHeroSectionLoading,
  } = useQuery(trpc.heroSectionByName.queryOptions({ name: 'whatWeDo' }))

  const { description = '', title = '' } = heroSectionData ?? {}

  const { description: whatWeDoDescription = '', title: whatWeDoTitle = '' } =
    whatWeDoHeroSectionData ?? {}
  return (
    <main className="container mx-auto px-4 flex flex-col gap-4">
      <HeroSection
        description={description}
        loading={heroSectionLoading}
        title={title}
      />
      <div className="border-b border-border mb-10"></div>
      <HeroSection
        title={whatWeDoTitle}
        loading={whatWeDoHeroSectionLoading}
        description={whatWeDoDescription}
      />
      {/* <PublicationsSection /> */}
    </main>
  )
}

export default Home
