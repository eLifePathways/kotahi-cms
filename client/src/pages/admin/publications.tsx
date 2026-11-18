import { useEffect, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useToast } from '@/hooks/use-toast'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Loader2,
  Pencil,
  Trash,
  RefreshCw,
  AlertCircle,
} from 'lucide-react'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { useTRPC, type RouterOutputs } from '@/utils/trpc'
import { isKotahiSettingsFormData } from '@shared/utils'
import HeroSection from '@/components/sections/hero-section'
import { SafeHtml } from '../../components/ui/safe-html'

type Publication = RouterOutputs['publications'][number]

const formSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  authors: z.string().min(3, 'Authors must be at least 3 characters'),
  year: z.coerce
    .number<string | number>()
    .min(1900)
    .max(new Date().getFullYear()),
  abstract: z.string().min(10, 'Abstract must be at least 10 characters'),
  publicationDate: z.string(),
  link: z.string().url('Must be a valid URL').optional().or(z.literal('')),
})

export default function PublicationsAdmin() {
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedPublication, setSelectedPublication] =
    useState<Publication | null>(null)
  const [isFetchingPublications, setIsFetchingPublications] = useState(false)

  const [isEditingHeroSection, setEditingHeroSection] = useState(false)
  const [heroSectionFormData, setHeroSectionFormData] = useState({
    name: 'team',
    title: '',
    description: '',
  })

  const queryClient = useQueryClient()
  const trpc = useTRPC()
  const { toast } = useToast()

  const { data: publications, isLoading: isLoadingPublications } = useQuery(
    trpc.publications.queryOptions({}),
  )

  const { data: settings, isLoading: isSettingsQueryLoading } = useQuery(
    trpc.settingsByPurpose.queryOptions({ purpose: 'kotahi' }),
  )

  const { data: heroSectionData, isLoading: heroSectionLoading } = useQuery(
    trpc.heroSectionByName.queryOptions({ name: 'publications' }),
  )

  // The list, and any single publication, cached under the publication
  // procedures.
  const invalidatePublications = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: trpc.publications.pathKey() }),
      queryClient.invalidateQueries({ queryKey: trpc.publication.pathKey() }),
      queryClient.invalidateQueries({
        queryKey: trpc.publicationAndReviews.pathKey(),
      }),
    ])

  const endpoint =
    settings && isKotahiSettingsFormData(settings.formData)
      ? settings.formData.endpoint
      : null

  const editForm = useForm<
    z.input<typeof formSchema>,
    unknown,
    z.output<typeof formSchema>
  >({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      authors: '',
      year: new Date().getFullYear(),
      abstract: '',
      publicationDate: new Date().toISOString().split('T')[0],
      link: '',
    },
  })

  const updatePublication = useMutation(
    trpc.updatePublication.mutationOptions({
      onSuccess: () => {
        invalidatePublications()
        setIsEditDialogOpen(false)
        setSelectedPublication(null)
        toast({
          title: 'Publication updated',
          description: 'The publication has been updated successfully.',
        })
      },
      onError: error => {
        console.error('Error updating publication:', error)
        toast({
          title: 'Error',
          description: 'Failed to update publication. Please try again.',
          variant: 'destructive',
        })
      },
    }),
  )

  const deletePublication = useMutation(
    trpc.deletePublication.mutationOptions({
      onSuccess: () => {
        invalidatePublications()
        setIsDeleteDialogOpen(false)
        setSelectedPublication(null)
        toast({
          title: 'Publication deleted',
          description: 'The publication has been deleted successfully.',
        })
      },
      onError: error => {
        console.error('Error deleting publication:', error)
        toast({
          title: 'Error',
          description: 'Failed to delete publication. Please try again.',
          variant: 'destructive',
        })
      },
    }),
  )

  const refreshPublications = useMutation(
    trpc.syncFromKotahi.mutationOptions({
      onSuccess: () => {
        invalidatePublications()
        toast({
          title: 'Publications refreshed',
          description: 'The publications have been refreshed successfully.',
        })
      },
      onError: error => {
        console.error('Error refreshing publications:', error)
        toast({
          title: 'Error',
          description: error.message || 'Failed to refresh publications',
          variant: 'destructive',
        })
      },
      onSettled: () => {
        setIsFetchingPublications(false)
      },
    }),
  )

  const updateHeroSection = useMutation(
    trpc.updateHeroSection.mutationOptions({
      onSuccess: () => {
        toast({
          title: 'Success',
          description: 'Page header updated successfully!',
        })
        queryClient.invalidateQueries({
          queryKey: trpc.heroSectionByName.queryKey({ name: 'publications' }),
        })
        setEditingHeroSection(false)
      },
      onError: (error: any) => {
        toast({
          title: 'Error',
          description: error.message || 'Failed to update page description.',
          variant: 'destructive',
        })
      },
    }),
  )

  useEffect(() => {
    if (heroSectionData) {
      setHeroSectionFormData(heroSectionData)
    }
  }, [heroSectionData])

  const onEditSubmit = (data: z.infer<typeof formSchema>) => {
    if (selectedPublication) {
      updatePublication.mutate({ id: selectedPublication.id, data })
    }
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

    const { description, title } = heroSectionFormData
    updateHeroSection.mutate({
      id: heroSectionData!.id,
      data: { description, title },
    })
  }

  const handleHeroSectionChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target
    setHeroSectionFormData(prev => ({
      ...prev,
      [name]: value,
    }))
  }

  const loadPublicationData = (publication: Publication) => {
    setSelectedPublication(publication)
    editForm.reset({
      title: publication.title,
      authors: publication.authors,
      year: publication.year,
      abstract: publication.abstract,
      publicationDate: publication.publicationDate,
      link: publication.link || '',
    })
    setIsEditDialogOpen(true)
  }

  const handleRefreshPublications = async () => {
    setIsFetchingPublications(true)

    refreshPublications.mutate()
  }

  return (
    <div className="container space-y-6">
      <div className="container pb-4">
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
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Publications</h1>

        <div className="space-x-2">
          <Button
            variant="outline"
            //   size="sm"
            onClick={handleRefreshPublications}
            disabled={isFetchingPublications || !endpoint}
          >
            {isFetchingPublications ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading Publications...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh Publications
              </>
            )}
          </Button>
        </div>
      </div>

      {isLoadingPublications ? (
        <div className="space-y-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : (
        <div>
          <>
            {!isSettingsQueryLoading && !endpoint && (
              <div className="bg-warning/10 border border-warning/30 text-warning p-4 rounded mb-4">
                <div className="flex items-center">
                  <AlertCircle className="h-5 w-5 mr-2 shrink-0" />
                  <p>
                    Please configure your GraphQL endpoint in the{' '}
                    <span className="font-semibold">GraphQL API</span> tab
                    first.
                  </p>
                </div>
              </div>
            )}
          </>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Authors</TableHead>
                  <TableHead>Year</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {publications &&
                  publications.map(publication => (
                    <TableRow key={publication.id}>
                      <TableCell className="font-medium">
                        <SafeHtml html={publication.title} />
                      </TableCell>
                      <TableCell>{publication.authors}</TableCell>
                      <TableCell>{publication.year}</TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => loadPublicationData(publication)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>

                          <Dialog
                            open={
                              isDeleteDialogOpen &&
                              selectedPublication?.id === publication.id
                            }
                            onOpenChange={open =>
                              !open && setSelectedPublication(null)
                            }
                          >
                            <DialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-destructive-text border-destructive/30 hover:bg-destructive/10"
                                onClick={() => {
                                  setSelectedPublication(publication)
                                  setIsDeleteDialogOpen(true)
                                }}
                              >
                                <Trash className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Delete Publication</DialogTitle>
                                <DialogDescription>
                                  Are you sure you want to delete "
                                  {publication.title}"? This action cannot be
                                  undone.
                                </DialogDescription>
                              </DialogHeader>
                              <DialogFooter>
                                <DialogClose asChild>
                                  <Button variant="outline">Cancel</Button>
                                </DialogClose>
                                <DialogClose asChild>
                                  <Button
                                    variant="destructive"
                                    onClick={() =>
                                      deletePublication.mutate({
                                        id: publication.id,
                                      })
                                    }
                                    disabled={deletePublication.isPending}
                                  >
                                    {deletePublication.isPending
                                      ? 'Deleting...'
                                      : 'Delete'}
                                  </Button>
                                </DialogClose>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Edit Publication Dialog */}
      <Dialog
        open={isEditingHeroSection}
        onOpenChange={open => {
          setEditingHeroSection(open)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Page Header</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditHeroDescription}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  name="title"
                  value={heroSectionFormData.title}
                  onChange={handleHeroSectionChange}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description *</Label>
                <Input
                  id="description"
                  name="description"
                  value={heroSectionFormData.description}
                  onChange={handleHeroSectionChange}
                  required
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={updateHeroSection.isPending}>
                {updateHeroSection.isPending
                  ? 'Updating...'
                  : 'Update Page Header'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Publication</DialogTitle>
            <DialogDescription>
              Update the details of this publication.
            </DialogDescription>
          </DialogHeader>

          <Form {...editForm}>
            <form
              onSubmit={editForm.handleSubmit(onEditSubmit)}
              className="space-y-4"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={editForm.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Title</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={editForm.control}
                  name="authors"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Authors</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={editForm.control}
                  name="year"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Year</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={1900}
                          max={new Date().getFullYear()}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={editForm.control}
                  name="publicationDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Publication Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={editForm.control}
                  name="link"
                  render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel>Link (optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="https://" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={editForm.control}
                  name="abstract"
                  render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel>Abstract</FormLabel>
                      <FormControl>
                        <Textarea rows={5} className="resize-none" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <DialogFooter>
                <Button type="submit" disabled={updatePublication.isPending}>
                  {updatePublication.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    'Update Publication'
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
