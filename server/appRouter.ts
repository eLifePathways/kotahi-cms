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
import {
  GROUP_SLUG_PATTERN,
  isKotahiSettingsFormData,
  reservedGroupSlugs,
  slugify,
} from '../shared/utils'
import { isCuratedFont, websiteSettingsSchema } from '../shared/website'
import { getGoogleFontFamilies, googleFontExists } from './google-fonts'
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
import {
  fetchFromKotahi,
  fetchKotahiGroup,
  syncFromKotahi,
} from './kotahi-sync'

const timeRangeInput = z.object({
  timeRange: z.enum(timeRanges).default('7days'),
})

const groupInput = z.object({ groupId: z.uuid() })

// A group's Kotahi connection: where its GraphQL API is, and which Kotahi
// group it publishes from.
const groupKotahiSettingsInput = z.object({
  endpoint: z.url({
    protocol: /^https?$/,
    error: 'Endpoint must be an http:// or https:// URL',
  }),
  apiKey: z
    .string()
    .trim()
    .nullish()
    .transform(apiKey => apiKey || null),
  kotahiGroupId: z.uuid({ error: 'Choose a Kotahi group' }),
})

// Fonts outside the curated lists are checked with Google, so a typo can't
// leave a site falling back to the browser's default font.
const assertGoogleFontsExist = async (families: string[]) => {
  for (const family of families.filter(f => !isCuratedFont(f))) {
    const exists = await googleFontExists(family).catch((error: Error) => {
      throw new TRPCError({
        code: 'BAD_GATEWAY',
        message: `Couldn't check "${family}" with Google Fonts: ${error.message}`,
        cause: error,
      })
    })

    if (!exists) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: `Google Fonts has no font called "${family}"`,
      })
    }
  }
}

