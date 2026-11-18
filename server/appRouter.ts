import { z } from 'zod'
import { adminProcedure, publicProcedure, router } from './trpc'
import { storage } from './storage'
import {
  insertHeroSectionSettingsSchema,
  insertIssueCommentSchema,
  insertIssueSchema,
  insertPublicationSchema,
  insertTeamMemberSchema,
  insertUserSchema,
  insertWhatWeDoContentSchema,
  insertWhatWeDoSectionSchema,
  issuePriorities,
  issueStatuses,
  type SettingsFormData,
  type TeamMember,
} from '../shared/schema'
import { isKotahiSettingsFormData } from '../shared/utils'
import { TRPCError } from '@trpc/server'
import {
  getDeviceDistribution,
  getPopularPages,
  getTrafficSources,
  getVisitorStats,
  resetAnalytics,
  timeRanges,
} from './analytics-api'
import {
  comparePassword,
  generateToken,
  hashPassword,
  stripUserPassword,
} from './auth'
import { fetchFromKotahi, syncFromKotahi } from './kotahi-sync'

const timeRangeInput = z.object({
  timeRange: z.enum(timeRanges).default('7days'),
})

// Settings rows hold differently shaped form data per purpose (kotahi,
// general), so only check that it is an object.
const settingsFormDataSchema = z.custom<SettingsFormData>(
  value => typeof value === 'object' && value !== null && !Array.isArray(value),
)

// Team member emails are for admins only: visitors get every other field.
const withoutEmailForVisitors = (
  member: TeamMember,
  user: unknown,
): Omit<TeamMember, 'email'> & Partial<Pick<TeamMember, 'email'>> => {
  if (user) return member

  const { email, ...rest } = member

  return rest
}

