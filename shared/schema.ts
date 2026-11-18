import {
  pgTable,
  text,
  integer,
  boolean,
  date,
  timestamp,
  index,
  json,
  jsonb,
  uuid,
} from 'drizzle-orm/pg-core'
import { type InferSelectModel } from 'drizzle-orm'
import { createInsertSchema } from 'drizzle-zod'
import { z } from 'zod'

export type KotahiSettingsFormData = {
  endpoint: string
  groupId: string | null
  apiKey: string | null
}

export type AppSettingsFormData = {
  website: {
    siteName: string
    siteDescription: string
    contactEmail: string
    allowRegistration: boolean
    maintenanceMode: boolean
    theme: string
  }
  api: {
    apiRateLimit: string
    enablePublicAPI: boolean
    requireAPIKey: boolean
  }
  security: {
    adminLoginAttempts: string
    sessionTimeout: string
    enableTwoFactor: boolean
  }
}

export type SettingsFormData = KotahiSettingsFormData | AppSettingsFormData

export type KotahiConfig = {
  id: string
  active: boolean
  flaxSiteUrl: string
}

export type KotahiGroup = {
  id: string
  name: string
  configs: Array<KotahiConfig>
}

export type KotahiManuscriptMeta = {
  title?: string
  source?: string
  comments?: string
  abstract?: string
}

export type KotahiPublishedArtifact = {
  id: string
  created: Date
  updated?: Date
  manuscriptId: string
  platform: string
  externalId?: string
  title?: string
  content?: string
  hostedInKotahi: boolean
  relatedDocumentUri?: string
  relatedDocumentType?: string
}

export type KotahiEditor = {
  id?: string
  name: string
  role: string
}

export type KotahiReviewIdentity = {
  id?: string
  name?: string
  aff?: string
  email?: string
  type?: string
  identifier?: string
}

export type KotahiReviewUser = {
  id?: string
  username?: string
  defaultIdentity?: KotahiReviewIdentity
}

export type KotahiReviewField = {
  field: {
    id: string
    name: string
    title: string
    component: string
    description?: string
    options?: unknown[]
    validate?: unknown[]
    validateValue?: unknown
    hideFromAuthors: string
    permitPublishing: string
    isReadOnly: string
  }
  value: string[] | string
  fieldName: string
  fieldTitle: string
  text: string
  date: string
  shouldPublish: boolean
  objectId: string
}

export type KotahiPublishedReview = {
  id: string
  created: Date
  updated?: Date
  isDecision: boolean
  open: boolean
  users: Array<KotahiReviewUser>
  isHiddenFromAuthor?: boolean
  isCollaborative?: boolean
  isLock?: boolean
  isHiddenReviewerName?: boolean
  isSharedWithCurrentUser: boolean
  canBePublishedPublicly: boolean
  jsonData?: string
  userId?: string
}

export type KotahiPublishedManuscript = {
  id: string
  shortId: number
  status?: string
  meta?: KotahiManuscriptMeta
  submission: string
  submissionWithFields?: string
  supplementaryFiles?: string
  publishedArtifacts: Array<KotahiPublishedArtifact>
  publishedDate?: Date
  printReadyPdfUrl?: string
  styledHtml?: string
  css?: string
  decision?: string
  totalCount?: number
  editors?: Array<KotahiEditor>
  reviews: Array<KotahiPublishedReview>
  decisions: Array<KotahiPublishedReview>
}

export const teamMembers = pgTable('team_members', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  title: text('title').notNull(),
  institution: text('institution').notNull(),
  description: text('description').notNull(),
  imageUrl: text('image_url'),
  email: text('email'),
  website: text('website'),
  socialMedia: text('social_media'),
  sortOrder: integer('sort_order').default(0),
})

export const publications = pgTable('publications', {
  id: uuid('id').primaryKey().defaultRandom(),
  // Publications only come from the Kotahi sync, so both ids are always set.
  kotahiManuscriptId: uuid('kotahi_manuscript_id').notNull(),
  // Stable across manuscript versions, unlike kotahiManuscriptId, which
  // points at whichever version was last published.
  kotahiShortId: integer('kotahi_short_id').notNull().unique(),
  title: text('title').notNull(),
  authors: text('authors').notNull(),
  year: integer('year').notNull(),
  abstract: text('abstract').notNull(),
  publicationDate: date('publication_date').notNull(),
  link: text('link'),
  manuscriptText: text('manuscript_text'),
})

