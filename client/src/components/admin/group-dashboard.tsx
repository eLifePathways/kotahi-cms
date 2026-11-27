import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link, useLocation } from 'wouter'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { Users, BookOpen, Pencil } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ImageUpload } from '@/components/ui/image-upload'
import { useToast } from '@/hooks/use-toast'
import { useState, useEffect } from 'react'
import HeroSection from '../sections/hero-section'
import { useTRPC } from '../../utils/trpc'
import { useGroup } from '@/hooks/use-group'

export default function GroupAdminDashboard() {
  const trpc = useTRPC()
  const { id: groupId } = useGroup()

  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [, setLocation] = useLocation()

  // Dialog states
  const [addTeamMemberDialogOpen, setAddTeamMemberDialogOpen] = useState(false)
  const [editingHeroSection, setEditingHeroSection] = useState(false)

  // Team member form state
  const [teamMemberFormData, setTeamMemberFormData] = useState({
    name: '',
    title: '',
    institution: '',
    description: '',
    imageUrl: '',
    email: '',
    website: '',
    socialMedia: '',
  })

  const [heroSectionFormData, setHeroSectionFormData] = useState({
    name: 'home',
    title: '',
    description: '',
  })

  // Form change handlers
  const handleTeamMemberFormChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target
    setTeamMemberFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleHeroSectionFormChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target
    setHeroSectionFormData(prev => ({ ...prev, [name]: value }))
  }

  // Fetch data for dashboard statistics
  const { data: teamMembers = [] } = useQuery(
    trpc.teamMembers.queryOptions({ groupId }),
  )

  const { data: publications = [] } = useQuery(
    trpc.publications.queryOptions({ groupId }),
  )

  // Hero section for the dashboard page header
  const { data: heroSection, isLoading: heroSectionLoading } = useQuery(
    trpc.heroSectionByName.queryOptions({ groupId, name: 'home' }),
  )

  // Keep the form (and live preview) in sync with the saved hero section
  useEffect(() => {
    if (heroSection) {
      setHeroSectionFormData({
        name: heroSection.name,
        title: heroSection.title,
        description: heroSection.description,
      })
    }
  }, [heroSection])

  // Update hero section mutation
  const updateHeroSection = useMutation(
    trpc.updateHeroSection.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: trpc.heroSectionByName.queryKey({ groupId, name: 'home' }),
        })
        toast({
          title: 'Success',
          description: 'Page header updated successfully',
        })
        setEditingHeroSection(false)
      },
      onError: error => {
        toast({
          title: 'Error',
          description: 'Failed to update page header',
          variant: 'destructive',
        })
        console.error('Error updating hero section:', error)
      },
    }),
  )

  // Add team member mutation
  const addTeamMember = useMutation(
    trpc.createTeamMember.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: trpc.teamMembers.queryKey(),
        })
        queryClient.invalidateQueries({ queryKey: trpc.teamMember.pathKey() })
        toast({
          title: 'Success',
          description: 'Team member added successfully',
        })
        setAddTeamMemberDialogOpen(false)
        setTeamMemberFormData({
          name: '',
          title: '',
          institution: '',
          description: '',
          imageUrl: '',
          email: '',
          website: '',
          socialMedia: '',
        })
      },
      onError: error => {
        toast({
          title: 'Error',
          description: 'Failed to add team member',
          variant: 'destructive',
        })
        console.error('Error adding team member:', error)
      },
    }),
  )

  // Handle team member form submit
  const handleTeamMemberSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    // Validation
    if (
      !teamMemberFormData.name ||
      !teamMemberFormData.title ||
      !teamMemberFormData.institution
    ) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      })
      return
    }

    addTeamMember.mutate({ data: { ...teamMemberFormData, groupId } })
  }

  const handleEditHeroDescription = (e: React.FormEvent) => {
    e.preventDefault()

    if (!heroSectionFormData.title || !heroSectionFormData.description) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields.',
        variant: 'destructive',
      })

      return
    }

    if (!heroSection) return

    const { description, title } = heroSectionFormData
    updateHeroSection.mutate({
      id: heroSection.id,
      data: { description, title },
    })
  }

  // Prepare data for publications by year chart - using real database values
  const publicationsByYear =
    publications && Array.isArray(publications)
      ? Object.entries(
          publications.reduce(
            (acc: Record<string, number>, pub) => {
              // Ensure we're working with numeric year values
              const year =
                typeof pub.year === 'number'
                  ? pub.year.toString()
                  : String(pub.year)
              acc[year] = (acc[year] || 0) + 1
              return acc
            },
            {} as Record<string, number>,
          ),
        )
          .map(([year, count]) => ({
            year: year, // Keep year as string for display
            count: count, // Actual count from database
          }))
          .sort((a, b) => parseInt(a.year) - parseInt(b.year))
      : []

  // Stats cards data
  const statsCards = [
    {
      title: 'Team Members',
      value: teamMembers?.length || 0,
      description: 'Researchers and staff members',
      icon: <Users className="h-6 w-6" />,
      href: '/team',
      color: 'bg-info/10 text-info',
    },
    {
      title: 'Publications',
      value: publications?.length || 0,
      description: 'Research publications',
      icon: <BookOpen className="h-6 w-6" />,
      href: '/publications',
      color: 'bg-success/10 text-success',
    },
  ]

  return (
    <div className="space-y-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Dashboard</h1>

        <HeroSection
          description={heroSectionFormData.description}
          loading={heroSectionLoading}
          title={heroSectionFormData.title}
        />
        <Button onClick={() => setEditingHeroSection(true)}>
          <Pencil className="mr-2 h-4 w-4" />
          Edit Page Header
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {statsCards.map(card => (
          <Link key={card.title} href={card.href}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-lg">{card.title}</CardTitle>
                  <div className={`p-2 rounded-full ${card.color}`}>
                    {card.icon}
                  </div>
                </div>
                <CardDescription>{card.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{card.value}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Publications Chart */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Publication Year of Papers Reviewed</CardTitle>
          <CardDescription>
            Number of publications by year of publication
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={publicationsByYear}
                margin={{ top: 20, right: 30, left: 20, bottom: 30 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="year"
                  tickFormatter={value => value}
                  tick={{ fontSize: 11 }}
                  interval={2} // Show every 2nd year label to avoid crowding
                />
                <YAxis
                  allowDecimals={false}
                  domain={[0, 'auto']}
                  tickFormatter={value => value}
                />
                <Tooltip
                  formatter={value => [`${value} Publications`, 'Count']}
                  labelFormatter={value => `Year: ${value}`}
                  contentStyle={{ borderRadius: '8px' }}
                />
                <Bar
                  dataKey="count"
                  fill="var(--primary)"
                  name="Publications"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common tasks and operations</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Add Team Member Dialog */}
            <div
              className="flex items-center p-3 rounded-lg border border-border hover:bg-muted transition-colors cursor-pointer"
              onClick={() => setAddTeamMemberDialogOpen(true)}
            >
              <div className="p-2 rounded-full bg-info/10 text-info mr-3">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <p className="font-medium">Add Team Member</p>
                <p className="text-sm text-muted-foreground">
                  Create a new researcher profile
                </p>
              </div>
            </div>

            {/* Publications come from Kotahi; manage them on their page */}
            <div
              className="flex items-center p-3 rounded-lg border border-border hover:bg-muted transition-colors cursor-pointer"
              onClick={() => setLocation('/publications')}
            >
              <div className="p-2 rounded-full bg-success/10 text-success mr-3">
                <BookOpen className="h-5 w-5" />
              </div>
              <div>
                <p className="font-medium">Manage Publications</p>
                <p className="text-sm text-muted-foreground">
                  Sync from Kotahi or edit publications
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Team Member Dialog */}
      <Dialog
        open={addTeamMemberDialogOpen}
        onOpenChange={setAddTeamMemberDialogOpen}
      >
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Add Team Member</DialogTitle>
            <DialogDescription>
              Add details about a team member or researcher.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleTeamMemberSubmit} className="space-y-4 mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  name="name"
                  value={teamMemberFormData.name}
                  onChange={handleTeamMemberFormChange}
                  placeholder="Full name"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  name="title"
                  value={teamMemberFormData.title}
                  onChange={handleTeamMemberFormChange}
                  placeholder="Position or title"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="institution">Institution *</Label>
              <Input
                id="institution"
                name="institution"
                value={teamMemberFormData.institution}
                onChange={handleTeamMemberFormChange}
                placeholder="University or organization"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Bio</Label>
              <Textarea
                id="description"
                name="description"
                value={teamMemberFormData.description}
                onChange={handleTeamMemberFormChange}
                placeholder="Brief biography"
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="imageUrl">Profile Image</Label>
              <ImageUpload
                currentImageUrl={teamMemberFormData.imageUrl}
                onImageUploaded={url => {
                  setTeamMemberFormData(prev => ({ ...prev, imageUrl: url }))
                }}
                label="Upload a profile image"
                description="Recommended size: 400x400px"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={teamMemberFormData.email}
                  onChange={handleTeamMemberFormChange}
                  placeholder="email@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="website">Website</Label>
                <Input
                  id="website"
                  name="website"
                  value={teamMemberFormData.website}
                  onChange={handleTeamMemberFormChange}
                  placeholder="https://example.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="socialMedia">Social Media</Label>
                <Input
                  id="socialMedia"
                  name="socialMedia"
                  value={teamMemberFormData.socialMedia}
                  onChange={handleTeamMemberFormChange}
                  placeholder="https://twitter.com/handle"
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="submit" disabled={addTeamMember.isPending}>
                {addTeamMember.isPending ? 'Saving...' : 'Save Team Member'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Page Header Dialog */}
      <Dialog
        open={editingHeroSection}
        onOpenChange={open => {
          setEditingHeroSection(open)
          // Discard unsaved edits when closing without saving
          if (!open && heroSection) {
            setHeroSectionFormData({
              name: heroSection.name,
              title: heroSection.title,
              description: heroSection.description,
            })
          }
        }}
      >
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Edit Page Header</DialogTitle>
            <DialogDescription>
              Update the title and description shown at the top of the
              dashboard.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditHeroDescription} className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="heroTitle">Title *</Label>
              <Input
                id="heroTitle"
                name="title"
                value={heroSectionFormData.title}
                onChange={handleHeroSectionFormChange}
                placeholder="Page header title"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="heroDescription">Description *</Label>
              <Textarea
                id="heroDescription"
                name="description"
                value={heroSectionFormData.description}
                onChange={handleHeroSectionFormChange}
                placeholder="Supporting text shown under the title"
                rows={4}
                required
              />
            </div>

            <DialogFooter>
              <Button type="submit" disabled={updateHeroSection.isPending}>
                {updateHeroSection.isPending ? 'Saving...' : 'Save Header'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
