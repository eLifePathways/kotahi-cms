import { db } from './db'
import { pageViews, sessions } from '@shared/schema'
import { desc, sql, count } from 'drizzle-orm'

export const timeRanges = ['7days', '30days', '3months', '12months'] as const
export type TimeRange = (typeof timeRanges)[number]

const daysToLookBack: Record<TimeRange, number> = {
  '7days': 7,
  '30days': 30,
  '3months': 90,
  '12months': 365,
}

const getStartDate = (timeRange: TimeRange) => {
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - daysToLookBack[timeRange])
  return startDate
}

// Format to YYYY-MM-DD
const formatDate = (date: Date) => date.toISOString().split('T')[0]

// Get visitor stats over time
export const getVisitorStats = async (timeRange: TimeRange) => {
  const startDate = getStartDate(timeRange)

  // Get data grouped by day
  const dailyStats = await db
    .select({
      date: sql<string>`date_trunc('day', ${pageViews.visitedAt})::date::text`,
      pageViews: count(pageViews.id),
      uniqueSessionIds: sql<number>`count(distinct ${pageViews.sessionId})`,
    })
    .from(pageViews)
    .where(sql`${pageViews.visitedAt} >= ${startDate.toISOString()}`)
    .groupBy(sql`date_trunc('day', ${pageViews.visitedAt})::date::text`)
    .orderBy(sql`date_trunc('day', ${pageViews.visitedAt})::date::text`)

  // Format the response to include visitors, pageViews, and sessions
  const formattedStats = dailyStats.map(day => ({
    date: day.date,
    visitors: day.uniqueSessionIds, // Using sessions as a proxy for visitors
    pageViews: Number(day.pageViews),
    sessions: day.uniqueSessionIds,
  }))

  // Fill in missing dates with zeros
  const result = []
  const currentDate = new Date(startDate)
  const endDate = new Date()

  while (currentDate <= endDate) {
    const dateStr = formatDate(currentDate)
    const existingData = formattedStats.find(item => item.date === dateStr)

    result.push(
      existingData ?? { date: dateStr, visitors: 0, pageViews: 0, sessions: 0 },
    )

    currentDate.setDate(currentDate.getDate() + 1)
  }

  return result
}

// Get device distribution
export const getDeviceDistribution = async (timeRange: TimeRange) => {
  const startDate = getStartDate(timeRange)

  // Get unique session IDs first to avoid counting the same device multiple times
  const uniqueSessions = await db
    .select({
      sessionId: sessions.id,
      deviceType: sessions.deviceType,
      browser: sessions.browser,
    })
    .from(sessions)
    .where(sql`${sessions.startedAt} >= ${startDate.toISOString()}`)

  // Count device types from the session table
  const deviceCounts: Record<string, number> = {
    Desktop: 0,
    Mobile: 0,
    Tablet: 0,
    Other: 0,
  }

  uniqueSessions.forEach(session => {
    const deviceType = session.deviceType?.toLowerCase() || ''

    if (deviceType === 'mobile') {
      deviceCounts.Mobile++
    } else if (deviceType === 'tablet') {
      deviceCounts.Tablet++
    } else if (deviceType === 'desktop') {
      deviceCounts.Desktop++
    } else {
      deviceCounts.Other++
    }
  })

  // Convert to array format for the frontend
  return Object.entries(deviceCounts).map(([name, value]) => ({ name, value }))
}

// Get traffic sources
export const getTrafficSources = async (timeRange: TimeRange) => {
  const startDate = getStartDate(timeRange)

  // Get unique session IDs with source info
  const uniqueSessions = await db
    .select({
      sessionId: sessions.id,
      source: sessions.source,
      sourceDetail: sessions.sourceDetail,
    })
    .from(sessions)
    .where(sql`${sessions.startedAt} >= ${startDate.toISOString()}`)

  // Categorize referrers
  const sourceCounts: Record<string, number> = {
    Direct: 0,
    'Organic Search': 0,
    Referral: 0,
    Social: 0,
    Other: 0,
  }

  uniqueSessions.forEach(session => {
    const source = session.source?.toLowerCase() || ''

    if (source === 'direct') {
      sourceCounts.Direct++
    } else if (source === 'organic') {
      sourceCounts['Organic Search']++
    } else if (source === 'referral') {
      sourceCounts.Referral++
    } else if (source === 'social') {
      sourceCounts.Social++
    } else {
      sourceCounts.Other++
    }
  })

  // Convert to array format for the frontend
  return Object.entries(sourceCounts).map(([name, value]) => ({ name, value }))
}

// Get popular pages
export const getPopularPages = async (timeRange: TimeRange) => {
  const startDate = getStartDate(timeRange)

  // Get page views grouped by path
  const pageViewsByPath = await db
    .select({
      path: pageViews.path,
      views: count(pageViews.id),
      avgTimeOnPage: sql<number>`avg(${pageViews.timeOnPage})`,
    })
    .from(pageViews)
    .where(sql`${pageViews.visitedAt} >= ${startDate.toISOString()}`)
    .groupBy(pageViews.path)
    .orderBy(desc(count(pageViews.id)))
    .limit(10)

  // Map paths to more user-friendly titles
  const pathToTitle: Record<string, string> = {
    '/': 'Home',
    '/what-we-do': 'What We Do',
    '/publications': 'Publications',
    '/team': 'Team',
    '/contact': 'Contact',
    '/admin': 'Admin Dashboard',
    '/admin/team': 'Admin Team Members',
    '/admin/publications': 'Admin Publications',
    '/admin/analytics': 'Admin Analytics',
    '/admin/settings': 'Admin Settings',
  }

  return pageViewsByPath.map(page => ({
    page: page.path,
    title: pathToTitle[page.path] || 'Unknown Page',
    views: Number(page.views),
    avgTimeOnPage: Math.round(page.avgTimeOnPage || 0),
    // Placeholder carried over from the original site: a random 5-45%, not a real
    // bounce rate.
    bounceRate: Math.floor(Math.random() * 40) + 5,
  }))
}

// Reset all analytics data
export const resetAnalytics = async () => {
  await db.delete(pageViews)
  await db.delete(sessions)
}
