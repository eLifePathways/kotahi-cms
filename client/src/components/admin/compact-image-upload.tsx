import { useRef } from 'react'
import { Image as ImageIcon, Loader2, Trash2, Upload } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useImageUpload } from '@/hooks/use-image-upload'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'

/**
 * A small image field for icons and logos: the whole image in a framed
 * preview at about the size it's shown, with upload and remove buttons.
 * (ImageUpload's large, cropped preview suits banners and photos.)
 */
export default function CompactImageUpload({
  id,
  label,
  description,
  value,
  onChange,
  previewClassName,
}: {
  id: string
  label: string
  description: string
  value: string | null
  onChange: (url: string | null) => void
  // The preview's size, e.g. "h-10 w-10" for a favicon.
  previewClassName: string
}) {
  const { isUploading, upload } = useImageUpload()
  const inputRef = useRef<HTMLInputElement>(null)

  return (
    // `relative` keeps the visually hidden file input (absolute) beside its
    // buttons.
    <div className="relative flex items-center gap-4">
      <div
        className={cn(
          'flex shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-muted p-1',
          previewClassName,
        )}
      >
        {isUploading ? (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        ) : value ? (
          <img
            src={value}
            alt={`${label} preview`}
            className="h-full w-full object-contain"
          />
        ) : (
          <ImageIcon className="h-4 w-4 text-muted-foreground" />
        )}
      </div>

      <div className="min-w-0 space-y-2">
        <div>
          <Label htmlFor={id}>{label}</Label>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <input
            id={id}
            ref={inputRef}
            type="file"
            accept="image/*"
            className="sr-only"
            disabled={isUploading}
            onChange={async e => {
              const file = e.target.files?.[0]
              // Let the same file be chosen again after a remove.
              e.target.value = ''
              if (!file) return

              const url = await upload(file)
              if (url) onChange(url)
            }}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isUploading}
            onClick={() => inputRef.current?.click()}
          >
            <Upload className="mr-2 h-4 w-4" />
            {value ? 'Replace' : 'Upload'}
          </Button>
          {value && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={isUploading}
              onClick={() => onChange(null)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Remove
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
