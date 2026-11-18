import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from '@/components/ui/form'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import {
  Loader2,
  Send,
  AlertCircle,
  Code,
  Image as ImageIcon,
  Link2,
  Mail,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Clock,
  XCircle,
  Flag,
} from 'lucide-react'
import { formatDistanceToNow, format } from 'date-fns'
import { useToast } from '@/hooks/use-toast'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useTRPC, type RouterInputs, type RouterOutputs } from '@/utils/trpc'

type Issue = RouterOutputs['issues'][number]

// The user agent, when the reporter's browser info recorded one.
const getUserAgent = (browserInfo: unknown) =>
  typeof browserInfo === 'object' &&
  browserInfo !== null &&
  'userAgent' in browserInfo &&
  typeof browserInfo.userAgent === 'string'
    ? browserInfo.userAgent
    : null

interface IssueDetailDialogProps {
  issue: Issue
  open: boolean
  onOpenChange: (open: boolean) => void
  onCommentAdded?: () => void
}

const commentSchema = z.object({
  comment: z.string().min(1, { message: 'Comment cannot be empty' }),
  isInternal: z.boolean().default(true),
})

type CommentFormValues = z.infer<typeof commentSchema>

export function IssueDetailDialog({
  issue,
  open,
  onOpenChange,
  onCommentAdded,
}: IssueDetailDialogProps) {
  const [activeTab, setActiveTab] = useState('details')
  const [localIssue, setLocalIssue] = useState<Issue>(issue)
  const queryClient = useQueryClient()
  const trpc = useTRPC()
  const { toast } = useToast()
  const userAgent = getUserAgent(issue.browserInfo)

  // Update local issue when the prop changes
  useEffect(() => {
    setLocalIssue(issue)
  }, [issue])

  const { data: comments, isLoading: isLoadingComments } = useQuery(
    trpc.issueComments.queryOptions({ issueId: issue.id }, { enabled: open }),
  )

  // The list and any single issue, cached under the issues and issue procedures.
  const invalidateIssues = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: trpc.issues.queryKey() }),
      queryClient.invalidateQueries({ queryKey: trpc.issue.pathKey() }),
    ])

  // Mutation for updating issue status and priority
  const updateIssueMutation = useMutation(
    trpc.updateIssue.mutationOptions({
      onSuccess: data => {
        invalidateIssues()
        setLocalIssue(prev => ({ ...prev, ...data }))
        toast({ title: 'Issue updated successfully' })
      },
      onError: error => {
        console.error('Error updating issue:', error)
        toast({
          title: 'Failed to update issue',
          variant: 'destructive',
        })
      },
    }),
  )

  const updateIssue = (data: RouterInputs['updateIssue']['data']) =>
    updateIssueMutation.mutate({ id: issue.id, data })

  const form = useForm<
    z.input<typeof commentSchema>,
    unknown,
    CommentFormValues
  >({
    resolver: zodResolver(commentSchema),
    defaultValues: {
      comment: '',
      isInternal: true,
    },
  })

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      form.reset()
    }
  }, [open, form])

  const addCommentMutation = useMutation(
    trpc.createIssueComment.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: trpc.issueComments.queryKey({ issueId: issue.id }),
        })
        // Adding a comment bumps the issue's updatedAt
        invalidateIssues()
        form.reset()
        toast({ title: 'Comment added' })

        // Notify parent component about the new comment
        if (onCommentAdded) {
          onCommentAdded()
        }
      },
      onError: error => {
        console.error('Error adding comment:', error)
        toast({
          title: 'Failed to add comment',
          variant: 'destructive',
        })
      },
    }),
  )

  const onSubmit = (data: CommentFormValues) => {
    addCommentMutation.mutate({
      issueId: issue.id,
      data: { content: data.comment, isInternal: data.isInternal },
    })
  }

  const formatDate = (date: Date) => {
    try {
      return {
        relative: formatDistanceToNow(date, { addSuffix: true }),
        full: format(date, 'MMM d, yyyy h:mm a'),
      }
    } catch (error) {
      return {
        relative: 'Invalid date',
        full: 'Invalid date',
      }
    }
  }

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'high':
        return (
          <Badge className="bg-destructive text-destructive-foreground border-transparent">
            High Priority
          </Badge>
        )
      case 'medium':
        return (
          <Badge className="bg-warning text-warning-foreground border-transparent">
            Medium Priority
          </Badge>
        )
      case 'low':
        return (
          <Badge className="bg-success text-success-foreground border-transparent">
            Low Priority
          </Badge>
        )
      default:
        return <Badge variant="outline">Unknown Priority</Badge>
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'open':
        return (
          <Badge className="bg-info text-info-foreground border-transparent">
            Open
          </Badge>
        )
      case 'in_progress':
        return (
          <Badge className="bg-warning text-warning-foreground border-transparent">
            In Progress
          </Badge>
        )
      case 'resolved':
        return (
          <Badge className="bg-success text-success-foreground border-transparent">
            Resolved
          </Badge>
        )
      case 'closed':
        return (
          <Badge variant="outline" className="bg-muted text-muted-foreground">
            Closed
          </Badge>
        )
      default:
        return <Badge variant="outline">Unknown Status</Badge>
    }
  }

  // Initialize comments as expanded by default
  const [expandedComments, setExpandedComments] = useState<
    Record<string, boolean>
  >({})

  // When comments load, set all to expanded by default
  useEffect(() => {
    if (comments && comments.length > 0) {
      const initialExpanded = comments.reduce(
        (acc: Record<string, boolean>, comment) => {
          acc[comment.id] = true // Default to expanded
          return acc
        },
        {} as Record<string, boolean>,
      )

      setExpandedComments(initialExpanded)
    }
  }, [comments])

  // Toggle comment expansion
  const toggleComment = (commentId: string) => {
    setExpandedComments(prev => ({
      ...prev,
      [commentId]: !prev[commentId],
    }))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-[1200px] h-[95vh] max-h-[95vh] flex flex-col p-4">
        <DialogHeader className="pb-2">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl">{issue.title}</DialogTitle>
            <div className="flex gap-2 items-center">
              {/* Status Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <div className="cursor-pointer">
                    {getStatusBadge(localIssue.status)}
                  </div>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem
                    onClick={() => updateIssue({ status: 'open' })}
                    className="flex items-center"
                  >
                    <AlertCircle className="h-4 w-4 mr-2 text-info" />
                    <span>Open</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => updateIssue({ status: 'in_progress' })}
                    className="flex items-center"
                  >
                    <Clock className="h-4 w-4 mr-2 text-warning" />
                    <span>In Progress</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => updateIssue({ status: 'resolved' })}
                    className="flex items-center"
                  >
                    <CheckCircle2 className="h-4 w-4 mr-2 text-success" />
                    <span>Resolved</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => updateIssue({ status: 'closed' })}
                    className="flex items-center"
                  >
                    <XCircle className="h-4 w-4 mr-2 text-muted-foreground" />
                    <span>Closed</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Priority Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <div className="cursor-pointer">
                    {getPriorityBadge(localIssue.priority)}
                  </div>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40">
                  <DropdownMenuItem
                    onClick={() => updateIssue({ priority: 'high' })}
                    className="flex items-center"
                  >
                    <Flag className="h-4 w-4 mr-2 text-destructive-text" />
                    <span>High Priority</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => updateIssue({ priority: 'medium' })}
                    className="flex items-center"
                  >
                    <Flag className="h-4 w-4 mr-2 text-warning" />
                    <span>Medium Priority</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => updateIssue({ priority: 'low' })}
                    className="flex items-center"
                  >
                    <Flag className="h-4 w-4 mr-2 text-success" />
                    <span>Low Priority</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Loading indicator */}
              {updateIssueMutation.isPending && (
                <Loader2 className="h-4 w-4 animate-spin text-primary ml-1" />
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="grow overflow-y-auto pr-2 -mr-2">
          <Tabs
            defaultValue="details"
            value={activeTab}
            onValueChange={setActiveTab}
            className="mb-3"
          >
            <TabsList className="grid grid-cols-3 w-full">
              <TabsTrigger value="details">Issue Details</TabsTrigger>
              <TabsTrigger value="screenshot">Screenshot</TabsTrigger>
              <TabsTrigger value="console">Console Log</TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="space-y-2 mt-3">
              {/* Compact details grid */}
              <div className="grid grid-cols-2 gap-3">
                <Card className="col-span-2">
                  <CardHeader className="py-2 px-3">
                    <CardTitle className="text-sm">Description</CardTitle>
                  </CardHeader>
                  <CardContent className="py-2 px-3">
                    <p className="whitespace-pre-wrap text-sm">
                      {issue.description}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="py-2 px-3">
                    <CardTitle className="text-sm flex items-center">
                      <Link2 className="h-3 w-3 mr-1" />
                      URL
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="py-2 px-3">
                    <p className="text-xs break-all">{issue.pageUrl}</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="py-2 px-3">
                    <CardTitle className="text-sm flex items-center">
                      <Mail className="h-3 w-3 mr-1" />
                      Contact
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="py-2 px-3">
                    {issue.email ? (
                      <a
                        href={`mailto:${issue.email}`}
                        className="text-xs break-all text-primary hover:underline"
                      >
                        {issue.email}
                      </a>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        Not provided
                      </p>
                    )}
                  </CardContent>
                </Card>

                <Card className="col-span-2">
                  <CardHeader className="py-2 px-3">
                    <CardTitle className="text-sm">Timing</CardTitle>
                  </CardHeader>
                  <CardContent className="py-2 px-3 flex justify-between">
                    <div>
                      <p className="text-xs font-medium">Submitted</p>
                      <p
                        className="text-xs text-muted-foreground"
                        title={formatDate(issue.submittedAt).full}
                      >
                        {formatDate(issue.submittedAt).relative}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-medium">Updated</p>
                      <p
                        className="text-xs text-muted-foreground"
                        title={formatDate(issue.updatedAt).full}
                      >
                        {formatDate(issue.updatedAt).relative}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="col-span-2">
                  <CardHeader className="py-2 px-3">
                    <CardTitle className="text-sm">User Agent</CardTitle>
                  </CardHeader>
                  <CardContent className="py-2 px-3">
                    <p className="text-xs font-mono break-all">{userAgent}</p>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="screenshot" className="mt-3">
              {issue.screenshotUrl &&
              issue.screenshotUrl.trim() !== '' &&
              issue.screenshotUrl !== 'undefined' &&
              issue.screenshotUrl !== 'null' ? (
                <Card>
                  <CardHeader className="py-2 px-3">
                    <CardTitle className="text-sm flex items-center">
                      <ImageIcon className="h-3 w-3 mr-1" />
                      Screenshot
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-1 pb-3 px-3">
                    <div className="relative h-[300px] mb-3 border rounded overflow-hidden">
                      <img
                        src={issue.screenshotUrl}
                        alt="Screenshot"
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <Button
                      variant="outline"
                      asChild
                      size="sm"
                      className="w-full"
                    >
                      <a
                        href={issue.screenshotUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ImageIcon className="h-3 w-3 mr-1" />
                        View Full Size in New Tab
                      </a>
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardHeader className="p-3">
                    <CardTitle className="text-sm flex items-center">
                      <ImageIcon className="h-4 w-4 mr-1" />
                      No Screenshot Available
                    </CardTitle>
                    <CardDescription className="text-xs">
                      The user did not provide a screenshot with this issue
                      report.
                    </CardDescription>
                  </CardHeader>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="console" className="mt-3">
              {issue.consoleLog &&
              issue.consoleLog.trim() !== '' &&
              issue.consoleLog !== 'undefined' &&
              issue.consoleLog !== 'null' ? (
                <Card>
                  <CardHeader className="py-2 px-3">
                    <CardTitle className="text-sm flex items-center">
                      <Code className="h-3 w-3 mr-1" />
                      Console Log
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 pt-1">
                    <pre className="bg-muted p-3 rounded-md overflow-x-auto text-xs max-h-[400px] whitespace-pre-wrap">
                      {issue.consoleLog.split('\\n').join('\n')}
                    </pre>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardHeader className="p-3">
                    <CardTitle className="text-sm flex items-center">
                      <Code className="h-4 w-4 mr-1" />
                      No Console Logs Available
                    </CardTitle>
                    <CardDescription className="text-xs">
                      No console logs were captured with this issue report.
                    </CardDescription>
                  </CardHeader>
                </Card>
              )}
            </TabsContent>
          </Tabs>

          <div>
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-base font-medium">Comments</h3>
              <div className="text-xs text-muted-foreground">
                {comments?.length || 0} comment
                {comments?.length !== 1 ? 's' : ''}
              </div>
            </div>

            <div className="space-y-2">
              {isLoadingComments ? (
                <div className="flex justify-center p-2">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                </div>
              ) : comments && comments.length > 0 ? (
                comments.map(comment => (
                  <Collapsible
                    key={comment.id}
                    open={expandedComments[comment.id]}
                    onOpenChange={() => toggleComment(comment.id)}
                    className={
                      comment.isInternal
                        ? 'border rounded border-info'
                        : 'border rounded'
                    }
                  >
                    <CollapsibleTrigger asChild>
                      <div
                        role="button"
                        className="flex justify-between items-center p-2 hover:bg-muted cursor-pointer rounded-t"
                      >
                        <div className="flex items-center space-x-2">
                          <p className="text-xs font-medium">
                            {comment.author || 'Admin'}
                          </p>
                          {comment.isInternal && (
                            <Badge className="text-[10px] py-0 px-1 h-4 bg-info text-info-foreground border-transparent">
                              Internal
                            </Badge>
                          )}
                          <p
                            className="text-[10px] text-muted-foreground"
                            title={formatDate(comment.createdAt).full}
                          >
                            {formatDate(comment.createdAt).relative}
                          </p>
                        </div>
                        {expandedComments[comment.id] ? (
                          <ChevronUp className="h-3 w-3 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-3 w-3 text-muted-foreground" />
                        )}
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="px-2 pb-2">
                        <p className="text-xs whitespace-pre-wrap">
                          {comment.content}
                        </p>
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                ))
              ) : (
                <div className="bg-muted rounded p-2 text-center">
                  <AlertCircle className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">
                    No comments yet
                  </p>
                </div>
              )}
            </div>

            <div className="mt-3">
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="space-y-2"
                >
                  <FormField
                    control={form.control}
                    name="comment"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm">Add Comment</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Add a comment about this issue..."
                            className="min-h-[60px] text-sm"
                            {...field}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-between items-center">
                    <FormField
                      control={form.control}
                      name="isInternal"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                          <FormControl>
                            <input
                              type="checkbox"
                              checked={field.value}
                              onChange={field.onChange}
                              className="h-3 w-3 text-primary rounded border-input focus:ring-primary"
                            />
                          </FormControl>
                          <label className="text-xs font-medium leading-none cursor-pointer">
                            Internal only
                          </label>
                        </FormItem>
                      )}
                    />

                    <Button
                      type="submit"
                      size="sm"
                      disabled={addCommentMutation.isPending}
                      className="flex items-center"
                    >
                      {addCommentMutation.isPending ? (
                        <>
                          <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                          Posting...
                        </>
                      ) : (
                        <>
                          <Send className="mr-1 h-3 w-3" />
                          Post Comment
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </Form>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
