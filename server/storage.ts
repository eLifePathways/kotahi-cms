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
} from '@shared/schema'
import { db } from './db'
import { eq, ilike, and, gte, lte, or, inArray, asc, count } from 'drizzle-orm'
import { hashPassword } from './auth'

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
  async getAllHeroSettings(): Promise<HeroSectionSettings[]> {
    return db.select().from(heroSectionSettings)
  }

  async getHeroSettings(id: string): Promise<HeroSectionSettings | undefined> {
    const [heroSettings] = await db
      .select()
      .from(heroSectionSettings)
      .where(eq(heroSectionSettings.id, id))

    return heroSettings || undefined
  }

  async getHeroSettingsByName(
    name: string,
  ): Promise<HeroSectionSettings | undefined> {
    const [heroSettings] = await db
      .select()
      .from(heroSectionSettings)
      .where(eq(heroSectionSettings.name, name))

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
  async getAllTeamMembers(): Promise<TeamMember[]> {
    console.log('Fetching team members sorted by sortOrder')
    const result = await db
      .select()
      .from(teamMembers)
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
    // Get the current max sort order and add 1 for the new member
    const existingMembers = await db.select().from(teamMembers)
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

  async reorderTeamMembers(memberIds: string[]): Promise<TeamMember[]> {
    console.log('Starting reorderTeamMembers with memberIds:', memberIds)

    // Update sort order for each team member
    for (let i = 0; i < memberIds.length; i++) {
      console.log(`Setting sortOrder ${i} for member ID ${memberIds[i]}`)
      await db
        .update(teamMembers)
        .set({ sortOrder: i })
        .where(eq(teamMembers.id, memberIds[i]))
    }

    // Verify the sort order was updated correctly
    const updatedMembers = await this.getAllTeamMembers()
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
  async getAllPublications(): Promise<Publication[]> {
    return await db.select().from(publications)
  }

  async getPublication(id: string): Promise<Publication | undefined> {
    const [publication] = await db
      .select()
      .from(publications)
      .where(eq(publications.id, id))
    return publication || undefined
  }

  async getPublicationByShortId(
    shortId: number,
  ): Promise<Publication | undefined> {
    const [publication] = await db
      .select()
      .from(publications)
      .where(eq(publications.kotahiShortId, shortId))
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

  async getPublicationsTotalCount(): Promise<number> {
    const [totalCount] = await db.select({ count: count() }).from(publications) // TODO: handle versioning

    return totalCount.count
  }

  async getFilteredPublications(
    yearRanges?: string,
    searchQuery?: string,
  ): Promise<Array<Publication>> {
    const conditions = []

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
  async getAllWhatWeDoSections(): Promise<WhatWeDoSection[]> {
    return await db
      .select()
      .from(whatWeDoSections)
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
    slug: string,
  ): Promise<WhatWeDoSection | undefined> {
    const [section] = await db
      .select()
      .from(whatWeDoSections)
      .where(eq(whatWeDoSections.slug, slug))
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
  async getAllSettings(): Promise<Settings[]> {
    return db.select().from(settings)
  }

  async getSettings(purpose: string): Promise<Settings | undefined> {
    const [setting] = await db
      .select()
      .from(settings)
      .where(eq(settings.purpose, purpose))

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

  // Seed the records the app needs to run: an admin user, settings rows and
  // hero section copy. Content is left for admins to add.
  async seedDefaults(): Promise<void> {
    if (!(await this.getAllUsers()).length) {
      console.log('Seeding admin user...')
      const rawPassword = process.env.ADMIN_PASSWORD || 'ADM!N_PASSW0RD'
      await db.insert(users).values({
        username: 'admin',
        password: await hashPassword(rawPassword),
      })
    }

    // Settings (guarded per purpose)
    const existingPurposes = new Set(
      (await this.getAllSettings()).map(setting => setting.purpose),
    )

    if (!existingPurposes.has('general')) {
      console.log('Seeding general settings...')
      await db.insert(settings).values({
        purpose: 'general',
        formData: {
          website: {
            siteName: 'Kotahi CMS',
            siteDescription: '',
            contactEmail: '',
            allowRegistration: false,
            maintenanceMode: false,
            theme: 'default',
          },
          api: {
            apiRateLimit: '100',
            enablePublicAPI: true,
            requireAPIKey: false,
          },
          security: {
            adminLoginAttempts: '5',
            sessionTimeout: '60',
            enableTwoFactor: false,
          },
        },
      })
    }

    if (!existingPurposes.has('kotahi')) {
      console.log('Seeding kotahi settings...')
      await db.insert(settings).values({
        purpose: 'kotahi',
        formData: {
          endpoint: '',
          groupId: null,
          apiKey: null,
        },
      })
    }

    // Hero section defaults (guarded per name, so newly-added entries are
    // seeded even when some already exist).
    const heroDefaults: InsertHeroSettings[] = [
      {
        name: 'contact',
        title: 'Contact Us',
        description: 'Get in touch with us.',
      },
      {
        name: 'home',
        title: 'Welcome',
        description: 'Recently published work and reviews.',
      },
      {
        name: 'publications',
        title: 'Publications',
        description: 'Browse our published work and its reviews.',
      },
      {
        name: 'search',
        title: 'Search',
        description: 'Search our publications and reviews.',
      },
      {
        name: 'team',
        title: 'Our Team',
        description: 'Meet the people behind our work.',
      },
      {
        name: 'whatWeDo',
        title: 'What We Do',
        description: 'An overview of our work.',
      },
    ]

    const existingHeroNames = new Set(
      (await this.getAllHeroSettings()).map(hero => hero.name),
    )
    const missingHero = heroDefaults.filter(
      hero => !existingHeroNames.has(hero.name),
    )

    if (missingHero.length > 0) {
      console.log(`Seeding ${missingHero.length} hero section(s)...`)
      await db.insert(heroSectionSettings).values(missingHero)
    }
  }
}

export const storage = new DatabaseStorage()
