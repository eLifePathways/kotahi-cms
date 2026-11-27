import {
  users,
  type User,
  type InsertUser,
  teamMembers,
  type TeamMember,
  type InsertTeamMember,
  publications,
  type Publication,
  type InsertPublication,
  issues,
  type Issue,
  type InsertIssue,
  issueComments,
  type IssueComment,
  type InsertIssueComment,
  whatWeDoSections,
  type WhatWeDoSection,
  type InsertWhatWeDoSection,
  whatWeDoContent,
  type WhatWeDoContent,
  type InsertWhatWeDoContent,
  type Settings,
  settings,
  Review,
  reviews,
  InsertReview,
  heroSectionSettings,
  type HeroSectionSettings,
  type InsertHeroSettings,
  groups,
  Group,
  InsertGroup,
  type KotahiSettingsFormData,
  type SettingsFormData,
} from '@shared/schema'
import {
  defaultWebsiteSettings,
  withWebsiteDefaults,
  type WebsiteSettings,
} from '@shared/website'
import { db } from './db'
import { eq, ilike, and, gte, lte, or, inArray, asc, count } from 'drizzle-orm'
import { hashPassword } from './auth'

// The database, or a transaction on it.
type DbExecutor =
  typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0]

// A group's Kotahi connection. Its Kotahi group id is kept on the group
// (`kotahiGroupId`) and, for now, mirrored into the kotahi settings row.
export type GroupKotahiSettings = {
  endpoint: string
  apiKey: string | null
  kotahiGroupId: string
}

const toKotahiFormData = ({
  apiKey,
  endpoint,
  kotahiGroupId,
}: GroupKotahiSettings): KotahiSettingsFormData => ({
  endpoint,
  apiKey,
  groupId: kotahiGroupId,
})

