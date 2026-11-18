# Architecture

Kotahi CMS is one Node.js process that serves both the API and the React
client, backed by PostgreSQL. Publications and reviews come from Kotahi;
everything else is edited in the CMS.

```
                    ┌──────────────────────── Express 5 (server/index.ts) ───────────────────────┐
                    │                                                                            │
 Browser ──────────►│  analytics middleware ─► /api/trpc  (appRouter)  ─► storage ─► Drizzle ────┼──► PostgreSQL
 (React, TanStack   │                          /api/upload, /uploads   ─► S3 (MinIO in dev)       │
  Query, tRPC)      │                          everything else         ─► Vite (dev) or          │
                    │                                                     dist/public (prod)     │
                    └───────────────────────────────┬────────────────────────────────────────────┘
                                                    │ syncFromKotahi / graphqlProxy
                                                    ▼
                                             Kotahi GraphQL API
```

## Server

| File                                             | Role                                                                                                                                                                                                                            |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `server/index.ts`                                | Builds the Express app: JSON body parsing (50 MB, for screenshots), cookies, analytics, request logging, then `/api/trpc`, the REST upload route, and Vite or static files. Checks the database and seeds defaults on start-up. |
| `server/trpc.ts`                                 | tRPC set-up. `createContext` reads the `Authorization: Bearer` JWT and loads the user. `publicProcedure` is open; `adminProcedure` throws `UNAUTHORIZED` without a user.                                                        |
| `server/appRouter.ts`                            | Every procedure, grouped in `//#region` blocks (see [API](#api)). Exports the `AppRouter` type the client imports.                                                                                                              |
| `server/routes.ts`                               | `POST /api/upload` (multipart images, admin only), stored files at `/uploads`, and a JSON 404 for any other `/api` path.                                                                                                        |
| `server/file-storage.ts`                         | Stores files in S3-compatible storage (MinIO in development) and serves them at `/uploads/<key>`.                                                                                                                               |
| `server/storage.ts`                              | All database reads and writes, and `seedDefaults()`: the first admin user, the `general` and `kotahi` settings rows, and the page headers.                                                                                      |
| `server/kotahi-sync.ts`                          | Fetches published manuscripts from Kotahi and upserts publications and reviews. Uses `manuscript-images.ts` and `manuscript-math.ts`.                                                                                           |
| `server/auth.ts`, `server/middleware.ts`         | Password hashing (bcrypt), JWT signing and checking, and `requireAuth` for the upload route.                                                                                                                                    |
| `server/analytics.ts`, `server/analytics-api.ts` | Page-view tracking middleware, and the queries behind the analytics procedures.                                                                                                                                                 |
| `server/db.ts`, `server/migrate.ts`              | The Drizzle client, and the migration runner used by `yarn db:migrate`.                                                                                                                                                         |
| `server/vite.ts`                                 | Vite middleware in development; static files and the SPA fallback in production.                                                                                                                                                |

## API

Everything except the image upload is a tRPC procedure at `/api/trpc`, with
superjson so dates and other types survive the trip. Inputs are validated with
Zod, mostly the `drizzle-zod` insert schemas from `shared/schema.ts`.

Conventions in `appRouter.ts`:

- Regions are sorted alphabetically, and procedures within a region in CRUD
  order: create, read, update (and reorder), delete.
- Names: a list is plural (`teamMembers`), a single item singular
  (`teamMember`), with variants such as `heroSectionByName`; mutations are
  `createX`, `updateX`, `reorderX`, `deleteX`.
- Inputs: creates take `{ data }`, updates `{ id, data }`, deletes `{ id }`.
- Errors are `TRPCError`s: `NOT_FOUND`, `CONFLICT` (duplicate username),
  `PRECONDITION_FAILED` (Kotahi not configured), `BAD_GATEWAY` (Kotahi
  failed). Only internal and gateway errors are logged.

| Region              | Public                                                         | Admin                                                                                                         |
| ------------------- | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| analytics           |                                                                | `analyticsDevices`, `analyticsPopularPages`, `analyticsTrafficSources`, `analyticsVisitors`, `resetAnalytics` |
| auth                | `login`                                                        |                                                                                                               |
| graphql proxy       |                                                                | `graphqlProxy`                                                                                                |
| hero section        | `heroSectionByName`                                            | `updateHeroSection`                                                                                           |
| issue comments      |                                                                | `createIssueComment`, `issueComments`, `updateIssueComment`, `deleteIssueComment`                             |
| issues              | `createIssue`                                                  | `issues`, `issue`, `updateIssue`, `deleteIssue`                                                               |
| kotahi              |                                                                | `syncFromKotahi`                                                                                              |
| publications        | `publications`, `publication`, `publicationAndReviews`         | `updatePublication`, `deletePublication`                                                                      |
| settings            |                                                                | `settings`, `settingsByPurpose`, `updateSettings`                                                             |
| team members        | `teamMembers`, `teamMember`                                    | `createTeamMember`, `updateTeamMember`, `reorderTeamMembers`, `deleteTeamMember`                              |
| users               |                                                                | `createUser`, `users`, `user`, `updateUser`, `deleteUser`                                                     |
| what we do content  | `whatWeDoContentBySection`, `whatWeDoContent`                  | `createWhatWeDoContent`, `updateWhatWeDoContent`, `reorderWhatWeDoContent`, `deleteWhatWeDoContent`           |
| what we do sections | `whatWeDoSections`, `whatWeDoSection`, `whatWeDoSectionBySlug` | `createWhatWeDoSection`, `updateWhatWeDoSection`, `deleteWhatWeDoSection`                                     |

Public procedures still behave differently for a signed-in admin where it
matters: team member emails, for example, are only returned to admins.

## Authentication

1. `login` checks the username and bcrypt hash and returns a JWT (signed with
   `JWT_SECRET`, expiring after `JWT_EXPIRES_IN`) and the user without its
   password.
2. The client keeps the token in `localStorage` (`cms_admin_token`) and sends
   it with every tRPC request.
3. `createContext` verifies it and loads the user; `adminProcedure` rejects the
   call if there is none.
4. If a request fails with `UNAUTHORIZED` while a token is stored, the client
   clears it and redirects to `/login`.

All users are administrators; there are no roles yet.

## Client

`client/src/App.tsx` sets up the tRPC client (`httpBatchLink` with superjson
and the auth header) inside TanStack Query, and splits the routes into the
public site, `/login`, and the admin panel under `/admin`.

- Pages call `useTRPC()` and use `useQuery(trpc.x.queryOptions(input))` and
  `useMutation(trpc.x.mutationOptions(...))`. After a mutation they invalidate
  with `trpc.x.queryKey(input)` or `trpc.x.pathKey()`.
- Where a call is made outside a hook (bulk deletes, the GraphQL group check)
  they use `useTRPCClient()`.
- `RouterInputs` and `RouterOutputs` in `client/src/utils/trpc.ts` give the
  types of any procedure's input and output.
- All colours come from CSS variables in `client/src/index.css`; the defaults
  are Kotahi's green and grey.

## Data model

All tables use UUID primary keys and are defined in `shared/schema.ts`.

| Table                                       | Holds                                                                                                              |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `publications`                              | One row per Kotahi manuscript, keyed by its short id (stable across versions) and the id of the published version. |
| `reviews`                                   | Published reviews and decisions for a publication, with only the fields Kotahi allows to be published.             |
| `team_members`                              | People shown on the team page, in a sortable order.                                                                |
| `what_we_do_sections`, `what_we_do_content` | Tabbed sections and their ordered content blocks (text, heading, list, image).                                     |
| `hero_section_settings`                     | The title and description at the top of each page, by name.                                                        |
| `settings`                                  | JSON settings by purpose: `kotahi` (endpoint, group, API key) and `general`.                                       |
| `users`                                     | Admin users.                                                                                                       |
| `issues`, `issue_comments`                  | Bug reports from the site, with an optional contact email, and admin comments.                                     |
| `page_views`, `sessions`                    | Analytics.                                                                                                         |

## Kotahi sync

`syncFromKotahi` (Admin → Publications → Refresh Publications):

1. Reads the `kotahi` settings and sends the `manuscriptsPublishedSinceDate`
   query from `shared/queries.ts` to the endpoint, with the group id.
2. Kotahi returns the latest published version of each manuscript, with only
   the review and decision fields whose form setting allows publishing.
3. For each manuscript, the CMS copies its images into file storage under
   `manuscripts/<Kotahi id>/` (Kotahi's own image links expire), renders LaTeX
   to SVG, and creates or updates the publication by short id.
4. Reviews are matched by their Kotahi id: new ones are added, changed ones
   updated, and ones Kotahi no longer returns are removed. Reviews with no
   publishable fields are skipped.

## Files

Admin image uploads (`POST /api/upload`) and the images copied during the
Kotahi sync go through `server/file-storage.ts`, into S3-compatible storage,
as in Kotahi: MinIO in development, S3 or similar in production. The database
holds a path such as `/uploads/images/<uuid>.png`, and this server serves it by
streaming from the bucket, so the bucket can stay private and stored links
don't change if the bucket does.

## Migrations

`shared/schema.ts` is the source of truth. `yarn db:generate` writes a SQL
migration to `migrations/`, and `yarn db:migrate` applies pending ones; both
`yarn dev` and `yarn start:prod` run it first. Drizzle records applied
migrations in `drizzle.__drizzle_migrations`.
