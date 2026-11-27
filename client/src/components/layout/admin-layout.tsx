import React from 'react'
import { Link, useLocation } from 'wouter'
import { clearToken, cn, isTokenValid } from '@/lib/utils'
import {
  Home,
  Users,
  BookOpen,
  Settings,
  BarChart,
  ArrowLeft,
  UserCog,
  AlertCircle,
  Layout,
  Globe,
  Boxes,
} from 'lucide-react'
import { reservedGroupSlugs } from '@shared/utils'
import { globalAdminTheme, useApplyTheme } from '@/lib/group-theme'
import DocumentHead, { APP_NAME } from './document-head'
import { Button } from '../ui/button'

type NavItem = {
  href: string
  label: string
  icon: React.ReactNode
  // Only the exact path, for links whose path prefixes every other page's.
  exact?: boolean
}

const globalNavItems: NavItem[] = [
  {
    href: '/',
    label: 'Dashboard',
    icon: <Home className="h-5 w-5" />,
    exact: true,
  },
  {
    href: '/manage',
    label: 'Manage Groups',
    icon: <Boxes className="h-5 w-5" />,
  },
  {
    href: '/users',
    label: 'User Management',
    icon: <UserCog className="h-5 w-5" />,
  },
  {
    href: '/analytics',
    label: 'Analytics',
    icon: <BarChart className="h-5 w-5" />,
  },
]

const groupNavItems = (groupSlug: string): NavItem[] =>
  [
    {
      href: '',
      label: 'Group Dashboard',
      icon: <Home className="h-5 w-5" />,
      exact: true,
    },
    {
      href: '/team',
      label: 'Team Members',
      icon: <Users className="h-5 w-5" />,
    },
    {
      href: '/publications',
      label: 'Publications',
      icon: <BookOpen className="h-5 w-5" />,
    },
    {
      href: '/what-we-do',
      label: 'What We Do',
      icon: <Layout className="h-5 w-5" />,
    },
    {
      href: '/issues',
      label: 'Issue Reports',
      icon: <AlertCircle className="h-5 w-5" />,
    },
    {
      href: '/settings',
      label: 'Settings',
      icon: <Settings className="h-5 w-5" />,
    },
  ].map(item => ({
    ...item,
    href: `/${groupSlug}${item.href}`,
  }))

const NavLinks = ({
  items,
  location,
}: {
  items: NavItem[]
  location: string
}) => (
  <div className="px-4 space-y-1">
    {items.map(item => {
      const active =
        location === item.href ||
        (!item.exact && location.startsWith(`${item.href}/`))

      return (
        <Link
          key={item.href}
          href={item.href}
          className={cn(
            'flex items-center px-4 py-3 text-sm font-medium rounded-md transition-colors',
            active
              ? 'bg-primary/10 text-primary'
              : 'text-muted-foreground hover:text-primary hover:bg-primary/5',
          )}
        >
          {item.icon}
          <span className="ml-3">{item.label}</span>
        </Link>
      )
    })}
  </div>
)

const useAdminGroupSlug = (): string | undefined => {
  // Relative to /admin, as the layout renders inside the /admin route.
  const [location] = useLocation()
  const [firstSegment] = location.split('/').filter(Boolean)

  return firstSegment && !reservedGroupSlugs.includes(firstSegment)
    ? firstSegment
    : undefined
}

// Pages about one group take that group's look and title instead
// (GroupTheme, in App.tsx).
const GlobalAdminTheme = () => {
  useApplyTheme(globalAdminTheme)

  return <DocumentHead title={`Admin · ${APP_NAME}`} />
}

const AdminSidebar = () => {
  const [location, navigate] = useLocation()
  const groupSlug = useAdminGroupSlug()

  const handleLogout = () => {
    clearToken()
    navigate('~/login')
  }

  return (
    <div className="w-64 h-screen bg-card border-r border-border flex flex-col">
      <div className="p-6 border-b border-border">
        <h1 className="text-xl font-bold text-primary">Admin</h1>
        <p className="text-sm text-muted-foreground">
          Content Management System
        </p>
        <div className="pt-4">
          <Button onClick={handleLogout}>Logout</Button>
        </div>
      </div>

      <nav className="flex-1 pt-4 pb-4 overflow-y-auto">
        <NavLinks items={globalNavItems} location={location} />

        {groupSlug && (
          <>
            <p className="px-8 pt-6 pb-2 text-xs font-semibold uppercase text-muted-foreground">
              {groupSlug}
            </p>
            <NavLinks items={groupNavItems(groupSlug)} location={location} />
          </>
        )}
      </nav>

      <div className="p-4 border-t border-border">
        <Link
          href={groupSlug ? `~/${groupSlug}` : '~/'}
          className="flex items-center px-4 py-2 text-sm font-medium rounded-md text-muted-foreground hover:text-primary hover:bg-primary/5"
        >
          <ArrowLeft className="h-5 w-5 mr-3" />
          Return to Site
        </Link>
      </div>
    </div>
  )
}

interface AdminLayoutProps {
  children: React.ReactNode
}

const AdminLayout = ({ children }: AdminLayoutProps) => {
  const [, navigate] = useLocation()
  const groupSlug = useAdminGroupSlug()
  const valid = isTokenValid()

  React.useEffect(() => {
    if (!valid) {
      clearToken()
      navigate('~/login')
    }
  }, [navigate, valid])

  // Never render the admin shell for an invalid or expired token.
  if (!valid) return null

  return (
    <div className="flex h-screen bg-muted">
      {!groupSlug && <GlobalAdminTheme />}
      <AdminSidebar />
      <main className="relative flex-1 overflow-auto p-6">{children}</main>
    </div>
  )
}

export default AdminLayout
