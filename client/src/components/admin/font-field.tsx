import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AlertCircle, Check, Loader2 } from 'lucide-react'
import { fontFamilySchema } from '@shared/website'
import { useTRPC } from '@/utils/trpc'
import { cn } from '@/lib/utils'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const OTHER = '__other__'
const MAX_MATCHES = 8

/**
 * Searches every Google Fonts family, for a brand font outside the curated
 * list. The server checks the choice with Google again on save.
 */
const GoogleFontSearch = ({
  id,
  value,
  expectedCategory,
  onChange,
}: {
  id: string
  value: string | null
  expectedCategory: string
  onChange: (family: string) => void
}) => {
  const trpc = useTRPC()
  const [query, setQuery] = useState(value ?? '')

  const {
    data: families,
    error,
    isLoading,
  } = useQuery({
    ...trpc.googleFonts.queryOptions(),
    // Google's catalogue changes rarely; the server caches it for a day too.
    staleTime: Infinity,
  })

  const search = query.trim().toLowerCase()

  // Names that start with the search first, then any that contain it, in
  // the catalogue's popularity order.
  const matches = search
    ? [
        ...(families ?? []).filter(font =>
          font.family.toLowerCase().startsWith(search),
        ),
        ...(families ?? []).filter(
          font =>
            !font.family.toLowerCase().startsWith(search) &&
            font.family.toLowerCase().includes(search),
        ),
      ].slice(0, MAX_MATCHES)
    : []

  const selected = families?.find(font => font.family === value)

  // Without the catalogue, an exact name can still be used; the server checks
  // it on save.
  const typedFamily = fontFamilySchema.safeParse(query)

  return (
    <div className="space-y-2 rounded-md border p-3">
      <Label htmlFor={id} className="text-sm">
        Search Google Fonts
      </Label>
      <Input
        id={id}
        value={query}
        onChange={e => setQuery(e.target.value)}
        onKeyDown={e => {
          // Enter picks the best match rather than submitting the form.
          if (e.key === 'Enter') {
            e.preventDefault()
            if (matches[0]) onChange(matches[0].family)
          }
        }}
        placeholder="e.g. Merriweather Sans"
        autoComplete="off"
      />

      {isLoading && (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading Google Fonts...
        </p>
      )}

      {error && (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Couldn't load the Google Fonts list. Type the font's exact name; it
            is checked with Google when you save.
          </p>
          {typedFamily.success && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onChange(typedFamily.data)}
            >
              Use "{typedFamily.data}"
            </Button>
          )}
        </div>
      )}

      {families && search && !matches.length && (
        <p
          role="alert"
          className="flex items-start gap-2 text-sm text-destructive-text"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          No Google Font matches "{query.trim()}". Check the name on
          fonts.google.com.
        </p>
      )}

      {matches.length > 0 && (
        <ul className="max-h-64 overflow-y-auto rounded-md border">
          {matches.map(font => (
            <li key={font.family}>
              <button
                type="button"
                onClick={() => {
                  setQuery(font.family)
                  onChange(font.family)
                }}
                className={cn(
                  'flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-muted',
                  font.family === value && 'bg-primary/10',
                )}
              >
                <span className="flex items-center gap-2">
                  {font.family === value && (
                    <Check className="h-4 w-4 text-primary" />
                  )}
                  {font.family}
                </span>
                <Badge variant="outline">{font.category}</Badge>
              </button>
            </li>
          ))}
        </ul>
      )}

      {value && selected && selected.category !== expectedCategory && (
        <p className="text-sm text-muted-foreground">
          Google classes {value} as {selected.category}, not {expectedCategory}.
          Fine for a brand font; check it reads well in the preview.
        </p>
      )}
    </div>
  )
}

/**
 * A curated Google Font, or any other ("Other...") found by searching
 * Google Fonts, for brand fonts.
 */
export const FontField = ({
  id,
  label,
  fonts,
  expectedCategory,
  value,
  onChange,
}: {
  id: string
  label: string
  // Curated families; the first is the default.
  fonts: string[]
  // Google Fonts' category for this slot: Serif or Sans Serif.
  expectedCategory: string
  value: string
  onChange: (family: string) => void
}) => {
  const isCurated = fonts.includes(value)
  const [choosingOther, setChoosingOther] = useState(!isCurated)

  // A curated font picked through the search, or a reset to the defaults,
  // shows in the list again.
  useEffect(() => {
    if (fonts.includes(value)) setChoosingOther(false)
  }, [fonts, value])

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Select
        value={choosingOther ? OTHER : value}
        onValueChange={next => {
          if (next === OTHER) {
            setChoosingOther(true)
            return
          }

          setChoosingOther(false)
          onChange(next)
        }}
      >
        <SelectTrigger id={id}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {fonts.map(family => (
            <SelectItem key={family} value={family}>
              {family}
              {family === fonts[0] ? ' (default)' : ''}
            </SelectItem>
          ))}
          <SelectItem value={OTHER}>
            {isCurated ? 'Other Google Font...' : `Other: ${value}`}
          </SelectItem>
        </SelectContent>
      </Select>

      {choosingOther && (
        <GoogleFontSearch
          id={`${id}-search`}
          value={isCurated ? null : value}
          expectedCategory={expectedCategory}
          onChange={onChange}
        />
      )}
    </div>
  )
}
