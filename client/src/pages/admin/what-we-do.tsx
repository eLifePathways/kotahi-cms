import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useToast } from '@/hooks/use-toast'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { ImageUpload } from '@/components/ui/image-upload'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useTRPC, type RouterOutputs } from '@/utils/trpc'
import { useGroup } from '@/hooks/use-group'
import HeroSection from '../../components/sections/hero-section'
import { Pencil } from 'lucide-react'
import { Label } from '../../components/ui/label'

// Types
type WhatWeDoSection = RouterOutputs['whatWeDoSections'][number]
type WhatWeDoContent = RouterOutputs['whatWeDoContentBySection'][number]

// Form Schemas
const sectionFormSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  subtitle: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  imageUrl: z.string().optional().nullable(),
  slug: z
    .string()
    .min(1, 'Slug is required')
    .regex(
      /^[a-z0-9-]+$/,
      'Slug can only contain lowercase letters, numbers, and hyphens',
    ),
  sortOrder: z.number().int().nonnegative().default(0),
})

const contentFormSchema = z.object({
  sectionId: z.string().min(1, 'Section is required'),
  title: z.string().optional().nullable(),
  contentType: z.enum(['text', 'image', 'heading', 'list']),
  content: z.string().min(1, 'Content is required'),
  sortOrder: z.number().int().nonnegative().default(0),
  metadata: z.any().optional().nullable(),
})

