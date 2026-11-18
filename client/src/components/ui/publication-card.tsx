import { Card, CardContent } from '@/components/ui/card'
import { ArrowRight } from 'lucide-react'
import { Link } from 'wouter'
import { SafeHtml } from './safe-html'

type PublicationCardProps = {
  shortId: number
  title: string
  authors: string
  year: number
  abstract: string
  link?: string | null
}

const PublicationCard = ({
  shortId,
  title,
  authors,
  year,
  abstract,
}: PublicationCardProps) => {
  return (
    <Card className="overflow-hidden hover:shadow-lg transition duration-300 h-full">
      <CardContent className="p-6">
        <h3 className="font-heading font-semibold text-primary text-xl mb-2">
          <SafeHtml html={title} />
        </h3>
        <p className="text-muted-foreground text-sm mb-3">
          {year} • {authors}
        </p>
        <div className="text-foreground mb-4 line-clamp-3">
          <SafeHtml html={abstract} />
        </div>
        <div className="flex justify-end">
          <Link
            to={`/publications/${shortId}`}
            className="text-link hover:underline transition inline-flex items-center gap-1"
          >
            Read More <ArrowRight size={14} />
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}

export default PublicationCard
