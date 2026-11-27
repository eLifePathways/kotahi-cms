import { useQuery } from '@tanstack/react-query'
import { Clock, Mail, MapPin, Phone } from 'lucide-react'
import HeroSection from '@/components/sections/hero-section'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useTRPC } from '@/utils/trpc'
import { useGroup } from '@/hooks/use-group'

const ContactItem = ({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode
  label: string
  children: React.ReactNode
}) => (
  <div className="flex items-start">
    <span className="mt-0.5 mr-3 shrink-0 text-primary">{icon}</span>
    <div>
      <h3 className="font-medium">{label}</h3>
      <div className="text-sm text-muted-foreground whitespace-pre-line">
        {children}
      </div>
    </div>
  </div>
)

const EmailLink = ({ email }: { email: string }) => (
  <a className="text-link hover:underline" href={`mailto:${email}`}>
    {email}
  </a>
)

export default function Contact() {
  const trpc = useTRPC()
  const { id: groupId } = useGroup()

  const { data: heroSectionData, isLoading: heroSectionLoading } = useQuery(
    trpc.heroSectionByName.queryOptions({ groupId, name: 'contact' }),
  )

  const { data: website } = useQuery(
    trpc.groupWebsite.queryOptions({ groupId }),
  )

  const { description = '', title = '' } = heroSectionData ?? {}
  const { address, email, mediaEmail, mediaIntro, officeHours, phone } =
    website?.contact ?? {}

  // Each part is shown only when the group has filled it in.
  const hasContactInformation = Boolean(
    email || phone || address || officeHours,
  )
  const hasMediaEnquiries = Boolean(mediaIntro || mediaEmail)

  return (
    <div className="container mx-auto px-4 py-8">
      <HeroSection
        title={title}
        description={description}
        loading={heroSectionLoading}
      />

      {(hasContactInformation || hasMediaEnquiries) && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mt-12">
          {hasContactInformation && (
            <Card>
              <CardHeader>
                <CardTitle className="text-xl font-semibold text-primary">
                  Contact Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {email && (
                  <ContactItem
                    icon={<Mail className="h-5 w-5" />}
                    label="Email"
                  >
                    <EmailLink email={email} />
                  </ContactItem>
                )}
                {phone && (
                  <ContactItem
                    icon={<Phone className="h-5 w-5" />}
                    label="Phone"
                  >
                    <a
                      className="text-link hover:underline"
                      href={`tel:${phone.replace(/[^\d+]/g, '')}`}
                    >
                      {phone}
                    </a>
                  </ContactItem>
                )}
                {address && (
                  <ContactItem
                    icon={<MapPin className="h-5 w-5" />}
                    label="Address"
                  >
                    {address}
                  </ContactItem>
                )}
                {officeHours && (
                  <ContactItem
                    icon={<Clock className="h-5 w-5" />}
                    label="Office Hours"
                  >
                    {officeHours}
                  </ContactItem>
                )}
              </CardContent>
            </Card>
          )}

          {hasMediaEnquiries && (
            <Card>
              <CardHeader>
                <CardTitle className="text-xl font-semibold text-primary">
                  Media Enquiries
                </CardTitle>
              </CardHeader>
              <CardContent>
                {mediaIntro && (
                  <p className="text-sm text-muted-foreground whitespace-pre-line">
                    {mediaIntro}
                  </p>
                )}
                {mediaEmail && (
                  <p className="text-sm font-medium mt-2">
                    <EmailLink email={mediaEmail} />
                  </p>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}
