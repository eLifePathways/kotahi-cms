import { Switch, Route } from 'wouter'
import { QueryClientProvider } from '@tanstack/react-query'
import { createTRPCClient, httpBatchLink } from '@trpc/client'
import { Toaster } from '@/components/ui/toaster'
import Header from '@/components/layout/header'
import Footer from '@/components/layout/footer'
import Landing from './pages/landing'
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
import AdminManage from '@/pages/admin/manage'
import Login from '@/pages/login'

import GroupAdminDashboard from '@/components/admin/group-dashboard'
import { GroupProvider } from '@/hooks/use-group'
import AdminLayout from '@/components/layout/admin-layout'
import GroupTheme from '@/components/layout/group-theme'
import DocumentHead, { APP_NAME } from '@/components/layout/document-head'
import { BugReportButton } from '@/components/issue-report'
import ScrollToTop from '@/components/ui/scroll-to-top'
import { getQueryClient } from './lib/queryClient'
import { getToken } from './lib/utils'
import superjson from 'superjson'
import { useState } from 'react'
import type { AppRouter } from '../../server/appRouter'
import { TRPCProvider } from './utils/trpc'

function Router() {
  return (
    <Switch>
      <Route path="/">
        <DocumentHead
          title={APP_NAME}
          description="Published manuscripts and reviews."
        />
        <Landing />
      </Route>

      <Route path="/login">
        <DocumentHead title={`Log in · ${APP_NAME}`} />
        <Login />
      </Route>
      <Route path="/admin" nest>
        <AdminLayout>
          <Switch>
            <Route path="/" component={AdminPage} />
            <Route path="/manage" component={AdminManage} />
            <Route path="/users" component={AdminUsers} />
            <Route path="/analytics" component={AdminAnalytics} />

            <Route path="/:groupSlug" nest>
              <GroupProvider>
                {/* Group admin pages look like the group's site. */}
                <GroupTheme admin />
                <Route path="/" component={GroupAdminDashboard} />
                <Route path="/team" component={AdminTeam} />
                <Route path="/publications" component={AdminPublications} />
                <Route
                  path="/publications/:action"
                  component={AdminPublications}
                />
                <Route path="/team/:action" component={AdminTeam} />
                <Route path="/users/:action" component={AdminUsers} />
                <Route path="/issues" component={AdminIssues} />
                <Route path="/what-we-do" component={AdminWhatWeDo} />
                <Route path="/settings" component={AdminSettings} />
                {/* <Route path="/graphql" component={AdminGraphQL} /> */}
              </GroupProvider>
            </Route>
            <Route path="/*" component={AdminPage} />
            <Route component={NotFound} />
          </Switch>
        </AdminLayout>
      </Route>

      <Route path="/:groupSlug" nest>
        <GroupProvider>
          <GroupTheme />
          <div className="min-h-screen flex flex-col bg-muted">
            <Header />
            <main className="grow bg-card">
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
            </main>
            <Footer />
          </div>
        </GroupProvider>
      </Route>
      <Route>
        <DocumentHead title={`Page not found · ${APP_NAME}`} />
        <NotFound />
      </Route>
    </Switch>
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
