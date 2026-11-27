import { useEffect, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'wouter'
import { AlertTriangle, Loader2, RotateCcw } from 'lucide-react'
import { isKotahiSettingsFormData } from '@shared/utils'
import {
  defaultWebsiteSettings,
  sansSerifFonts,
  serifFonts,
  type WebsiteSettings,
} from '@shared/website'
import { useTRPC } from '@/utils/trpc'
import { useToast } from '@/hooks/use-toast'
import { useGroup, type Group } from '@/hooks/use-group'
import { useInvalidateGroups } from '@/hooks/use-invalidate-groups'
import {
  readableTextOn,
  useGoogleFonts,
  WCAG_AA_CONTRAST,
  wcagContrastIssues,
  type ContrastIssue,
} from '@/lib/group-theme'
import {
  KotahiConnectionFields,
  toKotahiInput,
  type KotahiConnection,
} from '@/components/admin/kotahi-connection-fields'
import { FontField } from '@/components/admin/font-field'
import CompactImageUpload from '@/components/admin/compact-image-upload'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { ImageUpload } from '@/components/ui/image-upload'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'

const tabs = ['website', 'api'] as const
type Tab = (typeof tabs)[number]

type Contact = WebsiteSettings['contact']
type Theme = WebsiteSettings['theme']

const Spinner = () => (
  <div className="flex justify-center items-center h-40">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
)

// Saves through updateGroup, with the toasts and refetching every tab needs.
const useUpdateGroup = (successMessage: string) => {
  const trpc = useTRPC()
  const { toast } = useToast()
  const invalidateGroups = useInvalidateGroups()

  return useMutation(
    trpc.updateGroup.mutationOptions({
      onSuccess: () => {
        invalidateGroups()
        toast({ title: 'Success', description: successMessage })
      },
      onError: error => {
        toast({
          title: 'Error',
          description: error.message || 'Failed to save settings',
          variant: 'destructive',
        })
        console.error('Error saving group settings:', error)
      },
    }),
  )
}

const ContrastWarning = ({ issues }: { issues: ContrastIssue[] }) => (
  <div
    role="alert"
    className="flex gap-3 rounded-lg border border-warning/30 bg-warning/10 p-3"
  >
    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
    <div className="space-y-1 text-sm">
      <p className="font-medium">Colour has poor accessibility</p>
      <p>
        Colour selected fails to meet WCAG AA accessibility standard. Users may
        have difficulty with usability and navigation. Please consider a
        different colour.
      </p>
      <ul className="list-disc pl-4">
        {issues.map(issue => (
          <li key={issue.where}>
            {issue.ratio.toFixed(2)}:1 {issue.where} (AA needs{' '}
            {WCAG_AA_CONTRAST}:1)
          </li>
        ))}
      </ul>
    </div>
  </div>
)

const ColourField = ({
  id,
  label,
  description,
  value,
  issues,
  onChange,
}: {
  id: string
  label: string
  description: string
  value: string
  // Where the colour falls short of WCAG AA, if anywhere.
  issues: ContrastIssue[]
  onChange: (value: string) => void
}) => {
  // The text box may hold a half-typed colour; only whole ones are kept.
  const [draft, setDraft] = useState(value)

  // Follow changes from the picker or a reset.
  useEffect(() => setDraft(value), [value])

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          aria-label={`${label} picker`}
          value={value}
          onChange={e => onChange(e.target.value)}
          className="h-9 w-12 cursor-pointer rounded-md border border-input bg-background p-1"
        />
        <Input
          id={id}
          value={draft}
          onChange={e => {
            const next = e.target.value.trim()
            setDraft(next)
            if (/^#[0-9a-f]{6}$/i.test(next)) onChange(next.toLowerCase())
          }}
          onBlur={() => setDraft(value)}
          className="w-32 font-mono"
          maxLength={7}
        />
      </div>
      <p className="text-sm text-muted-foreground">{description}</p>
      {issues.length > 0 && <ContrastWarning issues={issues} />}
    </div>
  )
}

// How the chosen colours and fonts look together.
const ThemePreview = ({ theme }: { theme: Theme }) => {
  useGoogleFonts(theme)

  return (
    <div
      className="rounded-lg border p-6 space-y-3"
      style={{ fontFamily: `'${theme.sansSerifFont}', sans-serif` }}
    >
      <p
        className="text-2xl font-bold"
        style={{
          fontFamily: `'${theme.serifFont}', serif`,
          color: theme.primaryColor,
        }}
      >
        Preview heading
      </p>
      <p className="text-sm" style={{ color: theme.secondaryColor }}>
        Supporting text in the secondary colour, set in {theme.sansSerifFont}.
      </p>
      <span
        className="inline-flex rounded-md px-4 py-2 text-sm font-medium"
        style={{
          backgroundColor: theme.primaryColor,
          color: readableTextOn(theme.primaryColor),
        }}
      >
        A button
      </span>
    </div>
  )
}

const WebsiteSettingsForm = ({
  group,
  initial,
}: {
  group: Group
  initial: WebsiteSettings
}) => {
  const [name, setName] = useState(group.name)
  const [isActive, setIsActive] = useState(group.isActive ?? true)
  const [description, setDescription] = useState(initial.description)
  const [contact, setContact] = useState(initial.contact)
  const [theme, setTheme] = useState(initial.theme)

  const updateGroup = useUpdateGroup('Website settings saved')

  const contactField =
    (key: keyof Contact) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setContact(previous => ({ ...previous, [key]: e.target.value }))

  const setThemeValue = <K extends keyof Theme>(key: K, value: Theme[K]) =>
    setTheme(previous => ({ ...previous, [key]: value }))

  const contrastIssues = wcagContrastIssues(theme)
  const failsWcag =
    contrastIssues.primary.length + contrastIssues.secondary.length > 0

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    updateGroup.mutate({
      id: group.id,
      data: {
        name: name.trim(),
        isActive,
        website: { description, contact, theme },
      },
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>General</CardTitle>
          <CardDescription>
            The group's name, and whether visitors can see its site.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="group-name">Name *</Label>
            <Input
              id="group-name"
              value={name}
              onChange={e => setName(e.target.value)}
              required
            />
            <p className="text-sm text-muted-foreground">
              Its address stays /{group.slug}.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="group-description">Description</Label>
            <Textarea
              id="group-description"
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={3}
            />
            <p className="text-sm text-muted-foreground">
              A sentence or two about the group, used as the site's description
              for search engines.
            </p>
          </div>

          <div className="flex items-center justify-between gap-4 rounded-lg border p-4">
            <div className="space-y-1">
              <Label htmlFor="group-active">Active</Label>
              <p className="text-sm text-muted-foreground">
                Inactive groups are hidden from visitors.
              </p>
            </div>
            <Switch
              id="group-active"
              checked={isActive}
              onCheckedChange={setIsActive}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Contact Details</CardTitle>
          <CardDescription>
            Shown on the Contact page. Anything left empty is hidden.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="contact-email">Email</Label>
              <Input
                id="contact-email"
                type="email"
                value={contact.email}
                onChange={contactField('email')}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact-phone">Phone</Label>
              <Input
                id="contact-phone"
                type="tel"
                value={contact.phone}
                onChange={contactField('phone')}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="contact-address">Address</Label>
              <Textarea
                id="contact-address"
                value={contact.address}
                onChange={contactField('address')}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact-office-hours">Office hours</Label>
              <Textarea
                id="contact-office-hours"
                value={contact.officeHours}
                onChange={contactField('officeHours')}
                rows={3}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="contact-media-intro">Media enquiries text</Label>
              <Textarea
                id="contact-media-intro"
                value={contact.mediaIntro}
                onChange={contactField('mediaIntro')}
                placeholder="For media enquiries, please contact our communications team at:"
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact-media-email">Media enquiries email</Label>
              <Input
                id="contact-media-email"
                type="email"
                value={contact.mediaEmail}
                onChange={contactField('mediaEmail')}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Images</CardTitle>
          <CardDescription>
            The browser tab icon, the group's logo, and a banner for the home
            page.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <CompactImageUpload
              id="theme-favicon"
              label="Favicon"
              description="The browser tab icon. A square PNG, SVG or ICO, at least 32×32px."
              value={theme.faviconUrl}
              onChange={url => setThemeValue('faviconUrl', url)}
              previewClassName="h-12 w-12"
            />
            <CompactImageUpload
              id="theme-logo"
              label="Logo"
              description="Not shown yet: header layouts that use it are coming. Ideally an SVG or a PNG with a transparent background."
              value={theme.logoUrl}
              onChange={url => setThemeValue('logoUrl', url)}
              previewClassName="h-16 w-40"
            />
          </div>

          <div className="space-y-4">
            <ImageUpload
              currentImageUrl={theme.heroImageUrl ?? undefined}
              onImageUploaded={url =>
                setTheme(previous => ({
                  ...previous,
                  heroImageUrl: url || null,
                  // Show a new image straight away; hide a removed one.
                  showHeroImage: Boolean(url),
                }))
              }
              label="Hero image"
              description="A wide banner across the home page, under the navigation. At least 1600px wide; it's cropped to fit."
            />
            <div className="flex items-center justify-between gap-4 rounded-lg border p-4">
              <div className="space-y-1">
                <Label htmlFor="theme-show-hero">
                  Show the hero image on the home page
                </Label>
                <p className="text-sm text-muted-foreground">
                  Hide it without losing the upload.
                </p>
              </div>
              <Switch
                id="theme-show-hero"
                checked={theme.showHeroImage}
                disabled={!theme.heroImageUrl}
                onCheckedChange={checked =>
                  setThemeValue('showHeroImage', checked)
                }
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1.5">
              <CardTitle>Appearance</CardTitle>
              <CardDescription>
                The site's colours and fonts. The defaults match Kotahi's.
              </CardDescription>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                setTheme(previous => {
                  const defaults = defaultWebsiteSettings.theme

                  return {
                    ...previous,
                    primaryColor: defaults.primaryColor,
                    secondaryColor: defaults.secondaryColor,
                    serifFont: defaults.serifFont,
                    sansSerifFont: defaults.sansSerifFont,
                  }
                })
              }
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              Default colours and fonts
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ColourField
              id="theme-primary"
              label="Primary colour"
              description="Buttons, headings, links and highlights."
              value={theme.primaryColor}
              issues={contrastIssues.primary}
              onChange={value => setThemeValue('primaryColor', value)}
            />
            <ColourField
              id="theme-secondary"
              label="Secondary colour"
              description="Supporting text, and a tint of it for light backgrounds."
              value={theme.secondaryColor}
              issues={contrastIssues.secondary}
              onChange={value => setThemeValue('secondaryColor', value)}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FontField
              id="theme-serif"
              label="Serif font (headings)"
              fonts={serifFonts}
              expectedCategory="Serif"
              value={theme.serifFont}
              onChange={value => setThemeValue('serifFont', value)}
            />
            <FontField
              id="theme-sans-serif"
              label="Sans serif font (body text)"
              fonts={sansSerifFonts}
              expectedCategory="Sans Serif"
              value={theme.sansSerifFont}
              onChange={value => setThemeValue('sansSerifFont', value)}
            />
          </div>

          <ThemePreview theme={theme} />
        </CardContent>
        <CardFooter className="justify-end gap-4">
          {failsWcag && (
            <p className="flex items-center gap-2 text-sm text-warning">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              The colours don't meet WCAG AA. You can still save, but some
              visitors may struggle to read the site.
            </p>
          )}
          <Button type="submit" disabled={updateGroup.isPending}>
            {updateGroup.isPending ? 'Saving...' : 'Save Website Settings'}
          </Button>
        </CardFooter>
      </Card>
    </form>
  )
}

const ApiSettingsForm = ({
  group,
  initial,
}: {
  group: Group
  initial: KotahiConnection
}) => {
  const { toast } = useToast()
  const [kotahi, setKotahi] = useState(initial)

  const updateGroup = useUpdateGroup('Kotahi settings saved')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!kotahi.endpoint.trim() || !kotahi.kotahiGroupId) {
      toast({
        title: 'Validation Error',
        description: 'Check the endpoint and choose a Kotahi group',
        variant: 'destructive',
      })
      return
    }

    updateGroup.mutate({
      id: group.id,
      data: { kotahi: toKotahiInput(kotahi) },
    })
  }

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardHeader>
          <CardTitle>Kotahi</CardTitle>
          <CardDescription>
            The Kotahi GraphQL API this group publishes from, and which of its
            groups.
          </CardDescription>
        </CardHeader>
        <CardContent className="max-w-2xl">
          <KotahiConnectionFields
            idPrefix="api"
            value={kotahi}
            onChange={setKotahi}
            loadGroupsOnMount
          />
        </CardContent>
        <CardFooter className="justify-end">
          <Button type="submit" disabled={updateGroup.isPending}>
            {updateGroup.isPending ? 'Saving...' : 'Save Kotahi Settings'}
          </Button>
        </CardFooter>
      </Card>
    </form>
  )
}