// A slug made from the Kotahi group's name, looked up from Kotahi rather than
// taken from the client. Kotahi doesn't restrict group names, so they're
// slugified: "single_form" is kept, "Single Form" becomes "single-form".
const getKotahiGroupSlug = async (
  kotahi: z.infer<typeof groupKotahiSettingsInput>,
): Promise<string> => {
  const kotahiGroup = await fetchKotahiGroup(kotahi).catch((error: Error) => {
    throw new TRPCError({
      code: 'BAD_GATEWAY',
      message: `Couldn't look up the Kotahi group: ${error.message}`,
      cause: error,
    })
  })

  if (!kotahiGroup) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: `${kotahi.endpoint} has no group with id ${kotahi.kotahiGroupId}`,
    })
  }

  const kotahiGroupName = kotahiGroup.name ?? ''
  const slug = slugify(kotahiGroupName)

  if (!slug) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: `Can't make a slug from "${kotahiGroupName}"; enter one`,
    })
  }

  return slug
}

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

  //#region group
  createGroup: adminProcedure
    .input(
      z.object({
        name: z.string().trim().min(1, { error: 'Name is required' }),
        slug: z
          .string()
          .trim()
          .regex(GROUP_SLUG_PATTERN, {
            error:
              'Slug may only use lowercase letters and numbers, separated by single hyphens or underscores',
          })
          .optional()
          .or(z.literal('').transform(() => undefined)),
        isActive: z.boolean().default(true),
        kotahi: groupKotahiSettingsInput,
      }),
    )
    .mutation(async ({ input }) => {
      const { isActive, kotahi, name } = input
      const slug = input.slug ?? (await getKotahiGroupSlug(kotahi))

      if (reservedGroupSlugs.includes(slug)) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `"${slug}" is used by the app; choose another slug`,
        })
      }

      if (await storage.getGroupByName(name)) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: `A group named "${name}" already exists`,
        })
      }

      if (await storage.getGroupBySlug(slug)) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: `A group with the slug "${slug}" already exists`,
        })
      }

      return storage.createGroup({ name, slug, isActive }, kotahi)
    }),

  group: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const group = await storage.getGroupById(input.id)

      if (!group) {
        throw new TRPCError({ code: 'NOT_FOUND' })
      }

      return group
    }),

  groupBySlug: publicProcedure
    .input(z.object({ slug: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const group = await storage.getGroupBySlug(input.slug)

      if (!group || (!group.isActive && !ctx.user)) {
        throw new TRPCError({ code: 'NOT_FOUND' })
      }

      return group
    }),

  groups: adminProcedure.query(async () => {
    return storage.getAllGroups()
  }),

  activeGroups: publicProcedure.query(async () => {
    return storage.getActiveGroups()
  }),

  updateGroup: adminProcedure
    .input(
      z.object({
        id: z.uuid(),
        data: z.object({
          name: z
            .string()
            .trim()
            .min(1, { error: 'Name is required' })
            .optional(),
          isActive: z.boolean().optional(),
          kotahi: groupKotahiSettingsInput.optional(),
          website: websiteSettingsSchema.optional(),
        }),
      }),
    )
    .mutation(async ({ input }) => {
      const { data, id } = input

      if (data.name !== undefined) {
        const namesake = await storage.getGroupByName(data.name)

        if (namesake && namesake.id !== id) {
          throw new TRPCError({
            code: 'CONFLICT',
            message: `A group named "${data.name}" already exists`,
          })
        }
      }

      if (data.website) {
        const { sansSerifFont, serifFont } = data.website.theme
        await assertGoogleFontsExist([serifFont, sansSerifFont])
      }

      const updatedGroup = await storage.updateGroup(id, data)

      if (!updatedGroup) {
        throw new TRPCError({ code: 'NOT_FOUND' })
      }

      return updatedGroup
    }),

  groupWebsite: publicProcedure
    .input(groupInput)
    .query(async ({ input }) => storage.getWebsiteSettings(input.groupId)),

  // Every Google Fonts family, for choosing a font outside the curated list.
  googleFonts: adminProcedure.query(async () =>
    getGoogleFontFamilies().catch((error: Error) => {
      throw new TRPCError({
        code: 'BAD_GATEWAY',
        message: `Couldn't load the Google Fonts list: ${error.message}`,
        cause: error,
      })
    }),
  ),
  //#endregion group

  //#region hero section
  heroSectionByName: publicProcedure
    .input(groupInput.extend({ name: z.string() }))
    .query(async ({ input }) => {
      const { groupId, name } = input
      const heroSection = await storage.getHeroSettingsByName(groupId, name)

      if (!heroSection) {
        throw new TRPCError({ code: 'NOT_FOUND' })
      }

      return heroSection
    }),

  updateHeroSection: adminProcedure
    .input(
      z.object({
        id: z.uuid(),
        data: insertHeroSectionSettingsSchema.omit({ groupId: true }).partial(),
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
  syncFromKotahi: adminProcedure
    .input(groupInput)
    .mutation(async ({ input }) => {
      const { groupId } = input

      const settings = await storage.getSettings(groupId, 'kotahi')

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
        return await syncFromKotahi(groupId, settings.formData)
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
      groupInput.extend({
        searchQuery: z.string().optional(),
        yearRanges: z.string().optional(),
      }),
    )
    .query(async ({ input }) => {
      const { groupId, searchQuery, yearRanges } = input

      const filteredPublications = await storage.getFilteredPublications(
        groupId,
        yearRanges,
        searchQuery,
      )

      return filteredPublications
    }),

  publicationsTotalCount: publicProcedure
    .input(groupInput)
    .query(async ({ input }) => {
      const { groupId } = input

      return storage.getPublicationsTotalCountForGroup(groupId)
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
    .input(groupInput.extend({ shortId: z.coerce.number().int().positive() }))
    .query(async ({ input }) => {
      const { groupId, shortId } = input

      console.log('shoertID', shortId)

      const publication = await storage.getPublicationByShortIdForGroup(
        groupId,
        shortId,
      )

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
        data: insertPublicationSchema
          .omit({
            groupId: true,
            kotahiManuscriptId: true,
            kotahiShortId: true,
          })
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
    .input(groupInput.extend({ purpose: z.string() }))
    .query(async ({ input }) => {
      const { groupId, purpose } = input

      const settings = await storage.getSettings(groupId, purpose)

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

  teamMembers: publicProcedure
    .input(groupInput)
    .query(async ({ ctx, input }) => {
      const { groupId } = input

      const members = await storage.getAllTeamMembersForGroup(groupId)

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
    .input(
      z.object({
        id: z.uuid(),
        data: insertTeamMemberSchema.omit({ groupId: true }).partial(),
      }),
    )
    .mutation(async ({ input }) => {
      const { data, id } = input

      const updatedMember = await storage.updateTeamMember(id, data)

      if (!updatedMember) {
        throw new TRPCError({ code: 'NOT_FOUND' })
      }

      return updatedMember
    }),

  reorderTeamMembersForGroup: adminProcedure
    .input(groupInput.extend({ memberIds: z.array(z.uuid()) }))
    .mutation(async ({ input }) => {
      const { groupId, memberIds } = input

      const reorderedMembers = await storage.reorderTeamMembersForGroup(
        groupId,
        memberIds,
      )
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

  whatWeDoSections: publicProcedure
    .input(groupInput)
    .query(async ({ input }) => {
      const { groupId } = input

      const sections = await storage.getAllWhatWeDoSections(groupId)

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
    .input(groupInput.extend({ slug: z.string().min(1) }))
    .query(async ({ input }) => {
      const { groupId, slug } = input

      const section = await storage.getWhatWeDoSectionBySlug(groupId, slug)

      if (!section) {
        throw new TRPCError({ code: 'NOT_FOUND' })
      }

      return section
    }),

  updateWhatWeDoSection: adminProcedure
    .input(
      z.object({
        id: z.uuid(),
        data: insertWhatWeDoSectionSchema.omit({ groupId: true }).partial(),
      }),
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
