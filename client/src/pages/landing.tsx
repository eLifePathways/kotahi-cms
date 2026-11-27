import { Link, Redirect } from 'wouter'
import { useQuery } from '@tanstack/react-query'
import { ArrowRight, Loader2 } from 'lucide-react'
import { useTRPC, type RouterOutputs } from '@/utils/trpc'
import { useGoogleFonts } from '@/lib/group-theme'
import { APP_NAME } from '@/components/layout/document-head'
import { Button } from '@/components/ui/button'

type ActiveGroup = RouterOutputs['activeGroups'][number]

// A group's card, in its own colours, fonts and logo, linking to its site.
const GroupCard = ({ group }: { group: ActiveGroup }) => {
  const { description, theme } = group.website
  const { logoUrl, primaryColor, sansSerifFont, secondaryColor, serifFont } =
    theme

  return (
    <li>
      <Link
        href={`/${group.slug}`}
        className="flex h-full flex-col overflow-hidden rounded-lg border border-border bg-card shadow-xs transition-shadow hover:shadow-md focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
        style={{
          fontFamily: `'${sansSerifFont}', ui-sans-serif, system-ui, sans-serif`,
        }}
      >
        <div className="h-2" style={{ backgroundColor: primaryColor }} />
        <div className="flex flex-1 flex-col gap-3 p-6">
          {logoUrl && (
            // The name follows, so the logo needs no alt text of its own.
            <img
              src={logoUrl}
              alt=""
              className="h-12 w-auto max-w-48 object-contain object-left"
            />
          )}
          <h2
            className="text-2xl font-bold"
            style={{
              fontFamily: `'${serifFont}', ui-serif, Georgia, serif`,
              color: primaryColor,
            }}
          >
            {group.name}
          </h2>
          {description && (
            <p
              className="text-sm leading-relaxed"
              style={{ color: secondaryColor }}
            >
              {description}
            </p>
          )}
          <span
            className="mt-auto inline-flex items-center gap-1 pt-2 text-sm font-medium"
            style={{ color: primaryColor }}
          >
            Visit site
            <ArrowRight className="h-4 w-4" />
          </span>
        </div>
      </Link>
    </li>
  )
}

const Landing = () => {
  const trpc = useTRPC()

  const { data: groups = [], isLoading } = useQuery(
    trpc.activeGroups.queryOptions(),
  )

  useGoogleFonts(groups.map(group => group.website.theme))

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-muted">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </main>
    )
  }

  // With one group, the CMS is that group's site. `replace`, so Back doesn't
  // return here only to be sent on again.
  if (groups.length === 1) {
    return <Redirect to={`/${groups[0].slug}`} replace />
  }

  if (!groups.length) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-muted px-4">
        <div className="max-w-md space-y-4 text-center">
          <h1 className="font-heading text-3xl font-bold text-primary md:text-4xl">
            No Active Groups
          </h1>
          <p className="text-lg leading-relaxed text-muted-foreground">
            Please login as admin to maintain groups.
          </p>
          <Button asChild>
            <Link href="/login">Log in</Link>
          </Button>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-muted">
      <div className="container mx-auto px-4 py-12">
        <h1 className="font-heading text-3xl font-bold text-primary md:text-4xl">
          {APP_NAME}
        </h1>
        <p className="mt-2 text-lg text-muted-foreground">
          Published manuscripts and their reviews.
        </p>

        <ul className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {groups.map(group => (
            <GroupCard key={group.id} group={group} />
          ))}
        </ul>
      </div>
    </main>
  )
}

export default Landing
