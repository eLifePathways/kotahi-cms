# Development guide

See [ARCHITECTURE.md](ARCHITECTURE.md) for how the pieces fit together.

## Set-up

```bash
docker compose up
```

`docker-compose.yml` mirrors Kotahi's set-up:

- **`app`** builds the image and runs `yarn dev`, which applies pending
  migrations and serves http://localhost:5120. `client/`, `server/`, `shared/`
  and `migrations/` are mounted, so client changes hot-reload; restart the
  container (`docker compose restart app`) after server changes.
- **`db`** is PostgreSQL 16, with its data in the `postgres-data` volume.
- **`fileHosting`** is MinIO, the S3-compatible store for uploaded and synced
  images, with its data in the `minio-storage` volume.
- **`createbucket`** creates MinIO's non-root user and the bucket the app uses,
  then exits.

The database and MinIO are published on random local ports, so they don't
clash with Kotahi's; `docker compose port db 5432` and
`docker compose port fileHosting 9001` (the MinIO console, signed in with
`MINIO_ROOT_USER` and `MINIO_ROOT_PASSWORD`) show which. Set the port
variables below to fix them.

After changing dependencies, rebuild with
`docker compose up --build --renew-anon-volumes`: `node_modules` lives in an
anonymous volume, which a plain `--build` keeps.

`docker compose down -v` removes the containers, the database and the files.

### Settings

Every setting has a development default. Override them in a `.env` file in
the project root (it is git-ignored); Docker Compose reads it automatically.

| Variable | Default in Compose | Notes |
| --- | --- | --- |
| `PORT` | `5120` | Port on your machine. |
| `ADMIN_PASSWORD` | `admin` | Password for the `admin` user, created only when there are no users yet. |
| `JWT_SECRET` | `dev-jwt-secret` | Signs admin tokens. |
| `JWT_EXPIRES_IN` | `7d` | Token lifetime. |
| `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` | `dev`, `secretpassword`, `kotahi_cms` | Credentials for the `db` container. |
| `POSTGRES_PORT` | random | Local port for the `db` container. |
| `S3_URL` | `http://fileHosting:9000` | The S3 endpoint; the `fileHosting` container by default. |
| `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` | `uploads`, `nonRootUser`, `nonRootPassword` | Bucket and credentials, created in MinIO by `createbucket`. |
| `MINIO_ROOT_USER`, `MINIO_ROOT_PASSWORD` | `admin`, `superSecretAdminPassword` | MinIO's admin account. |
| `S3_PORT`, `MINIO_CONSOLE_PORT` | random | Local ports for MinIO's API and console. |

Under Compose, the app always uses the `db` container: `POSTGRES_URL` in
`.env` is ignored, since `localhost` inside a container is the container
itself. For the same reason, leave `S3_URL` unset in `.env` unless you mean to
use an S3 service other than `fileHosting`.

### Without Docker

You need Node.js 26+, Yarn 4 (via Corepack), PostgreSQL 16+ and S3-compatible
storage; the server won't start without `POSTGRES_URL` or the S3 settings. The
simplest way to get both is to run just those containers with fixed ports:

```bash
POSTGRES_PORT=5434 S3_PORT=9100 docker compose up -d db fileHosting createbucket
```

Then set, in `.env`:

```
POSTGRES_URL=postgresql://dev:secretpassword@localhost:5434/kotahi_cms
S3_URL=http://localhost:9100
S3_BUCKET=uploads
S3_ACCESS_KEY_ID=nonRootUser
S3_SECRET_ACCESS_KEY=nonRootPassword
JWT_SECRET=dev-jwt-secret
```

and run:

```bash
corepack enable
yarn install
yarn dev
```

`NODE_ENV=production` serves the built client from `dist/public` instead of
through Vite.

### Connecting to Kotahi

