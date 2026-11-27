import { useQuery } from '@tanstack/react-query'
import { Link } from 'wouter'
import { AlertCircle, Boxes, ChevronRight, Plus, PowerOff } from 'lucide-react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useTRPC } from '@/utils/trpc'

const NoActiveGroupsBanner = ({ hasGroups }: { hasGroups: boolean }) => (
  <div className="flex flex-col gap-4 rounded-lg border border-warning/30 bg-warning/10 p-4 sm:flex-row sm:items-center sm:justify-between">
    <div className="flex items-start gap-3">
      <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-warning" />
      <div>
        <p className="font-medium">No active groups</p>
        <p className="text-sm">
          {hasGroups
            ? 'Every group is inactive, so visitors see no content. Activate a group to publish its site.'
            : 'Visitors see no content until there is a group. Create one and connect it to Kotahi.'}
        </p>
      </div>
    </div>
    <Button asChild className="shrink-0">
      <Link href={hasGroups ? '/manage' : '/manage?action=new'}>
        {hasGroups ? (
          'Manage Groups'
        ) : (
          <>
            <Plus className="mr-2 h-4 w-4" />
            Add Group
          </>
        )}
      </Link>
    </Button>
  </div>
)

export default function AdminDashboard() {
  const trpc = useTRPC()

  const { data: groups = [], isLoading } = useQuery(trpc.groups.queryOptions())

  const activeCount = groups.filter(group => group.isActive).length
  const inactiveCount = groups.length - activeCount

  const statsCards = [
    {
      title: 'Active Groups',
      value: `${activeCount} of ${groups.length}`,
      description: 'Groups whose sites visitors can see',
      icon: <Boxes className="h-6 w-6" />,
      color: 'bg-success/10 text-success',
    },
    {
      title: 'Inactive Groups',
      value: String(inactiveCount),
      description: 'Hidden from visitors; admins can still edit them',
      icon: <PowerOff className="h-6 w-6" />,
      color: 'bg-muted text-muted-foreground',
    },
  ]

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          An overview of the groups this CMS publishes.
        </p>
      </div>

      {!isLoading && activeCount === 0 && (
        <NoActiveGroupsBanner hasGroups={groups.length > 0} />
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {statsCards.map(card => (
          <Link key={card.title} href="/manage">
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
                {isLoading ? (
                  <Skeleton className="h-9 w-24" />
                ) : (
                  <p className="text-3xl font-bold">{card.value}</p>
                )}
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Groups */}
      <Card>
        <CardHeader>
          <CardTitle>Groups</CardTitle>
          <CardDescription>
            Open a group to manage its team, publications and pages.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading && (
            <div className="space-y-2">
              {Array(3)
                .fill(0)
                .map((_, i) => (
                  <Skeleton key={i} className="h-14 w-full" />
                ))}
            </div>
          )}

          {!isLoading && groups.length === 0 && (
            <p className="text-sm text-muted-foreground">No groups yet.</p>
          )}

          {!isLoading && groups.length > 0 && (
            <div className="space-y-2">
              {groups.map(group => (
                <Link
                  key={group.id}
                  href={`/${group.slug}`}
                  className="flex items-center justify-between rounded-lg border border-border p-3 transition-colors hover:bg-muted"
                >
                  <div>
                    <p className="font-medium">{group.name}</p>
                    <p className="text-sm text-muted-foreground">
                      /{group.slug}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {group.isActive ? (
                      <Badge>Active</Badge>
                    ) : (
                      <Badge variant="secondary">Inactive</Badge>
                    )}
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