export class DatabaseStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id))
    return user || undefined
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.username, username))
    return user || undefined
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const hashedPassword = await hashPassword(
      process.env.ADMIN_PASSWORD || 'ADM!N_PASSW0RD',
    )
    const [adminUser] = await db
      .select()
      .from(users)
      .where(
        and(eq(users.username, 'admin'), eq(users.password, hashedPassword)),
      )

    if (adminUser) {
      await db.delete(users).where(eq(users.id, adminUser.id))
    }

    const [user] = await db.insert(users).values(insertUser).returning()

    return user
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users)
  }

  async updateUser(id: string, data: Partial<User>): Promise<User | undefined> {
    const existingUser = await this.getUser(id)
    if (!existingUser) {
      return undefined
    }

    const [updatedUser] = await db
      .update(users)
      .set(data)
      .where(eq(users.id, id))
      .returning()

    return updatedUser
  }

  async deleteUser(id: string): Promise<boolean> {
    const result = await db.delete(users).where(eq(users.id, id))
    return result.count > 0
  }

  // Hero settings operations
  async getAllHeroSettingsForGroup(
    groupId: string,
  ): Promise<HeroSectionSettings[]> {
    return db
      .select()
      .from(heroSectionSettings)
      .where(eq(heroSectionSettings.groupId, groupId))
  }

  async getHeroSettings(id: string): Promise<HeroSectionSettings | undefined> {
    const [heroSettings] = await db
      .select()
      .from(heroSectionSettings)
      .where(eq(heroSectionSettings.id, id))

    return heroSettings || undefined
  }

  async getHeroSettingsByName(
    groupId: string,
    name: string,
  ): Promise<HeroSectionSettings | undefined> {
    const [heroSettings] = await db
      .select()
      .from(heroSectionSettings)
      .where(
        and(
          eq(heroSectionSettings.groupId, groupId),
          eq(heroSectionSettings.name, name),
        ),
      )

    return heroSettings || undefined
  }

  async updateHeroSettings(
    id: string,
    data: Partial<HeroSectionSettings>,
  ): Promise<HeroSectionSettings | undefined> {
    const existingHeroSettings = await this.getHeroSettings(id)

    if (!existingHeroSettings) {
      return undefined
    }

    const [updatedHeroSettings] = await db
      .update(heroSectionSettings)
      .set(data)
      .where(eq(heroSectionSettings.id, id))
      .returning()

    return updatedHeroSettings
  }

  // Team member operations
  async getAllTeamMembersForGroup(groupId: string): Promise<TeamMember[]> {
    console.log('Fetching team members sorted by sortOrder')
    const result = await db
      .select()
      .from(teamMembers)
      .where(eq(teamMembers.groupId, groupId))
      .orderBy(teamMembers.sortOrder)
    console.log(
      'Team members ordering:',
      result.map(m => ({ id: m.id, name: m.name, sortOrder: m.sortOrder })),
    )
    return result
  }

  async getTeamMember(id: string): Promise<TeamMember | undefined> {
    const [member] = await db
      .select()
      .from(teamMembers)
      .where(eq(teamMembers.id, id))
    return member || undefined
  }

  async createTeamMember(member: InsertTeamMember): Promise<TeamMember> {
    // Get the group's current max sort order and add 1 for the new member
    const existingMembers = await db
      .select()
      .from(teamMembers)
      .where(eq(teamMembers.groupId, member.groupId))
    const maxSortOrder =
      existingMembers.length > 0
        ? Math.max(
            ...existingMembers.map(m =>
              m.sortOrder !== undefined && m.sortOrder !== null
                ? m.sortOrder
                : 0,
            ),
          )
        : -1
    const newSortOrder = maxSortOrder + 1

    console.log(`Creating new team member with sortOrder: ${newSortOrder}`)
    console.log('member details', member)

    // Insert with the calculated sort order
    const [newMember] = await db
      .insert(teamMembers)
      .values({
        ...member,
        sortOrder: newSortOrder,
      })
      .returning()

    return newMember
  }

  async updateTeamMember(
    id: string,
    data: Partial<TeamMember>,
  ): Promise<TeamMember | undefined> {
    const existingMember = await this.getTeamMember(id)
    if (!existingMember) {
      return undefined
    }

    const [updatedMember] = await db
      .update(teamMembers)
      .set(data)
      .where(eq(teamMembers.id, id))
      .returning()

    return updatedMember
  }

  async deleteTeamMember(id: string): Promise<boolean> {
    await db.delete(teamMembers).where(eq(teamMembers.id, id))

    return true // Postgres doesn't easily return affected rows count
  }

  async reorderTeamMembersForGroup(
    groupId: string,
    memberIds: string[],
  ): Promise<TeamMember[]> {
    // Update sort order for each team member in the group
    for (let i = 0; i < memberIds.length; i++) {
      console.log(`Setting sortOrder ${i} for member ID ${memberIds[i]}`)
      await db
        .update(teamMembers)
        .set({ sortOrder: i })
        .where(
          and(
            eq(teamMembers.groupId, groupId),
            eq(teamMembers.id, memberIds[i]),
          ),
        )
    }

    // Verify the sort order was updated correctly
    const updatedMembers = await this.getAllTeamMembersForGroup(groupId)
    console.log(
      'Updated member order:',
      updatedMembers.map(m => ({
        id: m.id,
        name: m.name,
        sortOrder: m.sortOrder,
      })),
    )

    // Return the reordered team members
    return updatedMembers
  }

  // Publication operations
  async getAllPublicationsForGroup(groupId: string): Promise<Publication[]> {
    return await db
      .select()
      .from(publications)
      .where(eq(publications.groupId, groupId))
  }

  async getPublication(id: string): Promise<Publication | undefined> {
    const [publication] = await db
      .select()
      .from(publications)
      .where(eq(publications.id, id))
    return publication || undefined
  }

  async getPublicationByShortIdForGroup(
    groupId: string,
    shortId: number,
  ): Promise<Publication | undefined> {
    const [publication] = await db
      .select()
      .from(publications)
      .where(
        and(
          eq(publications.groupId, groupId),
          eq(publications.kotahiShortId, shortId),
        ),
      )
    return publication || undefined
  }

  async createPublication(
    publication: InsertPublication,
  ): Promise<Publication> {
    const [newPublication] = await db
      .insert(publications)
      .values(publication)
      .returning()
    return newPublication
  }

  async updatePublication(
    id: string,
    data: Partial<Publication>,
  ): Promise<Publication | undefined> {
    const existingPublication = await this.getPublication(id)
    if (!existingPublication) {
      return undefined
    }

    const [updatedPublication] = await db
      .update(publications)
      .set(data)
      .where(eq(publications.id, id))
      .returning()

    return updatedPublication
  }

  async deletePublication(id: string): Promise<boolean> {
    await db.delete(publications).where(eq(publications.id, id))

    return true // Postgres doesn't easily return affected rows count
  }

  async getPublicationsTotalCountForGroup(groupId: string): Promise<number> {
    const [totalCount] = await db
      .select({ count: count() })
      .from(publications)
      .where(eq(publications.groupId, groupId)) // TODO: handle versioning

    return totalCount.count
  }

  async getFilteredPublications(
    groupId: string,
    yearRanges?: string,
    searchQuery?: string,
  ): Promise<Array<Publication>> {
    const conditions: Parameters<typeof and> = [
      eq(publications.groupId, groupId),
    ]

    if (yearRanges) {
      const yearClauses = yearRanges.split(',').map(r => {
        const [start, end] = r.split('-')
        const endYear =
          end === 'present' ? new Date().getFullYear() : parseInt(end)
        return and(
          gte(publications.year, parseInt(start)),
          lte(publications.year, endYear),
        )
      })
      conditions.push(or(...yearClauses))
    }

    if (searchQuery) {
      const searchPattern = `%${searchQuery}%`
      conditions.push(
        or(
          ilike(publications.title, searchPattern),
          ilike(publications.authors, searchPattern),
          ilike(publications.abstract, searchPattern),
        ),
      )
    }

    return db
      .select()
      .from(publications)
      .where(and(...conditions))
  }

  // Review operations
  async getReview(id: string): Promise<Review | undefined> {
    const result = await db.select().from(reviews).where(eq(reviews.id, id))
    return result[0]
  }

  async createReview(insertReview: InsertReview): Promise<Review> {
    const result = await db.insert(reviews).values(insertReview).returning()
    return result[0]
  }

  async updateReview(
    id: string,
    data: Partial<Review>,
  ): Promise<Review | undefined> {
    const existingReview = await this.getReview(id)
    if (!existingReview) {
      return undefined
    }

    const [updatedReview] = await db
      .update(reviews)
      .set(data)
      .where(eq(reviews.id, id))
      .returning()

    return updatedReview
  }

  async getReviewsForPublication(publicationId: string): Promise<Review[]> {
    return db
      .select()
      .from(reviews)
      .where(eq(reviews.publicationId, publicationId))
      .orderBy(asc(reviews.created), asc(reviews.id))
  }

  async deleteReviews(ids: string[]): Promise<void> {
    if (!ids.length) return
    await db.delete(reviews).where(inArray(reviews.id, ids))
  }

  // Issue operations
  async getAllIssues(): Promise<Issue[]> {
    return await db.select().from(issues)
  }

  async getIssue(id: string): Promise<Issue | undefined> {
    const [issue] = await db.select().from(issues).where(eq(issues.id, id))
    return issue || undefined
  }

  async createIssue(issueData: InsertIssue): Promise<Issue> {
    const [newIssue] = await db
      .insert(issues)
      .values({
        ...issueData,
        status: 'open',
        priority: 'medium',
        submittedAt: new Date(),
        updatedAt: new Date(),
      })
      .returning()
    return newIssue
  }

  async updateIssue(
    id: string,
    data: Partial<Issue>,
  ): Promise<Issue | undefined> {
    const existingIssue = await this.getIssue(id)
    if (!existingIssue) {
      return undefined
    }

    const [updatedIssue] = await db
      .update(issues)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(issues.id, id))
      .returning()

    return updatedIssue
  }

  async deleteIssue(id: string): Promise<boolean> {
    await db.delete(issues).where(eq(issues.id, id))

    return true
  }

  // Issue comment operations
  async getIssueComments(issueId: string): Promise<IssueComment[]> {
    return await db
      .select()
      .from(issueComments)
      .where(eq(issueComments.issueId, issueId))
  }

  async createIssueComment(
    commentData: InsertIssueComment,
  ): Promise<IssueComment> {
    const [newComment] = await db
      .insert(issueComments)
      .values(commentData)
      .returning()

    // Update the issue's updatedAt timestamp
    await db
      .update(issues)
      .set({ updatedAt: new Date() })
      .where(eq(issues.id, commentData.issueId))

    return newComment
  }

  async updateIssueComment(
    id: string,
    data: Partial<IssueComment>,
  ): Promise<IssueComment | undefined> {
    const [comment] = await db
      .select()
      .from(issueComments)
      .where(eq(issueComments.id, id))

    if (!comment) {
      return undefined
    }

    // Don't allow changing the issue
    const updatedData = { ...data }
    delete updatedData.issueId
    delete updatedData.createdAt

    const [updatedComment] = await db
      .update(issueComments)
      .set(updatedData)
      .where(eq(issueComments.id, id))
      .returning()

    return updatedComment
  }

  async deleteIssueComment(id: string): Promise<boolean> {
    await db.delete(issueComments).where(eq(issueComments.id, id))

    return true
  }

  // What We Do section operations
  async getAllWhatWeDoSections(groupId: string): Promise<WhatWeDoSection[]> {
    return await db
      .select()
      .from(whatWeDoSections)
      .where(eq(whatWeDoSections.groupId, groupId))
      .orderBy(whatWeDoSections.sortOrder)
  }

  async getWhatWeDoSection(id: string): Promise<WhatWeDoSection | undefined> {
    const [section] = await db
      .select()
      .from(whatWeDoSections)
      .where(eq(whatWeDoSections.id, id))
    return section || undefined
  }

  async getWhatWeDoSectionBySlug(
    groupId: string,
    slug: string,
  ): Promise<WhatWeDoSection | undefined> {
    const [section] = await db
      .select()
      .from(whatWeDoSections)
      .where(
        and(
          eq(whatWeDoSections.groupId, groupId),
          eq(whatWeDoSections.slug, slug),
        ),
      )
    return section || undefined
  }

  async createWhatWeDoSection(
    section: InsertWhatWeDoSection,
  ): Promise<WhatWeDoSection> {
    // Properly handle nullable fields
    const sectionData = {
      ...section,
      subtitle: section.subtitle || null,
      description: section.description || null,
      imageUrl: section.imageUrl || null,
      sortOrder: section.sortOrder || 0,
    }

    const [newSection] = await db
      .insert(whatWeDoSections)
      .values(sectionData)
      .returning()

    return newSection
  }

  async updateWhatWeDoSection(
    id: string,
    data: Partial<WhatWeDoSection>,
  ): Promise<WhatWeDoSection | undefined> {
    const existingSection = await this.getWhatWeDoSection(id)
    if (!existingSection) {
      return undefined
    }

    // Handle the nullable fields
    const updateData = { ...data }

    const [updatedSection] = await db
      .update(whatWeDoSections)
      .set(updateData)
      .where(eq(whatWeDoSections.id, id))
      .returning()

    return updatedSection
  }

  async deleteWhatWeDoSection(id: string): Promise<boolean> {
    await db.delete(whatWeDoSections).where(eq(whatWeDoSections.id, id))

    return true
  }

  // What We Do content operations
  async getWhatWeDoContentBySection(
    sectionId: string,
  ): Promise<WhatWeDoContent[]> {
    return await db
      .select()
      .from(whatWeDoContent)
      .where(eq(whatWeDoContent.sectionId, sectionId))
      .orderBy(whatWeDoContent.sortOrder)
  }

  async getWhatWeDoContent(id: string): Promise<WhatWeDoContent | undefined> {
    const [content] = await db
      .select()
      .from(whatWeDoContent)
      .where(eq(whatWeDoContent.id, id))
    return content || undefined
  }

  async createWhatWeDoContent(
    content: InsertWhatWeDoContent,
  ): Promise<WhatWeDoContent> {
    // Handle nullable fields
    const contentData = {
      ...content,
      title: content.title || null,
      sortOrder: content.sortOrder || 0,
      metadata: content.metadata || null,
    }

    const [newContent] = await db
      .insert(whatWeDoContent)
      .values(contentData)
      .returning()

    return newContent
  }

  async updateWhatWeDoContent(
    id: string,
    data: Partial<WhatWeDoContent>,
  ): Promise<WhatWeDoContent | undefined> {
    const existingContent = await this.getWhatWeDoContent(id)
    if (!existingContent) {
      return undefined
    }

    const [updatedContent] = await db
      .update(whatWeDoContent)
      .set(data)
      .where(eq(whatWeDoContent.id, id))
      .returning()

    return updatedContent
  }

  async deleteWhatWeDoContent(id: string): Promise<boolean> {
    await db.delete(whatWeDoContent).where(eq(whatWeDoContent.id, id))

    return true
  }

  async reorderWhatWeDoContent(
    sectionId: string,
    contentIds: string[],
  ): Promise<WhatWeDoContent[]> {
    // Update sort order for each content item
    for (let i = 0; i < contentIds.length; i++) {
      await db
        .update(whatWeDoContent)
        .set({ sortOrder: i })
        .where(
          and(
            eq(whatWeDoContent.id, contentIds[i]),
            eq(whatWeDoContent.sectionId, sectionId),
          ),
        )
    }

    // Return the reordered content
    return this.getWhatWeDoContentBySection(sectionId)
  }

  // Settings operations
  async getAllSettings(groupId: string): Promise<Settings[]> {
    return db.select().from(settings).where(eq(settings.groupId, groupId))
  }

  async getSettings(
    groupId: string,
    purpose: string,
  ): Promise<Settings | undefined> {
    const [setting] = await db
      .select()
      .from(settings)
      .where(and(eq(settings.groupId, groupId), eq(settings.purpose, purpose)))

    return setting || undefined
  }

  async updateSettings(
    id: string,
    data: Partial<Settings>,
  ): Promise<Settings | undefined> {
    const existingSettings = await db
      .select()
      .from(settings)
      .where(eq(settings.id, id))

    if (!existingSettings) {
      return undefined
    }

    const [updatedSettings] = await db
      .update(settings)
      .set(data)
      .where(eq(settings.id, id))
      .returning()

    return updatedSettings
  }

  async getAllGroups(): Promise<Group[]> {
    return db.select().from(groups).orderBy(asc(groups.name))
  }

  // Active groups by name, each with its website settings (description and
  // look), for listing them in their own style.
  async getActiveGroups(): Promise<
    Array<Group & { website: WebsiteSettings }>
  > {
    const rows = await db
      .select({ group: groups, formData: settings.formData })
      .from(groups)
      .leftJoin(
        settings,
        and(eq(settings.groupId, groups.id), eq(settings.purpose, 'general')),
      )
      .where(eq(groups.isActive, true))
      .orderBy(asc(groups.name))

    return rows.map(({ formData, group }) => ({
      ...group,
      website: withWebsiteDefaults(formData),
    }))
  }

  async getGroupById(id: string): Promise<Group | undefined> {
    const [group] = await db.select().from(groups).where(eq(groups.id, id))

    return group || undefined
  }

  async getGroupByName(name: string): Promise<Group | undefined> {
    const [group] = await db.select().from(groups).where(eq(groups.name, name))

    return group || undefined
  }

  async getGroupBySlug(slug: string): Promise<Group | undefined> {
    const [group] = await db.select().from(groups).where(eq(groups.slug, slug))

    return group || undefined
  }

  // Creates the group with its default settings and hero sections, all or
  // nothing.
  async createGroup(
    data: Omit<InsertGroup, 'kotahiGroupId'>,
    kotahi: GroupKotahiSettings,
  ): Promise<Group> {
    return db.transaction(async tx => {
      const [group] = await tx
        .insert(groups)
        .values({ ...data, kotahiGroupId: kotahi.kotahiGroupId })
        .returning()

      await this.seedDefaultsForGroup(group, toKotahiFormData(kotahi), tx)

      return group
    })
  }

  // Only a group's active state and Kotahi connection can change.
  // The group's website settings, with defaults for anything not saved.
  async getWebsiteSettings(groupId: string): Promise<WebsiteSettings> {
    const row = await this.getSettings(groupId, 'general')

    return withWebsiteDefaults(row?.formData)
  }

  // A group's slug is fixed once created; everything else here can change,
  // all or nothing.
  async updateGroup(
    id: string,
    data: {
      name?: string
      isActive?: boolean
      kotahi?: GroupKotahiSettings
      website?: WebsiteSettings
    },
  ): Promise<Group | undefined> {
    const { isActive, kotahi, name, website } = data

    return db.transaction(async tx => {
      const changes = {
        ...(name === undefined ? {} : { name }),
        ...(isActive === undefined ? {} : { isActive }),
        ...(kotahi ? { kotahiGroupId: kotahi.kotahiGroupId } : {}),
      }

      // Drizzle rejects an update with nothing to set.
      const [updatedGroup] = Object.keys(changes).length
        ? await tx
            .update(groups)
            .set(changes)
            .where(eq(groups.id, id))
            .returning()
        : await tx.select().from(groups).where(eq(groups.id, id))

      if (!updatedGroup) return undefined

      if (kotahi) {
        await this.saveSettings(tx, id, 'kotahi', toKotahiFormData(kotahi))
      }

      if (website) {
        await this.saveSettings(tx, id, 'general', website)
      }

      return updatedGroup
    })
  }

  // Replaces a group's settings row for the purpose, creating it if missing.
  private async saveSettings(
    executor: DbExecutor,
    groupId: string,
    purpose: 'general' | 'kotahi',
    formData: SettingsFormData,
  ): Promise<void> {
    const [updated] = await executor
      .update(settings)
      .set({ formData })
      .where(and(eq(settings.groupId, groupId), eq(settings.purpose, purpose)))
      .returning({ id: settings.id })

    if (!updated) {
      await executor.insert(settings).values({ groupId, purpose, formData })
    }
  }

  async seedAdmin(): Promise<void> {
    if (!(await this.getAllUsers()).length) {
      console.log('Seeding admin user...')
      const rawPassword = process.env.ADMIN_PASSWORD || 'ADM!N_PASSW0RD'
      await db.insert(users).values({
        username: 'admin',
        password: await hashPassword(rawPassword),
      })
    }
  }

  // Seed the records a new group needs: settings rows and hero section copy.
  // Content is left for admins to add.
  async seedDefaultsForGroup(
    group: Group,
    kotahiFormData: KotahiSettingsFormData,
    executor: DbExecutor = db,
  ): Promise<void> {
    console.log(`Seeding settings for group ${group.name}...`)
    await executor.insert(settings).values({
      purpose: 'general',
      formData: defaultWebsiteSettings,
      groupId: group.id,
    })

    await executor.insert(settings).values({
      purpose: 'kotahi',
      formData: kotahiFormData,
      groupId: group.id,
    })

    // Hero section defaults (guarded per name, so newly-added entries are
    // seeded even when some already exist).
    const heroDefaults: InsertHeroSettings[] = [
      {
        name: 'contact',
        title: 'Contact Us',
        description: 'Get in touch with us.',
        groupId: group.id,
      },
      {
        name: 'home',
        title: 'Welcome',
        description: 'Recently published work and reviews.',
        groupId: group.id,
      },
      {
        name: 'publications',
        title: 'Publications',
        description: 'Browse our published work and its reviews.',
        groupId: group.id,
      },
      {
        name: 'search',
        title: 'Search',
        description: 'Search our publications and reviews.',
        groupId: group.id,
      },
      {
        name: 'team',
        title: 'Our Team',
        description: 'Meet the people behind our work.',
        groupId: group.id,
      },
      {
        name: 'whatWeDo',
        title: 'What We Do',
        description: 'An overview of our work.',
        groupId: group.id,
      },
    ]

    await executor.insert(heroSectionSettings).values(heroDefaults)
  }
}

export const storage = new DatabaseStorage()