Sign in as `admin`, open Admin → GraphQL API, and enter the Kotahi GraphQL
endpoint, pick the group and save. For a Kotahi running on your machine, use
`http://host.docker.internal:3000/graphql` under Docker, or
`http://localhost:3000/graphql` without it.
Admin → Publications → Refresh Publications then runs the sync.

Kotahi only sends review and decision fields that its forms allow to be
published. If a review is missing, check "Include when sharing or publishing?"
on the fields of the Review and Decision forms in Kotahi.

## Database changes

`shared/schema.ts` is the source of truth.

1. Change the table definitions in `shared/schema.ts`.
2. Run `yarn db:generate` to write a migration to `migrations/`, and check the
   SQL.
3. Run `yarn db:migrate`, or restart `yarn dev`.

Model types are declared as interfaces so editors show their names:

```ts
export interface Publication extends InferSelectModel<typeof publications> {}
export interface InsertPublication
  extends z.infer<typeof insertPublicationSchema> {}
```

Drizzle decides which migrations are pending by timestamp. If you squash or
regenerate migrations that a database has already applied, recreate that
database, or Drizzle will try to create existing tables again
(`relation "…" already exists`).

## Adding a procedure

Add it to the matching `//#region` in `server/appRouter.ts`, keeping regions
alphabetical and procedures in CRUD order (see
[ARCHITECTURE.md](ARCHITECTURE.md#api) for naming and input conventions). Use
`adminProcedure` unless the public site needs it.

```ts
//#region team members
createTeamMember: adminProcedure
  .input(z.object({ data: insertTeamMemberSchema }))
  .mutation(async ({ input }) => storage.createTeamMember(input.data)),

teamMember: publicProcedure
  .input(z.object({ id: z.uuid() }))
  .query(async ({ input }) => {
    const member = await storage.getTeamMember(input.id)
    if (!member) throw new TRPCError({ code: 'NOT_FOUND' })
    return member
  }),
//#endregion team members
```

Put database access in `server/storage.ts` rather than in the procedure.

## Using it from the client

```tsx
const trpc = useTRPC()
const queryClient = useQueryClient()

const { data: members = [] } = useQuery(trpc.teamMembers.queryOptions())

const deleteMember = useMutation(
  trpc.deleteTeamMember.mutationOptions({
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: trpc.teamMembers.queryKey() }),
  }),
)

deleteMember.mutate({ id })
```

- Don't pass type arguments to `useQuery`; the types come from the router.
  Use `RouterInputs['x']` and `RouterOutputs['x']` from `@/utils/trpc` when
  you need them elsewhere.
- Invalidate every query a mutation affects. `trpc.x.pathKey()` covers all
  inputs of a procedure.
- Show the server's message in error toasts (`error.message`); tRPC passes
  validation and `TRPCError` messages through.
- Use `useTRPCClient()` for calls outside the hook lifecycle, such as a loop
  of deletes.

The only REST call left is the image upload, through `apiRequest` in
`client/src/lib/queryClient.ts`.

## Styling

Colours are CSS variables in `client/src/index.css`, used through Tailwind's
semantic classes (`bg-primary`, `text-muted-foreground`). Don't use palette
classes such as `bg-blue-600` in components.

## Code style

Prettier with single quotes, no semicolons and `arrowParens: avoid`:

```bash
npx prettier --single-quote --no-semi --arrow-parens avoid --write <files>
```

Write comments, docs and messages in British English.

## Checks

```bash
yarn check   # type-check
yarn build   # production build
```

There are no automated tests or linting yet.

## Troubleshooting

- **`POSTGRES_URL is not set`** (without Docker): the `.env` file is missing or
  not in the project root.
- **`relation "…" already exists` on start-up**: see
  [Database changes](#database-changes).
- **Signed out unexpectedly**: the token expired or `JWT_SECRET` changed; any
  `UNAUTHORIZED` response clears the token and redirects to `/login`.
- **A publication has no reviews**: see
  [Connecting to Kotahi](#connecting-to-kotahi).
