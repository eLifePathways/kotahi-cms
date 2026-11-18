import { SafeHtml } from '@/components/ui/safe-html'

type ReviewFieldProps = {
  content: string
  title: string
}

const ReviewField = ({ content, title }: ReviewFieldProps) => {
  return (
    <div className="gap-2 mb-4">
      <h4 className="text-lg font-semibold">{title}</h4>
      <SafeHtml html={content} />
    </div>
  )
}

export default ReviewField