export const appRouter = router({
  //#region analytics
  analyticsDevices: adminProcedure
    .input(timeRangeInput)
    .query(async ({ input }) => {
      const { timeRange } = input

      return getDeviceDistribution(timeRange)
    }),

  analyticsPopularPages: adminProcedure
    .input(timeRangeInput)
    .query(async ({ input }) => {
      const { timeRange } = input

      return getPopularPages(timeRange)
    }),

  analyticsTrafficSources: adminProcedure
    .input(timeRangeInput)
    .query(async ({ input }) => {
      const { timeRange } = input

      return getTrafficSources(timeRange)
    }),

  analyticsVisitors: adminProcedure
    .input(timeRangeInput)
    .query(async ({ input }) => {
      const { timeRange } = input

      return getVisitorStats(timeRange)
    }),

  resetAnalytics: adminProcedure.mutation(async () => {
    await resetAnalytics()

    return true
  }),
  //#endregion analytics

  //#region auth
  login: publicProcedure.input(insertUserSchema).mutation(async ({ input }) => {
    const { password, username } = input

    const user = await storage.getUserByUsername(username)

    if (!user || !(await comparePassword(password, user.password))) {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'Invalid username or password',
      })
    }

    return { token: generateToken(user.id), user: stripUserPassword(user) }
  }),
  //#endregion auth

  //#region graphql proxy
  // Lets the admin GraphQL playground query Kotahi without CORS issues.
  graphqlProxy: adminProcedure
    .input(
      z.object({
        // Plain z.url() accepts "localhost:3000/graphql", with "localhost:" as
        // the scheme.
        endpoint: z.url({
          protocol: /^https?$/,
          error: 'Endpoint must be an http:// or https:// URL',
        }),
        query: z.string().min(1),
        variables: z.record(z.string(), z.unknown()).optional(),
        apiKey: z.string().nullish(),
        groupId: z.string().nullish(),
        headers: z.record(z.string(), z.string()).optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const { apiKey, endpoint, groupId, headers, query, variables } = input

      const response = await fetchFromKotahi(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...headers,
          ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
          ...(groupId ? { 'X-Group-ID': groupId } : {}),
        },
        body: JSON.stringify({ query, variables: variables ?? {} }),
      }).catch((error: Error) => {
        throw new TRPCError({
          code: 'BAD_GATEWAY',
          message: error.message,
          cause: error,
        })
      })

      const data: unknown = await response.json().catch(() => {
        throw new TRPCError({
          code: 'BAD_GATEWAY',
          message: `${endpoint} didn't return JSON (HTTP ${response.status}). Is it a GraphQL endpoint?`,
        })
      })

      return { status: response.status, data }
    }),
  //#endregion graphql proxy

  //#region hero section
  heroSectionByName: publicProcedure
    .input(z.object({ name: z.string() }))
    .query(async ({ input }) => {
      const { name } = input
      const heroSection = await storage.getHeroSettingsByName(name)

      if (!heroSection) {
        throw new TRPCError({ code: 'NOT_FOUND' })
      }

      return heroSection
    }),

  updateHeroSection: adminProcedure
    .input(
      z.object({
        id: z.uuid(),
        data: insertHeroSectionSettingsSchema.partial(),
      }),
    )
    .mutation(async ({ input }) => {
      const { data, id } = input

      const updatedSection = await storage.updateHeroSettings(id, data)

      if (!updatedSection) {
        throw new TRPCError({ code: 'NOT_FOUND' })
      }

      return updatedSection
    }),
  //#endregion hero section

  //#region issue comments
  createIssueComment: adminProcedure
    .input(
      z.object({
        issueId: z.uuid(),
        data: z.object({
          content: z.string().trim().min(1),
          isInternal: z.boolean().default(false),
        }),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { data, issueId } = input

      const issue = await storage.getIssue(issueId)

      if (!issue) {
        throw new TRPCError({ code: 'NOT_FOUND' })
      }

      const newComment = await storage.createIssueComment({
        ...data,
        issueId,
        author: ctx.user.username,
        userId: ctx.user.id,
      })

      return newComment
    }),

  issueComments: adminProcedure
    .input(z.object({ issueId: z.uuid() }))
    .query(async ({ input }) => {
      const { issueId } = input

      const comments = await storage.getIssueComments(issueId)

      return comments
    }),

  updateIssueComment: adminProcedure
    .input(
      z.object({
        id: z.uuid(),
        data: insertIssueCommentSchema
          .pick({ content: true, isInternal: true })
          .partial(),
      }),
    )
    .mutation(async ({ input }) => {
      const { data, id } = input

      const updatedComment = await storage.updateIssueComment(id, data)

      if (!updatedComment) {
        throw new TRPCError({ code: 'NOT_FOUND' })
      }

      return updatedComment
    }),

  deleteIssueComment: adminProcedure
    .input(z.object({ id: z.uuid() }))
    .mutation(async ({ input }) => {
      const { id } = input
      const success = await storage.deleteIssueComment(id)

      if (!success) {
        throw new TRPCError({ code: 'NOT_FOUND' })
      }

      return success
    }),
  //#endregion issue comments

  //#region issues
  // Public: visitors report bugs from the site.
  createIssue: publicProcedure
    .input(
      z.object({
        data: insertIssueSchema
          .omit({ userId: true })
          .extend({ email: z.email().nullish() }),
      }),
    )
    .mutation(async ({ input }) => {
      const { data } = input

      const newIssue = await storage.createIssue(data)

      return newIssue
    }),

  issues: adminProcedure.query(async () => {
    const issues = await storage.getAllIssues()

    return issues
  }),

  issue: adminProcedure
    .input(z.object({ id: z.uuid() }))
    .query(async ({ input }) => {
      const { id } = input

      const issue = await storage.getIssue(id)

      if (!issue) {
        throw new TRPCError({ code: 'NOT_FOUND' })
      }

      return issue
    }),

  updateIssue: adminProcedure
    .input(
      z.object({
        id: z.uuid(),
        data: insertIssueSchema
          .omit({ userId: true })
          .extend({
            status: z.enum(issueStatuses),
            priority: z.enum(issuePriorities),
          })
          .partial(),
      }),
    )
    .mutation(async ({ input }) => {
      const { data, id } = input

      const updatedIssue = await storage.updateIssue(id, data)

      if (!updatedIssue) {
        throw new TRPCError({ code: 'NOT_FOUND' })
      }

      return updatedIssue
    }),

  deleteIssue: adminProcedure
    .input(z.object({ id: z.uuid() }))
    .mutation(async ({ input }) => {
      const { id } = input
      const success = await storage.deleteIssue(id)

      if (!success) {
        throw new TRPCError({ code: 'NOT_FOUND' })
      }

      return success
    }),
  //#endregion issues

  //#region kotahi
  syncFromKotahi: adminProcedure.mutation(async () => {
    const settings = await storage.getSettings('kotahi')

    if (!settings || !isKotahiSettingsFormData(settings.formData)) {
      throw new TRPCError({
        code: 'PRECONDITION_FAILED',
        message: 'Invalid Kotahi settings',
      })
    }

    if (!settings.formData.endpoint) {
      throw new TRPCError({
        code: 'PRECONDITION_FAILED',
        message: 'Invalid Kotahi endpoint',
      })
    }

    try {
      return await syncFromKotahi(settings.formData)
    } catch (error) {
      throw new TRPCError({
        code: 'BAD_GATEWAY',
        message: `Failed to sync with Kotahi: ${error instanceof Error ? error.message : String(error)}`,
        cause: error,
      })
    }
  }),
  //#endregion kotahi

  //#region publications
  publications: publicProcedure
    .input(
      z.object({
        searchQuery: z.string().optional(),
        yearRanges: z.string().optional(),
      }),
    )
    .query(async ({ input }) => {
      const { searchQuery, yearRanges } = input

      const filteredPublications = await storage.getFilteredPublications(
        yearRanges,
        searchQuery,
      )

      return filteredPublications
    }),

  publicationsTotalCount: publicProcedure.query(async () => {
    return storage.getPublicationsTotalCount()
  }),

  publication: publicProcedure
    .input(z.object({ id: z.uuid() }))
    .query(async ({ input }) => {
      const { id } = input

      const publication = await storage.getPublication(id)

      if (!publication) {
        throw new TRPCError({ code: 'NOT_FOUND' })
      }

      return publication
    }),

  publicationAndReviews: publicProcedure
    .input(z.object({ shortId: z.coerce.number().int().positive() }))
    .query(async ({ input }) => {
      const { shortId } = input

      console.log('shoertID', shortId)

      const publication = await storage.getPublicationByShortId(shortId)

      if (!publication) {
        throw new TRPCError({ code: 'NOT_FOUND' })
      }

      const reviews = await storage.getReviewsForPublication(publication.id)

      return { publication, reviews }
    }),

  updatePublication: adminProcedure
    .input(
      z.object({
        id: z.uuid(),
        // The Kotahi ids tie the publication to its manuscript; only the
        // sync sets them.
        data: insertPublicationSchema
          .omit({ kotahiManuscriptId: true, kotahiShortId: true })
          .partial(),
      }),
    )
    .mutation(async ({ input }) => {
      const { data, id } = input

      const updatedPublication = await storage.updatePublication(id, data)

      if (!updatedPublication) {
        throw new TRPCError({ code: 'NOT_FOUND' })
      }

      return updatedPublication
    }),

  deletePublication: adminProcedure
    .input(z.object({ id: z.uuid() }))
    .mutation(async ({ input }) => {
      const { id } = input
      const success = await storage.deletePublication(id)

      if (!success) {
        throw new TRPCError({ code: 'NOT_FOUND' })
      }

      return success
    }),
  //#endregion publications

  //#region settings
  settingsByPurpose: adminProcedure
    .input(z.object({ purpose: z.string() }))
    .query(async ({ input }) => {
      const { purpose } = input

      const settings = await storage.getSettings(purpose)

      if (!settings) {
        throw new TRPCError({ code: 'NOT_FOUND' })
      }

      return settings
    }),

  updateSettings: adminProcedure
    .input(
      z.object({
        id: z.uuid(),
        data: z.object({ formData: settingsFormDataSchema }),
      }),
    )
    .mutation(async ({ input }) => {
      const { data, id } = input

      const updatedSettings = await storage.updateSettings(id, data)

      if (!updatedSettings) {
        throw new TRPCError({ code: 'NOT_FOUND' })
      }

      return updatedSettings
    }),
  //#endregion settings

  //#region team members
  createTeamMember: adminProcedure
    .input(z.object({ data: insertTeamMemberSchema }))
    .mutation(async ({ input }) => {
      const { data } = input

      const newMember = await storage.createTeamMember(data)

      return newMember
    }),

  teamMembers: publicProcedure.query(async ({ ctx }) => {
    const members = await storage.getAllTeamMembers()

    return members.map(member => withoutEmailForVisitors(member, ctx.user))
  }),

  teamMember: publicProcedure
    .input(z.object({ id: z.uuid() }))
    .query(async ({ ctx, input }) => {
      const { id } = input

      const member = await storage.getTeamMember(id)

      if (!member) {
        throw new TRPCError({ code: 'NOT_FOUND' })
      }

      return withoutEmailForVisitors(member, ctx.user)
    }),

  updateTeamMember: adminProcedure
    .input(z.object({ id: z.uuid(), data: insertTeamMemberSchema.partial() }))
    .mutation(async ({ input }) => {
      const { data, id } = input

      const updatedMember = await storage.updateTeamMember(id, data)

      if (!updatedMember) {
        throw new TRPCError({ code: 'NOT_FOUND' })
      }

      return updatedMember
    }),

  reorderTeamMembers: adminProcedure
    .input(z.array(z.uuid()))
    .mutation(async ({ input }) => {
      const reorderedMembers = await storage.reorderTeamMembers(input)
      return reorderedMembers
    }),

  deleteTeamMember: adminProcedure
    .input(z.object({ id: z.uuid() }))
    .mutation(async ({ input }) => {
      const { id } = input
      const success = await storage.deleteTeamMember(id)

      if (!success) {
        throw new TRPCError({ code: 'NOT_FOUND' })
      }

      return success
    }),
  //#endregion team members

  //#region users
  createUser: adminProcedure
    .input(z.object({ data: insertUserSchema }))
    .mutation(async ({ input }) => {
      const { password, username } = input.data

      if (await storage.getUserByUsername(username)) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'Username already exists',
        })
      }

      const newUser = await storage.createUser({
        username,
        password: await hashPassword(password),
      })

      return stripUserPassword(newUser)
    }),

  users: adminProcedure.query(async () => {
    const users = await storage.getAllUsers()

    return users.map(stripUserPassword)
  }),

  user: adminProcedure
    .input(z.object({ id: z.uuid() }))
    .query(async ({ input }) => {
      const { id } = input

      const user = await storage.getUser(id)

      if (!user) {
        throw new TRPCError({ code: 'NOT_FOUND' })
      }

      return stripUserPassword(user)
    }),

  updateUser: adminProcedure
    .input(z.object({ id: z.uuid(), data: insertUserSchema.partial() }))
    .mutation(async ({ input }) => {
      const { data, id } = input
      const { password, username } = data

      if (username) {
        const existingUser = await storage.getUserByUsername(username)

        if (existingUser && existingUser.id !== id) {
          throw new TRPCError({
            code: 'CONFLICT',
            message: 'Username already exists',
          })
        }
      }

      const updatedUser = await storage.updateUser(id, {
        ...(username ? { username } : {}),
        ...(password ? { password: await hashPassword(password) } : {}),
      })

      if (!updatedUser) {
        throw new TRPCError({ code: 'NOT_FOUND' })
      }

      return stripUserPassword(updatedUser)
    }),

  deleteUser: adminProcedure
    .input(z.object({ id: z.uuid() }))
    .mutation(async ({ input }) => {
      const { id } = input
      const success = await storage.deleteUser(id)

      if (!success) {
        throw new TRPCError({ code: 'NOT_FOUND' })
      }

      return success
    }),
  //#endregion users

  //#region what we do content
  createWhatWeDoContent: adminProcedure
    .input(z.object({ data: insertWhatWeDoContentSchema }))
    .mutation(async ({ input }) => {
      const { data } = input

      const newContent = await storage.createWhatWeDoContent(data)

      return newContent
    }),

  whatWeDoContentBySection: publicProcedure
    .input(z.object({ sectionId: z.uuid() }))
    .query(async ({ input }) => {
      const { sectionId } = input

      const content = await storage.getWhatWeDoContentBySection(sectionId)

      return content
    }),

  whatWeDoContent: publicProcedure
    .input(z.object({ id: z.uuid() }))
    .query(async ({ input }) => {
      const { id } = input

      const content = await storage.getWhatWeDoContent(id)

      if (!content) {
        throw new TRPCError({ code: 'NOT_FOUND' })
      }

      return content
    }),

  updateWhatWeDoContent: adminProcedure
    .input(
      z.object({ id: z.uuid(), data: insertWhatWeDoContentSchema.partial() }),
    )
    .mutation(async ({ input }) => {
      const { data, id } = input

      const updatedContent = await storage.updateWhatWeDoContent(id, data)

      if (!updatedContent) {
        throw new TRPCError({ code: 'NOT_FOUND' })
      }

      return updatedContent
    }),

  reorderWhatWeDoContent: adminProcedure
    .input(z.object({ sectionId: z.uuid(), contentIds: z.array(z.uuid()) }))
    .mutation(async ({ input }) => {
      const { contentIds, sectionId } = input

      const reorderedContent = await storage.reorderWhatWeDoContent(
        sectionId,
        contentIds,
      )

      return reorderedContent
    }),

  deleteWhatWeDoContent: adminProcedure
    .input(z.object({ id: z.uuid() }))
    .mutation(async ({ input }) => {
      const { id } = input
      const success = await storage.deleteWhatWeDoContent(id)

      if (!success) {
        throw new TRPCError({ code: 'NOT_FOUND' })
      }

      return success
    }),
  //#endregion what we do content

  //#region what we do sections
  createWhatWeDoSection: adminProcedure
    .input(
      z.object({
        data: insertWhatWeDoSectionSchema.extend({
          title: z.string().trim().min(1),
          slug: z.string().trim().min(1),
        }),
      }),
    )
    .mutation(async ({ input }) => {
      const { data } = input

      const newSection = await storage.createWhatWeDoSection(data)

      return newSection
    }),

  whatWeDoSections: publicProcedure.query(async () => {
    const sections = await storage.getAllWhatWeDoSections()

    console.log('whatWeDoSections sections', sections)

    return sections
  }),

  whatWeDoSection: publicProcedure
    .input(z.object({ id: z.uuid() }))
    .query(async ({ input }) => {
      const { id } = input

      const section = await storage.getWhatWeDoSection(id)

      if (!section) {
        throw new TRPCError({ code: 'NOT_FOUND' })
      }

      return section
    }),

  whatWeDoSectionBySlug: publicProcedure
    .input(z.object({ slug: z.string().min(1) }))
    .query(async ({ input }) => {
      const { slug } = input

      const section = await storage.getWhatWeDoSectionBySlug(slug)

      if (!section) {
        throw new TRPCError({ code: 'NOT_FOUND' })
      }

      return section
    }),

  updateWhatWeDoSection: adminProcedure
    .input(
      z.object({ id: z.uuid(), data: insertWhatWeDoSectionSchema.partial() }),
    )
    .mutation(async ({ input }) => {
      const { data, id } = input

      const updatedSection = await storage.updateWhatWeDoSection(id, data)

      if (!updatedSection) {
        throw new TRPCError({ code: 'NOT_FOUND' })
      }

      return updatedSection
    }),

  deleteWhatWeDoSection: adminProcedure
    .input(z.object({ id: z.uuid() }))
    .mutation(async ({ input }) => {
      const { id } = input
      const success = await storage.deleteWhatWeDoSection(id)

      if (!success) {
        throw new TRPCError({ code: 'NOT_FOUND' })
      }

      return success
    }),
  //#endregion what we do sections
})

export type AppRouter = typeof appRouter
