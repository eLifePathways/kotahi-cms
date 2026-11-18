# Kotahi CMS

A content management system for publishing work from
[Kotahi](https://github.com/eLifePathways/Kotahi). It pulls published
manuscripts and their reviews from a Kotahi instance and presents them on a
public website, alongside pages the team edits in the CMS itself.

## Features

- **Public site**: home, about us, publications (with search) and each
  publication with its published reviews and decision, team, what we do and
  contact pages.
- **Kotahi sync**: imports the latest published version of every manuscript in
  a Kotahi group, including its images, maths and publishable review fields.
- **Admin panel**: edit page headers, team members, "what we do" sections and
  publications; manage admin users; configure the Kotahi connection.
- **Issue reporting**: a bug button on every page captures a screenshot and the
  browser console; admins triage reports and comment on them.
- **Analytics**: basic page-view and session tracking. Only full page loads
  are counted, so treat the figures as approximate.

## Tech stack

- **Client**: React 19, TypeScript, Vite, Tailwind CSS 4, shadcn/ui
  components on Radix, wouter for routing.
- **API**: tRPC 11 on Express 5, with TanStack Query on the client and
  superjson on both ends.
- **Database**: PostgreSQL with Drizzle ORM and Drizzle Kit migrations.
- **Validation**: Zod 4, including schemas generated from the database tables.
- **Files**: S3-compatible object storage; MinIO in development, as in Kotahi.

## Getting started

With Docker:

```bash
docker compose up
```

This starts the CMS with its own PostgreSQL database and MinIO (for files),
applies migrations and serves the site at http://localhost:5120, with hot
reload for the client.
Every setting has a development default; put overrides in a `.env` file (see
[DEVELOPMENT.md](DEVELOPMENT.md#settings)).

Then sign in at `/login` as `admin` (password `admin`, or `ADMIN_PASSWORD`),
set up the Kotahi connection under Admin → GraphQL API, and sync publications
under Admin → Publications.

To run it without Docker, see [DEVELOPMENT.md](DEVELOPMENT.md#without-docker).

## Scripts

| Script             | What it does                                                                      |
| ------------------ | --------------------------------------------------------------------------------- |
| `yarn dev`         | Applies migrations, then runs the server with Vite middleware and hot reload.     |
| `yarn build`       | Builds the client into `dist/public` and bundles the server into `dist/index.js`. |
| `yarn start`       | Runs the built server in production mode.                                         |
| `yarn start:prod`  | Applies migrations, then `yarn start`. Used by the Docker image.                  |
| `yarn db:generate` | Generates a migration from changes to `shared/schema.ts`.                         |
| `yarn db:migrate`  | Applies pending migrations.                                                       |
| `yarn check`       | Type-checks the whole project.                                                    |

## Project structure

```
├── client/
│   ├── index.html
│   ├── public/             # Static files
│   └── src/
│       ├── App.tsx         # Routes and the tRPC/TanStack Query providers
│       ├── components/     # admin/, issue-report/, layout/, sections/, ui/
│       ├── hooks/
│       ├── lib/            # Query client, auth token helpers
│       ├── pages/          # Public pages, plus admin/ for the admin panel
│       └── utils/          # tRPC hooks and router types, error tracking
├── server/
│   ├── index.ts            # Express app: middleware, /api/trpc, Vite or static files
│   ├── appRouter.ts        # Every tRPC procedure
│   ├── trpc.ts             # Context (user from the JWT), public and admin procedures
│   ├── routes.ts           # REST: image upload and serving stored files
│   ├── file-storage.ts     # Files in S3 (MinIO in development)
│   ├── storage.ts          # Database access and seeding
│   ├── kotahi-sync.ts      # Pulls published manuscripts and reviews from Kotahi
│   └── …                   # Auth, analytics, uploads, migrations, Vite set-up
├── shared/
│   ├── schema.ts           # Drizzle tables, Zod schemas and types
│   ├── queries.ts          # GraphQL queries sent to Kotahi
│   └── utils.ts
├── migrations/             # Drizzle Kit SQL migrations
```

## Documentation

- [ARCHITECTURE.md](ARCHITECTURE.md): how the pieces fit together.
- [DEVELOPMENT.md](DEVELOPMENT.md): working on the code.
- [DEPLOYMENT.md](DEPLOYMENT.md): running it in production.
- [USER_GUIDE.md](USER_GUIDE.md): using the site and the admin panel.

## Licence

This project is proprietary and confidential. Unauthorised copying, transfer or
reproduction of the contents of this repository is prohibited. See
[LICENSE](LICENSE).

© 2026 [eLife Pathways](https://elifepathways.org). All rights reserved.