export const reviews = pgTable('reviews', {
  id: uuid('id').primaryKey().defaultRandom(),
  publicationId: uuid('publication_id')
    .notNull()
    .references(() => publications.id, { onDelete: 'cascade' }),
  kotahiReviewId: uuid('kotahi_review_id').unique(),
  created: timestamp('created'),
  users: jsonb('users').$type<KotahiReviewUser[]>().notNull(),
  jsonData: jsonb('json_data').$type<KotahiReviewField[]>().notNull(),
  isDecision: boolean('is_decision').notNull(),
})

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  username: text('username').notNull().unique(),
  password: text('password').notNull(),
})

export const settings = pgTable('settings', {
  id: uuid('id').primaryKey().defaultRandom(),
  purpose: text('purpose').notNull(),
  formData: jsonb('form_data')
    .$type<SettingsFormData>()
    .notNull()
    .default({} as SettingsFormData),
})

export const heroSectionSettings = pgTable('hero_section_settings', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull().unique(),
  title: text('title').notNull(),
  description: text('description').notNull(),
})

// Insert schemas
export const insertTeamMemberSchema = createInsertSchema(teamMembers).omit({
  id: true,
})

export const insertPublicationSchema = createInsertSchema(publications).omit({
  id: true,
})

export const insertReviewSchema = createInsertSchema(reviews)
  .omit({ id: true })
  .extend({
    users: z.array(
      z.object({
        id: z.string().optional(),
        username: z.string().optional(),
        defaultIdentity: z.any().optional(),
      }),
    ),
    jsonData: z.custom<KotahiReviewField[]>(v => Array.isArray(v)),
  })

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
})

export const insertHeroSectionSettingsSchema = createInsertSchema(
  heroSectionSettings,
).omit({ id: true })

// Types
export interface InsertTeamMember extends z.infer<
  typeof insertTeamMemberSchema
> {}
export interface TeamMember extends InferSelectModel<typeof teamMembers> {}

export interface InsertPublication extends z.infer<
  typeof insertPublicationSchema
> {}
export interface Publication extends InferSelectModel<typeof publications> {}

export interface InsertReview extends z.infer<typeof insertReviewSchema> {}
export interface Review extends InferSelectModel<typeof reviews> {}

export interface InsertUser extends z.infer<typeof insertUserSchema> {}
export interface User extends InferSelectModel<typeof users> {}

export interface Settings extends InferSelectModel<typeof settings> {}

export interface InsertHeroSettings extends z.infer<
  typeof insertHeroSectionSettingsSchema
> {}
export interface HeroSectionSettings extends InferSelectModel<
  typeof heroSectionSettings
> {}

// Analytics tables
export const pageViews = pgTable(
  'page_views',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    path: text('path').notNull(),
    visitedAt: timestamp('visited_at').defaultNow().notNull(),
    sessionId: uuid('session_id').notNull(),
    referrer: text('referrer'),
    deviceType: text('device_type').notNull(), // 'desktop', 'mobile', 'tablet'
    country: text('country'),
    region: text('region'),
    bounced: boolean('bounced').default(true), // Initially true, updated if user views another page
    timeOnPage: integer('time_on_page'), // in seconds
    isExit: boolean('is_exit').default(true), // Initially true, updated if user views another page
    scrollDepth: integer('scroll_depth'), // percentage of page scrolled
  },
  table => [
    index('page_views_path_idx').on(table.path),
    index('page_views_session_idx').on(table.sessionId),
    index('page_views_date_idx').on(table.visitedAt),
  ],
)