const WebsiteTab = ({ group }: { group: Group }) => {
  const trpc = useTRPC()

  const { data: website, isLoading } = useQuery(
    trpc.groupWebsite.queryOptions({ groupId: group.id }),
  )

  if (isLoading || !website) return <Spinner />

  return <WebsiteSettingsForm group={group} initial={website} />
}

const ApiTab = ({ group }: { group: Group }) => {
  const trpc = useTRPC()

  const { data: settings, isLoading } = useQuery(
    trpc.settingsByPurpose.queryOptions({
      groupId: group.id,
      purpose: 'kotahi',
    }),
  )

  if (isLoading) return <Spinner />

  const formData =
    settings && isKotahiSettingsFormData(settings.formData)
      ? settings.formData
      : null

  return (
    <ApiSettingsForm
      group={group}
      initial={{
        endpoint: formData?.endpoint ?? '',
        apiKey: formData?.apiKey ?? '',
        kotahiGroupId: group.kotahiGroupId,
      }}
    />
  )
}

export default function GroupSettingsAdmin() {
  const group = useGroup()

  // The open tab is in the URL (?tab=api), so it can be linked to.
  const [searchParams, setSearchParams] = useSearchParams()
  const requestedTab = searchParams.get('tab')
  const tab: Tab = tabs.find(t => t === requestedTab) ?? 'website'

  const setTab = (next: string) =>
    setSearchParams(
      params => {
        const updated = new URLSearchParams(params)

        if (next === 'website') updated.delete('tab')
        else updated.set('tab', next)

        return updated
      },
      { replace: true },
    )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground mt-1">{group.name}</p>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="website">Website</TabsTrigger>
          <TabsTrigger value="api">API</TabsTrigger>
        </TabsList>

        {/* Keyed by group, so switching groups loads fresh forms. */}
        <TabsContent value="website">
          <WebsiteTab key={group.id} group={group} />
        </TabsContent>
        <TabsContent value="api">
          <ApiTab key={group.id} group={group} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
