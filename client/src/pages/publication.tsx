import { useParams } from 'wouter'
import { useQuery } from '@tanstack/react-query'
import { KotahiReviewField } from '@shared/schema'
import { useTRPC, type RouterOutputs } from '@/utils/trpc'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import NotFound from './not-found'
import { SafeHtml } from '@/components/ui/safe-html'
import { ExternalLink } from 'lucide-react'
import { getValueFromReviewField } from '@shared/utils'
import ReviewField from '../components/sections/review-field-section'

type Review = RouterOutputs['publicationAndReviews']['reviews'][number]

// Select-style fields store option values; show their labels where we can.
const getFieldContent = (reviewField: KotahiReviewField): string => {
  const options = Array.isArray(reviewField.field?.options)
    ? (reviewField.field.options as { value?: unknown; label?: unknown }[])
    : []

  const values = getValueFromReviewField(reviewField)
    .map(value => {
      const option = options.find(o => o?.value === value)
      return typeof option?.label === 'string' ? option.label : value
    })
    .filter(value => typeof value === 'string' && value.trim() !== '')

  if (values.length) return values.join(', ')

  return typeof reviewField.text === 'string' ? reviewField.text.trim() : ''
}

const byCreated = (a: Review, b: Review) =>
  new Date(a.created ?? 0).getTime() - new Date(b.created ?? 0).getTime()

const ReviewFields = ({ review }: { review: Review }) => {
  const fields = (review.jsonData ?? [])
    .map(field => ({
      title: field.fieldTitle,
      content: getFieldContent(field),
    }))
    .filter(({ content }) => content !== '')

  if (!fields.length) {
    return <p className="text-muted-foreground mb-4">No content.</p>
  }

  return (
    <>
      {fields.map(({ title, content }, index) => (
        <ReviewField
          key={`${title}-${index}`}
          title={title}
          content={content}
        />
      ))}
    </>
  )
}

const PublicationPage = () => {
  const { shortId } = useParams<{ shortId: number }>()

  console.log('shortId', shortId)
  console.log('typeof shortId', typeof shortId)

  const trpc = useTRPC()

  const { data, isLoading } = useQuery(
    trpc.publicationAndReviews.queryOptions({ shortId }),
  )

  if (isLoading) {
    return (
      <section className="container mx-auto px-4 py-12">
        {/* Title */}
        <Skeleton className="h-8 w-2/3 mb-4 bg-muted" />

        {/* Abstract */}
        <div className="space-y-2 mb-6">
          <Skeleton className="h-4 w-full bg-muted" />
          <Skeleton className="h-4 w-5/6 bg-muted" />
          <Skeleton className="h-4 w-4/6 bg-muted" />
        </div>

        {/* Button */}
        <Skeleton className="h-10 w-48 mb-10 bg-muted" />

        {/* Reviews header */}
        <Skeleton className="h-6 w-40 mb-4 bg-muted" />

        {/* Review list */}
        <ul className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <li
              key={i}
              className="p-4 border rounded-lg bg-card space-y-3 shadow-xs"
            >
              {/* Reviewer */}
              <Skeleton className="h-4 w-1/3 bg-muted" />
              {/* Review JSON placeholder */}
              <div className="space-y-2">
                <Skeleton className="h-3 w-full bg-muted" />
                <Skeleton className="h-3 w-5/6 bg-muted" />
                <Skeleton className="h-3 w-2/3 bg-muted" />
              </div>
            </li>
          ))}
        </ul>
      </section>
    )
  }

  if (!data) {
    return <NotFound />
  }

  const { publication, reviews } = data

  const { abstract, authors, link, title, year, manuscriptText } = publication

  const sortedReviews = [...(reviews ?? [])].sort(byCreated)
  const peerReviews = sortedReviews.filter(review => !review.isDecision)
  const decisions = sortedReviews.filter(review => review.isDecision)

  return (
    <section className="container mx-auto px-4 py-12 gap-40">
      <h1 className="text-3xl font-bold text-primary mb-4">
        <SafeHtml html={title} />
      </h1>
      <p className="text-muted-foreground text-md mb-4">
        {year} • {authors}
      </p>
      {link && (
        <Button asChild className="mb-4">
          <a href={link} target="_blank" rel="noopener noreferrer">
            View Source Article <ExternalLink size={14} />
          </a>
        </Button>
      )}

      {abstract && (
        <div className="text-muted-foreground mb-6">
          <SafeHtml html={abstract} />
        </div>
      )}

      {!peerReviews.length && !decisions.length && (
        <p className="text-muted-foreground mb-6">No reviews yet.</p>
      )}

      {peerReviews.map((review, index) => (
        <div key={review.id} className="mb-8">
          <h3 className="text-2xl font-semibold text-primary mb-4">
            Review {index + 1}
          </h3>
          <ReviewFields review={review} />
        </div>
      ))}

      {decisions.length > 0 && (
        <div className="mb-8">
          <h3 className="text-2xl font-semibold text-primary mb-4">
            {decisions.length > 1 ? 'Decisions' : 'Decision'}
          </h3>
          {decisions.map(decision => (
            <div key={decision.id} className="mb-4">
              <ReviewFields review={decision} />
            </div>
          ))}
        </div>
      )}

      {manuscriptText && <SafeHtml html={manuscriptText} />}
    </section>
  )
}

export default PublicationPage