// Section Form Component
const SectionForm = ({
  section,
  onSubmit,
  onCancel,
}: {
  section?: WhatWeDoSection
  onSubmit: (data: any) => void
  onCancel: () => void
}) => {
  const form = useForm({
    resolver: zodResolver(sectionFormSchema),
    defaultValues: section
      ? {
          ...section,
          subtitle: section.subtitle || '',
          description: section.description || '',
          imageUrl: section.imageUrl || '',
        }
      : {
          title: '',
          subtitle: '',
          description: '',
          imageUrl: '',
          slug: '',
          sortOrder: 0,
        },
    mode: 'onSubmit',
  })

  const handleImageUploaded = (imageUrl: string) => {
    form.setValue('imageUrl', imageUrl)
  }

  // Generate the slug from the title
  const autoGenerateSlug = (title: string) => {
    const generatedSlug = title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
      .trim()

    // Set the slug value
    form.setValue('slug', generatedSlug)
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Title</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  onChange={e => {
                    field.onChange(e)
                    autoGenerateSlug(e.target.value)
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="subtitle"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Subtitle (optional)</FormLabel>
              <FormControl>
                <Input {...field} value={field.value || ''} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description (optional)</FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  value={field.value || ''}
                  className="min-h-[100px]"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="slug"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Slug</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormDescription>
                URL-friendly identifier, e.g., "research-initiatives"
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="sortOrder"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Sort Order</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  {...field}
                  onChange={e => field.onChange(parseInt(e.target.value))}
                />
              </FormControl>
              <FormDescription>
                Determines the display order, lower numbers appear first
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="imageUrl"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Featured Image (optional)</FormLabel>
              <FormControl>
                <ImageUpload
                  currentImageUrl={field.value || undefined}
                  onImageUploaded={handleImageUploaded}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end space-x-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit">{section ? 'Update' : 'Create'} Section</Button>
        </div>
      </form>
    </Form>
  )
}

// Content Form Component
const ContentForm = ({
  content,
  sections,
  onSubmit,
  onCancel,
}: {
  content?: WhatWeDoContent
  sections: WhatWeDoSection[]
  onSubmit: (data: any) => void
  onCancel: () => void
}) => {
  const [contentType, setContentType] = useState(content?.contentType || 'text')
  const [metadataValue, setMetadataValue] = useState<string>(
    content?.metadata
      ? typeof content.metadata === 'string'
        ? content.metadata
        : JSON.stringify(content.metadata, null, 2)
      : '',
  )

  const form = useForm({
    resolver: zodResolver(contentFormSchema),
    defaultValues: content
      ? {
          ...content,
          contentType: content.contentType as z.infer<
            typeof contentFormSchema
          >['contentType'],
          title: content.title || '',
          metadata: content.metadata,
        }
      : {
          sectionId: sections[0]?.id || '',
          title: '',
          contentType: 'text',
          content: '',
          sortOrder: 0,
          metadata: null,
        },
  })

  const handleImageUploaded = (imageUrl: string) => {
    form.setValue('content', imageUrl)
  }

  // Update form content type when dropdown changes
  useEffect(() => {
    setContentType(form.watch('contentType'))
  }, [form.watch('contentType')])

  // Process metadata before submission
  const processFormData = (data: any) => {
    let processedData = { ...data }

    // Parse metadata if it's a string and not empty
    if (contentType === 'list' || contentType === 'image') {
      try {
        if (metadataValue && typeof metadataValue === 'string') {
          processedData.metadata = JSON.parse(metadataValue)
        }
      } catch (e) {
        console.error('Invalid JSON in metadata', e)
        // Keep as string if parsing fails
        processedData.metadata = metadataValue
      }
    } else {
      processedData.metadata = null
    }

    onSubmit(processedData)
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(processFormData)} className="space-y-6">
        <FormField
          control={form.control}
          name="sectionId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Section</FormLabel>
              <FormControl>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a section" />
                  </SelectTrigger>
                  <SelectContent>
                    {sections.map(section => (
                      <SelectItem
                        key={section.id}
                        value={section.id.toString()}
                      >
                        {section.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="contentType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Content Type</FormLabel>
              <FormControl>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a content type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="text">Text</SelectItem>
                    <SelectItem value="image">Image</SelectItem>
                    <SelectItem value="heading">Heading</SelectItem>
                    <SelectItem value="list">List</SelectItem>
                  </SelectContent>
                </Select>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Title (optional)</FormLabel>
              <FormControl>
                <Input {...field} value={field.value || ''} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="content"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Content</FormLabel>
              <FormControl>
                {contentType === 'image' ? (
                  <ImageUpload
                    currentImageUrl={field.value}
                    onImageUploaded={handleImageUploaded}
                  />
                ) : contentType === 'text' ? (
                  <Textarea {...field} className="min-h-[150px]" />
                ) : (
                  <Input {...field} />
                )}
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {(contentType === 'list' || contentType === 'image') && (
          <FormItem>
            <FormLabel>
              {contentType === 'list'
                ? 'List Items (JSON)'
                : 'Image Metadata (JSON)'}
            </FormLabel>
            <FormControl>
              <Textarea
                value={metadataValue || ''}
                onChange={e => setMetadataValue(e.target.value)}
                className="min-h-[150px]"
                placeholder={
                  contentType === 'list'
                    ? '{"items": ["Item 1", "Item 2", "Item 3"]}'
                    : '{"caption": "Image caption", "altText": "Alternative text"}'
                }
              />
            </FormControl>
            <FormDescription>
              {contentType === 'list'
                ? 'For lists, use the format: {"items": ["Item 1", "Item 2"]}'
                : 'For images, use: {"caption": "Image caption", "altText": "Alternative text"}'}
            </FormDescription>
          </FormItem>
        )}

        <FormField
          control={form.control}
          name="sortOrder"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Sort Order</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  {...field}
                  onChange={e => field.onChange(parseInt(e.target.value))}
                />
              </FormControl>
              <FormDescription>
                Determines the display order, lower numbers appear first
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end space-x-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit">{content ? 'Update' : 'Create'} Content</Button>
        </div>
      </form>
    </Form>
  )
}

// Main Admin Component
export default function WhatWeDoAdmin() {
  const [activeTab, setActiveTab] = useState('sections')
  const [editingSection, setEditingSection] = useState<
    WhatWeDoSection | undefined
  >(undefined)
  const [editingContent, setEditingContent] = useState<
    WhatWeDoContent | undefined
  >(undefined)
  const [sectionDialogOpen, setSectionDialogOpen] = useState(false)
  const [contentDialogOpen, setContentDialogOpen] = useState(false)
  const [deletingSectionId, setDeletingSectionId] = useState<string | null>(
    null,
  )
  const [deletingContentId, setDeletingContentId] = useState<string | null>(
    null,
  )
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(
    null,
  )

  const [isEditingHeroSection, setEditingHeroSection] = useState(false)
  const [heroSectionFormData, setHeroSectionFormData] = useState({
    name: 'team',
    title: '',
    description: '',
  })

  const queryClient = useQueryClient()
  const trpc = useTRPC()
  const { id: groupId } = useGroup()
  const { toast } = useToast()

  // Queries
  const { data: sections = [], isLoading: sectionsLoading } = useQuery(
    trpc.whatWeDoSections.queryOptions({ groupId }),
  )

  const { data: contentItems = [], isLoading: contentLoading } = useQuery(
    trpc.whatWeDoContentBySection.queryOptions(
      { sectionId: selectedSectionId ?? '' },
      { enabled: !!selectedSectionId },
    ),
  )

  const { data: heroSectionData, isLoading: heroSectionLoading } = useQuery(
    trpc.heroSectionByName.queryOptions({ groupId, name: 'whatWeDo' }),
  )

  // The section list, and any single section by id or slug.
  const invalidateSections = () =>
    Promise.all([
      queryClient.invalidateQueries({
        queryKey: trpc.whatWeDoSections.queryKey(),
      }),
      queryClient.invalidateQueries({
        queryKey: trpc.whatWeDoSection.pathKey(),
      }),
      queryClient.invalidateQueries({
        queryKey: trpc.whatWeDoSectionBySlug.pathKey(),
      }),
    ])

  // The selected section's content list, and any single content item.
  const invalidateContent = () =>
    Promise.all([
      selectedSectionId &&
        queryClient.invalidateQueries({
          queryKey: trpc.whatWeDoContentBySection.queryKey({
            sectionId: selectedSectionId,
          }),
        }),
      queryClient.invalidateQueries({
        queryKey: trpc.whatWeDoContent.pathKey(),
      }),
    ])

  // Set first section as selected when data loads
  useEffect(() => {
    if (sections && sections.length > 0 && !selectedSectionId) {
      setSelectedSectionId(sections[0].id)
    }
  }, [sections, selectedSectionId])

  useEffect(() => {
    if (heroSectionData) {
      setHeroSectionFormData(heroSectionData)
    }
  }, [heroSectionData])

  // Mutations
  const createSectionMutation = useMutation(
    trpc.createWhatWeDoSection.mutationOptions({
      onSuccess: () => {
        invalidateSections()
        setSectionDialogOpen(false)
        toast({
          title: 'Section created',
          description: 'The section has been created successfully.',
        })
      },
      onError: error => {
        console.error('Error creating section:', error)
        toast({
          title: 'Error creating section',
          description: 'There was a problem creating the section.',
          variant: 'destructive',
        })
      },
    }),
  )

  const updateSectionMutation = useMutation(
    trpc.updateWhatWeDoSection.mutationOptions({
      onSuccess: () => {
        invalidateSections()
        setSectionDialogOpen(false)
        toast({
          title: 'Section updated',
          description: 'The section has been updated successfully.',
        })
      },
      onError: error => {
        console.error('Error updating section:', error)
        toast({
          title: 'Error updating section',
          description: 'There was a problem updating the section.',
          variant: 'destructive',
        })
      },
    }),
  )

  const deleteSectionMutation = useMutation(
    trpc.deleteWhatWeDoSection.mutationOptions({
      onSuccess: () => {
        invalidateSections()
        // Deleting a section cascades to its content
        queryClient.invalidateQueries({
          queryKey: trpc.whatWeDoContentBySection.pathKey(),
        })
        queryClient.invalidateQueries({
          queryKey: trpc.whatWeDoContent.pathKey(),
        })
        setDeletingSectionId(null)
        toast({
          title: 'Section deleted',
          description: 'The section has been deleted successfully.',
        })
      },
      onError: error => {
        console.error('Error deleting section:', error)
        toast({
          title: 'Error deleting section',
          description: 'There was a problem deleting the section.',
          variant: 'destructive',
        })
      },
    }),
  )

  const createContentMutation = useMutation(
    trpc.createWhatWeDoContent.mutationOptions({
      onSuccess: () => {
        invalidateContent()
        setContentDialogOpen(false)
        toast({
          title: 'Content created',
          description: 'The content has been created successfully.',
        })
      },
      onError: error => {
        console.error('Error creating content:', error)
        toast({
          title: 'Error creating content',
          description: 'There was a problem creating the content.',
          variant: 'destructive',
        })
      },
    }),
  )

  const updateContentMutation = useMutation(
    trpc.updateWhatWeDoContent.mutationOptions({
      onSuccess: () => {
        invalidateContent()
        setContentDialogOpen(false)
        toast({
          title: 'Content updated',
          description: 'The content has been updated successfully.',
        })
      },
      onError: error => {
        console.error('Error updating content:', error)
        toast({
          title: 'Error updating content',
          description: 'There was a problem updating the content.',
          variant: 'destructive',
        })
      },
    }),
  )

  const deleteContentMutation = useMutation(
    trpc.deleteWhatWeDoContent.mutationOptions({
      onSuccess: () => {
        invalidateContent()
        setDeletingContentId(null)
        toast({
          title: 'Content deleted',
          description: 'The content has been deleted successfully.',
        })
      },
      onError: error => {
        console.error('Error deleting content:', error)
        toast({
          title: 'Error deleting content',
          description: 'There was a problem deleting the content.',
          variant: 'destructive',
        })
      },
    }),
  )

  // Update page header mutation
  const updateHeroSection = useMutation(
    trpc.updateHeroSection.mutationOptions({
      onSuccess: () => {
        toast({
          title: 'Success',
          description: 'Page header updated successfully!',
        })
        queryClient.invalidateQueries({
          queryKey: trpc.heroSectionByName.queryKey({
            groupId,
            name: 'whatWeDo',
          }),
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

  // Form handlers
  const handleCreateSection = (data: any) => {
    console.log('Creating section with data:', data)

    // Check if data is valid before submitting
    if (!data || typeof data !== 'object') {
      console.error('Invalid form data:', data)
      toast({
        title: 'Form Error',
        description:
          'The form data is invalid. Please fill out the required fields.',
        variant: 'destructive',
      })
      return
    }

    // Ensure that required fields are always set
    const sectionData = {
      title: data.title?.trim(),
      slug: data.slug?.trim(),
      subtitle: data.subtitle || null,
      description: data.description || null,
      imageUrl: data.imageUrl || null,
      sortOrder: data.sortOrder || 0,
    }

    // Validate required fields
    if (!sectionData.title || !sectionData.slug) {
      toast({
        title: 'Validation Error',
        description: 'Title and slug are required fields.',
        variant: 'destructive',
      })
      return
    }

    console.log('Submitting section data:', sectionData)
    createSectionMutation.mutate({ data: { ...sectionData, groupId } })
  }

  const handleUpdateSection = (data: any) => {
    if (editingSection) {
      console.log('Updating section with data:', data)

      // Check if data is valid before submitting
      if (!data || typeof data !== 'object') {
        console.error('Invalid form data:', data)
        toast({
          title: 'Form Error',
          description:
            'The form data is invalid. Please fill out the required fields.',
          variant: 'destructive',
        })
        return
      }

      // Ensure that required fields are always set
      const sectionData = {
        title: data.title?.trim(),
        slug: data.slug?.trim(),
        subtitle: data.subtitle || null,
        description: data.description || null,
        imageUrl: data.imageUrl || null,
        sortOrder: data.sortOrder || 0,
      }

      // Validate required fields
      if (!sectionData.title || !sectionData.slug) {
        toast({
          title: 'Validation Error',
          description: 'Title and slug are required fields.',
          variant: 'destructive',
        })
        return
      }

      console.log('Submitting updated section data:', sectionData)
      updateSectionMutation.mutate({ id: editingSection.id, data: sectionData })
    }
  }

  const handleDeleteSection = (id: string) => {
    deleteSectionMutation.mutate({ id })
  }

  const handleCreateContent = (data: any) => {
    createContentMutation.mutate({ data })
  }

  const handleUpdateContent = (data: any) => {
    if (editingContent) {
      updateContentMutation.mutate({ id: editingContent.id, data })
    }
  }

  const handleDeleteContent = (id: string) => {
    deleteContentMutation.mutate({ id })
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

  // Open dialog handlers
  const openEditSectionDialog = (section: WhatWeDoSection) => {
    setEditingSection(section)
    setSectionDialogOpen(true)
  }

  const openNewSectionDialog = () => {
    setEditingSection(undefined)
    setSectionDialogOpen(true)
  }

  const openEditContentDialog = (content: WhatWeDoContent) => {
    setEditingContent(content)
    setContentDialogOpen(true)
  }

  const openNewContentDialog = () => {
    setEditingContent(undefined)
    setContentDialogOpen(true)
  }

  return (
    <>
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
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">What We Do - Administration</h1>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="sections">Sections</TabsTrigger>
            <TabsTrigger value="content">Content</TabsTrigger>
          </TabsList>

          <TabsContent value="sections" className="space-y-4 mt-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Manage Sections</h2>
              <Button onClick={openNewSectionDialog}>Add New Section</Button>
            </div>

            {sectionsLoading ? (
              <div className="text-center py-10">Loading sections...</div>
            ) : sections.length === 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle>No Sections Found</CardTitle>
                  <CardDescription>
                    Add your first section to get started.
                  </CardDescription>
                </CardHeader>
                <CardFooter>
                  <Button onClick={openNewSectionDialog}>Add Section</Button>
                </CardFooter>
              </Card>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[200px]">Title</TableHead>
                      <TableHead>Subtitle</TableHead>
                      <TableHead className="w-[150px]">Slug</TableHead>
                      <TableHead className="w-[80px]">Order</TableHead>
                      <TableHead className="w-[150px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sections.map((section: WhatWeDoSection) => (
                      <TableRow key={section.id}>
                        <TableCell className="font-medium">
                          {section.title}
                        </TableCell>
                        <TableCell>{section.subtitle || '-'}</TableCell>
                        <TableCell>{section.slug}</TableCell>
                        <TableCell>{section.sortOrder}</TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openEditSectionDialog(section)}
                            >
                              Edit
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() =>
                                    setDeletingSectionId(section.id)
                                  }
                                >
                                  Delete
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>
                                    Are you sure?
                                  </AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This will permanently delete the section and
                                    all its content. This action cannot be
                                    undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel
                                    onClick={() => setDeletingSectionId(null)}
                                  >
                                    Cancel
                                  </AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => {
                                      if (deletingSectionId) {
                                        handleDeleteSection(deletingSectionId)
                                      }
                                    }}
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>

          <TabsContent value="content" className="space-y-4 mt-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Manage Content</h2>
              <Button
                onClick={openNewContentDialog}
                disabled={!sections || sections.length === 0}
              >
                Add New Content
              </Button>
            </div>

            {!sections || sections.length === 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle>No Sections Available</CardTitle>
                  <CardDescription>
                    You need to create at least one section before adding
                    content.
                  </CardDescription>
                </CardHeader>
                <CardFooter>
                  <Button
                    onClick={() => {
                      setActiveTab('sections')
                    }}
                  >
                    Go to Sections
                  </Button>
                </CardFooter>
              </Card>
            ) : (
              <>
                <div className="flex justify-start mb-4">
                  <Select
                    value={selectedSectionId?.toString() || ''}
                    onValueChange={value => setSelectedSectionId(value)}
                  >
                    <SelectTrigger className="w-[300px]">
                      <SelectValue placeholder="Select a section" />
                    </SelectTrigger>
                    <SelectContent>
                      {sections.map((section: WhatWeDoSection) => (
                        <SelectItem
                          key={section.id}
                          value={section.id.toString()}
                        >
                          {section.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {contentLoading ? (
                  <div className="text-center py-10">Loading content...</div>
                ) : !selectedSectionId ? (
                  <div className="text-center py-10">
                    Select a section to view its content.
                  </div>
                ) : contentItems.length === 0 ? (
                  <Card>
                    <CardHeader>
                      <CardTitle>No Content Found</CardTitle>
                      <CardDescription>
                        Add your first content item to this section.
                      </CardDescription>
                    </CardHeader>
                    <CardFooter>
                      <Button onClick={openNewContentDialog}>
                        Add Content
                      </Button>
                    </CardFooter>
                  </Card>
                ) : (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[180px]">Title</TableHead>
                          <TableHead className="w-[120px]">Type</TableHead>
                          <TableHead>Content Preview</TableHead>
                          <TableHead className="w-[80px]">Order</TableHead>
                          <TableHead className="w-[150px]">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {contentItems.map((content: WhatWeDoContent) => (
                          <TableRow key={content.id}>
                            <TableCell>{content.title || '-'}</TableCell>
                            <TableCell className="capitalize">
                              {content.contentType}
                            </TableCell>
                            <TableCell>
                              <div className="truncate max-w-[300px]">
                                {content.contentType === 'image' ? (
                                  <div className="flex items-center">
                                    <img
                                      src={content.content}
                                      alt="Image preview"
                                      className="h-8 w-8 object-cover rounded-sm mr-2"
                                    />
                                    <span className="text-xs text-muted-foreground">
                                      {content.content}
                                    </span>
                                  </div>
                                ) : (
                                  content.content
                                )}
                              </div>
                            </TableCell>
                            <TableCell>{content.sortOrder}</TableCell>
                            <TableCell>
                              <div className="flex space-x-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => openEditContentDialog(content)}
                                >
                                  Edit
                                </Button>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button
                                      variant="destructive"
                                      size="sm"
                                      onClick={() =>
                                        setDeletingContentId(content.id)
                                      }
                                    >
                                      Delete
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>
                                        Are you sure?
                                      </AlertDialogTitle>
                                      <AlertDialogDescription>
                                        This will permanently delete this
                                        content item. This action cannot be
                                        undone.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel
                                        onClick={() =>
                                          setDeletingContentId(null)
                                        }
                                      >
                                        Cancel
                                      </AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() => {
                                          if (deletingContentId) {
                                            handleDeleteContent(
                                              deletingContentId,
                                            )
                                          }
                                        }}
                                      >
                                        Delete
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Section Dialog */}
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
      <Dialog open={sectionDialogOpen} onOpenChange={setSectionDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh]">
          <ScrollArea className="max-h-[80vh]">
            <DialogHeader>
              <DialogTitle>
                {editingSection ? 'Edit Section' : 'Create New Section'}
              </DialogTitle>
              <DialogDescription>
                {editingSection
                  ? 'Update the details of this section.'
                  : 'Add a new section to the What We Do page.'}
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <SectionForm
                section={editingSection}
                onSubmit={
                  editingSection ? handleUpdateSection : handleCreateSection
                }
                onCancel={() => setSectionDialogOpen(false)}
              />
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Content Dialog */}
      <Dialog open={contentDialogOpen} onOpenChange={setContentDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh]">
          <ScrollArea className="max-h-[80vh]">
            <DialogHeader>
              <DialogTitle>
                {editingContent ? 'Edit Content' : 'Create New Content'}
              </DialogTitle>
              <DialogDescription>
                {editingContent
                  ? 'Update the details of this content item.'
                  : 'Add new content to a section.'}
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              {sections && sections.length > 0 ? (
                <ContentForm
                  content={editingContent}
                  sections={sections}
                  onSubmit={
                    editingContent ? handleUpdateContent : handleCreateContent
                  }
                  onCancel={() => setContentDialogOpen(false)}
                />
              ) : (
                <p>You need to create at least one section first.</p>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  )
}
