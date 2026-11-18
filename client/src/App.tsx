import { Switch, Route, useLocation } from 'wouter'
import { QueryClientProvider } from '@tanstack/react-query'
import { createTRPCClient, httpBatchLink } from '@trpc/client'
import { Toaster } from '@/components/ui/toaster'
import Header from '@/components/layout/header'
import Footer from '@/components/layout/footer'
import Home from '@/pages/home'
import Team from '@/pages/team'
import Publication from '@/pages/publication'
import Publications from '@/pages/publications'
import WhatWeDo from '@/pages/what-we-do'
import AboutUs from '@/pages/about-us'
import Contact from '@/pages/contact'
import NotFound from '@/pages/not-found'
import AdminPage from '@/pages/admin/index'
import AdminTeam from '@/pages/admin/team'
import AdminPublications from '@/pages/admin/publications'
import AdminUsers from '@/pages/admin/users'
import AdminSettings from '@/pages/admin/settings'
import AdminAnalytics from '@/pages/admin/analytics'
import AdminIssues from '@/pages/admin/issues'
import AdminWhatWeDo from '@/pages/admin/what-we-do'
import AdminGraphQL from '@/pages/admin/graphql'
import Login from '@/pages/login'

import AdminLayout from '@/components/layout/admin-layout'
import { BugReportButton } from '@/components/issue-report'
import ScrollToTop from '@/components/ui/scroll-to-top'
import { getQueryClient } from './lib/queryClient'
import { getToken } from './lib/utils'
import superjson from 'superjson'
import { useState } from 'react'
import type { AppRouter } from '../../server/appRouter'
import { TRPCProvider } from './utils/trpc'

function Router() {
  const [location] = useLocation()
  const isAdminRoute = location.startsWith('/admin')
  const isLoginRoute = location.startsWith('/login')

  if (isAdminRoute) {
    return (
      <AdminLayout>
        <Switch>
          <Route path="/admin" component={AdminPage} />
          <Route path="/admin/team" component={AdminTeam} />
          <Route path="/admin/publications" component={AdminPublications} />
          {/* Redirect sub-routes to the main admin page for that resource */}
          <Route
            path="/admin/publications/:action"
            component={AdminPublications}
          />
          <Route path="/admin/team/:action" component={AdminTeam} />
          <Route path="/admin/users" component={AdminUsers} />
          <Route path="/admin/users/:action" component={AdminUsers} />
          <Route path="/admin/issues" component={AdminIssues} />
          <Route path="/admin/what-we-do" component={AdminWhatWeDo} />
          <Route path="/admin/settings" component={AdminSettings} />
          <Route path="/admin/analytics" component={AdminAnalytics} />
          <Route path="/admin/graphql" component={AdminGraphQL} />
          <Route path="/admin/*" component={AdminPage} />
          <Route component={NotFound} />
        </Switch>
      </AdminLayout>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-muted">
      <Header />
      <main className="grow bg-card">
        {isLoginRoute ? (
          <Login />
        ) : (
          <Switch>
            <Route path="/" component={Home} />
            <Route path="/team" component={Team} />
            <Route path="/publications" component={Publications} />
            <Route path="/publications/:shortId" component={Publication} />
            <Route path="/what-we-do" component={WhatWeDo} />
            <Route path="/about-us" component={AboutUs} />
            <Route path="/contact" component={Contact} />
            <Route path="/admin/*" component={AdminPage} />
            <Route component={NotFound} />
          </Switch>
        )}
      </main>
      <Footer />
    </div>
  )
}

function App() {
  const queryClient = getQueryClient()
  const [trpcClient] = useState(() =>
    createTRPCClient<AppRouter>({
      links: [
        httpBatchLink({
          url: '/api/trpc',
          transformer: superjson,
          headers: () => {
            const token = getToken()
            return token ? { Authorization: `Bearer ${token}` } : {}
          },
        }),
      ],
    }),
  )
  return (
    <QueryClientProvider client={queryClient}>
      <TRPCProvider queryClient={queryClient} trpcClient={trpcClient}>
        <ScrollToTop />
        <Router />
        <BugReportButton />
        <Toaster />
      </TRPCProvider>
    </QueryClientProvider>
  )
}

export default App
