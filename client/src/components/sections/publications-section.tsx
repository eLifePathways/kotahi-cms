import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTRPC } from '@/utils/trpc'
import PublicationCard from '@/components/ui/publication-card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { useLocation, useSearchParams } from 'wouter'
import { Loader2, Search as SearchIcon, X } from 'lucide-react'

const PAGE_SIZE = 10

const PublicationsSection = () => {
  const [pageSize, setPageSize] = useState(PAGE_SIZE)

  const trpc = useTRPC()
  const [location] = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()

  const submittedQuery = searchParams.get('q')?.trim() ?? ''
  const yearRanges = searchParams.get('yearRanges') ?? ''
  const isFiltered = Boolean(submittedQuery || yearRanges)

  const [searchQuery, setSearchQuery] = useState(submittedQuery)

  useEffect(() => {
    setSearchQuery(submittedQuery)
    setPageSize(PAGE_SIZE)
  }, [submittedQuery, yearRanges])

  const { data: publications = [], isLoading: isLoadingPublications } =
    useQuery(
      trpc.publications.queryOptions({
        searchQuery: submittedQuery || undefined,
        yearRanges: yearRanges || undefined,
      }),
    )

  const { data: allPublicationsCount } = useQuery(
    trpc.publicationsTotalCount.queryOptions(undefined, { enabled: isFiltered }),
  )

  // Set or remove one search param, keeping the others
  const updateSearchParam = (name: string, value: string) =>
    setSearchParams(prev => {
      const next = new URLSearchParams(prev)
      if (value) next.set(name, value)
      else next.delete(name)
      return next
    })

  const displayedPublications = publications.slice(0, pageSize)

  const loadMore = () => {
    setPageSize(prev => prev + PAGE_SIZE)
  }

  const renderSkeleton = () => (
    <>
      {[...Array(2)].map((_, index) => (
        <div
          key={index}
          className="flex flex-col gap-4 border border-border rounded-lg overflow-hidden"
        >
          <div className="space-y-2 p-6">
            <Skeleton className="h-6 w-3/4 bg-muted" />
            <Skeleton className="h-4 w-1/3 bg-muted" />
            <Skeleton className="h-16 w-full bg-muted" />
            <div className="flex justify-end pt-2">
              <Skeleton className="h-4 w-20 bg-muted" />
            </div>
          </div>
        </div>
      ))}
    </>
  )

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    updateSearchParam('q', searchQuery.trim())
  }

  const handleSearchChange = (value: string) => {
    setSearchQuery(value)
    // Emptying the field shows the full list again
    if (!value.trim() && submittedQuery) updateSearchParam('q', '')
  }

  const clearSearch = () => {
    setSearchQuery('')
    updateSearchParam('q', '')
  }

  const total = publications.length
  const countLabel = isLoadingPublications
    ? ''
    : isFiltered && allPublicationsCount
      ? `${total} of ${allPublicationsCount} publications`
      : `${total} ${total === 1 ? 'publication' : 'publications'}`

  return (
    <div className="container mx-auto mb-12">
      <div className="max-w-3xl mx-auto mb-12">
        <form onSubmit={handleSearch} className="flex gap-2" role="search">
          <div className="relative grow">
            <SearchIcon
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground"
              size={18}
            />
            <Input
              type="text"
              placeholder="Search by title, author, or keywords..."
              value={searchQuery}
              onChange={e => handleSearchChange(e.target.value)}
              onKeyDown={e => e.key === 'Escape' && clearSearch()}
              className="pl-10 pr-10"
              aria-label="Search publications"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={clearSearch}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-sm p-1 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="Clear search"
              >
                <X size={16} />
              </button>
            )}
          </div>
          <Button type="submit" disabled={isLoadingPublications}>
            {isLoadingPublications ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              'Search'
            )}
          </Button>
        </form>
      </div>
      <section
        id="recent-reviews"
        className="bg-muted px-8 py-8 md:py-12"
        key={location}
      >
        <p className="mb-6 text-sm text-muted-foreground" aria-live="polite">
          {countLabel}
        </p>

        {/* Publications List */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {isLoadingPublications && renderSkeleton()}

          {displayedPublications.map(publication => (
            <PublicationCard
              key={publication.id}
              shortId={publication.kotahiShortId}
              title={publication.title}
              authors={publication.authors}
              year={publication.year}
              abstract={publication.abstract}
              link={publication.link}
            />
          ))}

          {!isLoadingPublications && total === 0 && (
            <div className="col-span-full text-center py-8">
              <p className="text-muted-foreground">
                {isFiltered
                  ? 'No publications found matching your search.'
                  : 'No publications yet.'}
              </p>
            </div>
          )}
        </div>

        {displayedPublications.length < total && (
          <div className="mt-8 text-center">
            <Button onClick={loadMore}>Load More Publications</Button>
          </div>
        )}
      </section>
    </div>
  )
}

export default PublicationsSection
