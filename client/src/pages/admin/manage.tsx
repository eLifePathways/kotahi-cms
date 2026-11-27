import { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Link, useLocation, useSearchParams } from 'wouter'
import { Edit, ExternalLink, Plus } from 'lucide-react'
import { slugify } from '@shared/utils'
import { useTRPC } from '@/utils/trpc'
import { useToast } from '@/hooks/use-toast'
import { useInvalidateGroups } from '@/hooks/use-invalidate-groups'
import {
  emptyKotahiConnection,
  KotahiConnectionFields,
  toKotahiInput,
} from '@/components/admin/kotahi-connection-fields'
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
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'

const ActiveField = ({
  id,
  checked,
  onChange,
}: {
  id: string
  checked: boolean
  onChange: (checked: boolean) => void
}) => (
  <div className="flex items-start gap-3">
    <Checkbox
      id={id}
      checked={checked}
      onCheckedChange={state => onChange(state === true)}
    />
    <div className="space-y-1 leading-none">
      <Label htmlFor={id}>Active</Label>
      <p className="text-sm text-muted-foreground">
        Inactive groups are hidden from visitors.
      </p>
    </div>
  </div>
)

// Rendered inside the dialog, so it starts empty each time it opens.
const AddGroupForm = ({ onDone }: { onDone: (groupSlug: string) => void }) => {
  const trpc = useTRPC()
  const { toast } = useToast()
  const invalidateGroups = useInvalidateGroups()

  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [kotahi, setKotahi] = useState(emptyKotahiConnection)

  console.log('kotahi', kotahi)

  // A preview: the server makes the slug from the name Kotahi gives it.
  const defaultSlug = slugify(kotahi.kotahiGroupName ?? '')

  const createGroup = useMutation(
    trpc.createGroup.mutationOptions({
      onSuccess: group => {
        invalidateGroups()
        toast({
          title: 'Success',
          description: `Group "${group.name}" created`,
        })
        onDone(group.slug)
      },
      onError: error => {
        toast({
          title: 'Error',
          description: error.message || 'Failed to create group',
          variant: 'destructive',
        })
        console.error('Error creating group:', error)
      },
    }),
  )

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!name.trim() || !kotahi.endpoint.trim() || !kotahi.kotahiGroupId) {
      toast({
        title: 'Validation Error',
        description: 'Enter a name and check the endpoint to choose a group',
        variant: 'destructive',
      })
      return
    }

    createGroup.mutate({
      name: name.trim(),
      slug: slug.trim() || undefined,
      isActive,
      kotahi: toKotahiInput(kotahi),
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 mt-4">
      <div className="space-y-2">
        <Label htmlFor="add-group-name">Name *</Label>
        <Input
          id="add-group-name"
          value={name}
          onChange={e => setName(e.target.value)}
          required
        />
      </div>

      <KotahiConnectionFields
        idPrefix="add-group"
        value={kotahi}
        onChange={setKotahi}
      />

      <div className="space-y-2">
        <Label htmlFor="add-group-slug">Slug (optional)</Label>
        <Input
          id="add-group-slug"
          value={slug}
          onChange={e => setSlug(e.target.value)}
          placeholder={defaultSlug || "Made from the Kotahi group's name"}
        />
        <p className="text-sm text-muted-foreground">
          The group's address, as in /{slug.trim() || defaultSlug || 'slug'}. It
          can't be changed later.
        </p>
      </div>

      <ActiveField
        id="add-group-active"
        checked={isActive}
        onChange={setIsActive}
      />

      <DialogFooter>
        <Button type="submit" disabled={createGroup.isPending}>
          {createGroup.isPending ? 'Creating...' : 'Create Group'}
        </Button>
      </DialogFooter>
    </form>
  )
}

export default function ManageGroupsAdmin() {
  const trpc = useTRPC()
  const [, navigate] = useLocation()

  // The add dialog is open at ?action=new, so other pages can link to it.
  const [searchParams, setSearchParams] = useSearchParams()
  const addDialogOpen = searchParams.get('action') === 'new'

  const setAddDialogOpen = (open: boolean) =>
    setSearchParams(
      params => {
        // A copy: wouter hands over the params it has cached.
        const next = new URLSearchParams(params)

        if (open) next.set('action', 'new')
        else next.delete('action')

        return next
      },
      { replace: true },
    )

  const openGroupSettings = (slug: string) => navigate(`/${slug}/settings`)

  const { data: groups, isLoading } = useQuery(trpc.groups.queryOptions())

  return (
    <div className="space-y-6">
      <div className="bg-card p-6 rounded-lg shadow-xs">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">Manage Groups</h1>
            <p className="text-muted-foreground mt-1">
              Create groups and manage their Kotahi connections.
            </p>
          </div>

          <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Add Group
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add New Group</DialogTitle>
                <DialogDescription>
                  Connect the group to the Kotahi group it publishes from.
                </DialogDescription>
              </DialogHeader>
              <AddGroupForm onDone={openGroupSettings} />
            </DialogContent>
          </Dialog>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Kotahi Group ID</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading &&
                Array(3)
                  .fill(0)
                  .map((_, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        <Skeleton className="h-4 w-[150px]" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-[100px]" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-[250px]" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-5 w-[60px]" />
                      </TableCell>
                      <TableCell className="text-right">
                        <Skeleton className="h-8 w-10 ml-auto" />
                      </TableCell>
                    </TableRow>
                  ))}

              {!isLoading && groups?.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-center py-8 text-muted-foreground"
                  >
                    No groups found. Add your first group to get started.
                  </TableCell>
                </TableRow>
              )}

              {!isLoading &&
                groups?.map(group => (
                  <TableRow key={group.id}>
                    <TableCell className="font-medium">
                      <Link href={`/${group.slug}`} className="hover:underline">
                        {group.name}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`~/${group.slug}`}
                        className="inline-flex items-center gap-1 text-muted-foreground hover:text-primary"
                      >
                        /{group.slug}
                        <ExternalLink className="h-3 w-3" />
                      </Link>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {group.kotahiGroupId}
                    </TableCell>
                    <TableCell>
                      {group.isActive ? (
                        <Badge>Active</Badge>
                      ) : (
                        <Badge variant="secondary">Inactive</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="icon" asChild>
                        <Link
                          href={`/${group.slug}/settings`}
                          aria-label={`Edit ${group.name}`}
                        >
                          <Edit className="h-4 w-4" />
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  )
}
