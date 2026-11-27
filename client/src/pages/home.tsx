import HeroSection from '@/components/sections/hero-section'
// import PublicationsSection from '@/components/sections/publications-section'
import { useQuery } from '@tanstack/react-query'
import { useTRPC } from '../utils/trpc'
import { useGroup } from '@/hooks/use-group'

const Home = () => {
  const trpc = useTRPC()
  const { id: groupId } = useGroup()

  const { data: heroSectionData, isLoading: heroSectionLoading } = useQuery(
    trpc.heroSectionByName.queryOptions({ groupId, name: 'home' }),
  )

  const {
    data: whatWeDoHeroSectionData,
    isLoading: whatWeDoHeroSectionLoading,
  } = useQuery(
    trpc.heroSectionByName.queryOptions({ groupId, name: 'whatWeDo' }),
  )

  const { data: website } = useQuery(
    trpc.groupWebsite.queryOptions({ groupId }),
  )

  const { description = '', title = '' } = heroSectionData ?? {}
  const { heroImageUrl, showHeroImage } = website?.theme ?? {}

  const { description: whatWeDoDescription = '', title: whatWeDoTitle = '' } =
    whatWeDoHeroSectionData ?? {}
  return (
    <>
      {showHeroImage && heroImageUrl && (
        <img
          src={heroImageUrl}
          alt=""
          className="h-48 w-full object-cover sm:h-64 lg:h-80"
        />
      )}
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
    </>
  )
}

export default Home