export const sessions = pgTable(
  'sessions',
  {
    id: uuid('id').primaryKey(),
    startedAt: timestamp('started_at').defaultNow().notNull(),
    endedAt: timestamp('ended_at'),
    deviceType: text('device_type').notNull(), // 'desktop', 'mobile', 'tablet'
    browser: text('browser'),
    os: text('os'),
    country: text('country'),
    region: text('region'),
    source: text('source'), // 'direct', 'organic', 'referral', 'social'
    sourceDetail: text('source_detail'), // specific source (e.g., 'google', 'twitter')
    totalPageViews: integer('total_page_views').default(1),
    duration: integer('duration'), // in seconds
    isNewVisitor: boolean('is_new_visitor').default(true),
    entryPage: text('entry_page').notNull(),
    exitPage: text('exit_page'),
  },
  table => [
    index('sessions_date_idx').on(table.startedAt),
    index('sessions_source_idx').on(table.source),
  ],
)

// Analytics types
export interface Session extends InferSelectModel<typeof sessions> {}

// Issue reporting system
export const issueStatuses = [
  'open',
  'in_progress',
  'resolved',
  'closed',
] as const
export const issuePriorities = ['low', 'medium', 'high'] as const

export const issues = pgTable(
  'issues',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    title: text('title').notNull(),
    description: text('description').notNull(),
    screenshotUrl: text('screenshot_url'),
    consoleLog: text('console_log'),
    status: text('status').notNull().default('open'), // one of issueStatuses
    priority: text('priority').notNull().default('medium'), // one of issuePriorities
    pageUrl: text('page_url').notNull(),
    submittedAt: timestamp('submitted_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
    userId: uuid('user_id'), // Optional, for when user authentication is implemented
    browserInfo: json('browser_info'), // Browser, OS, screen size, etc.
    email: text('email'), // Optional, so we can get back to the reporter
  },
  table => [
    index('issues_status_idx').on(table.status),
    index('issues_priority_idx').on(table.priority),
    index('issues_date_idx').on(table.submittedAt),
  ],
)

export const issueComments = pgTable('issue_comments', {
  id: uuid('id').primaryKey().defaultRandom(),
  issueId: uuid('issue_id')
    .notNull()
    .references(() => issues.id, { onDelete: 'cascade' }),
  content: text('content').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  userId: uuid('user_id'), // Optional, for when user authentication is implemented
  author: text('author').default('Admin'),
  isInternal: boolean('is_internal').default(true),
})

// Insert schemas for issue reporting
export const insertIssueSchema = createInsertSchema(issues).omit({
  id: true,
  submittedAt: true,
  updatedAt: true,
  status: true,
  priority: true,
})

export const insertIssueCommentSchema = createInsertSchema(issueComments).omit({
  id: true,
  createdAt: true,
})

// Issue reporting types
export interface InsertIssue extends z.infer<typeof insertIssueSchema> {}
export interface Issue extends InferSelectModel<typeof issues> {}

export interface InsertIssueComment extends z.infer<
  typeof insertIssueCommentSchema
> {}
export interface IssueComment extends InferSelectModel<typeof issueComments> {}

// What We Do content
export const whatWeDoSections = pgTable('what_we_do_sections', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title').notNull(),
  subtitle: text('subtitle'),
  description: text('description'),
  imageUrl: text('image_url'),
  slug: text('slug').notNull().unique(), // For URL and tab identification
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

export const whatWeDoContent = pgTable('what_we_do_content', {
  id: uuid('id').primaryKey().defaultRandom(),
  sectionId: uuid('section_id')
    .notNull()
    .references(() => whatWeDoSections.id, { onDelete: 'cascade' }),
  title: text('title'),
  contentType: text('content_type').notNull(), // 'text', 'image', 'heading', 'list', etc.
  content: text('content').notNull(), // HTML content or image URL
  sortOrder: integer('sort_order').notNull().default(0),
  metadata: json('metadata'), // Additional data like image alt text, list type, etc.
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

// Insert schemas for What We Do content
export const insertWhatWeDoSectionSchema = createInsertSchema(
  whatWeDoSections,
).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
})

export const insertWhatWeDoContentSchema = createInsertSchema(
  whatWeDoContent,
).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
})

// What We Do content types
export interface InsertWhatWeDoSection extends z.infer<
  typeof insertWhatWeDoSectionSchema
> {}
export interface WhatWeDoSection extends InferSelectModel<
  typeof whatWeDoSections
> {}

export interface InsertWhatWeDoContent extends z.infer<
  typeof insertWhatWeDoContentSchema
> {}
export interface WhatWeDoContent extends InferSelectModel<
  typeof whatWeDoContent
> {}
