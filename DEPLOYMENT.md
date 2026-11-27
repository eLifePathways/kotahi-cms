# Deployment guide

Kotahi CMS runs as a single Node.js process that serves the API and the built
client on one port (default `5120`), next to a PostgreSQL database.

## Requirements

- PostgreSQL 16+ with an empty database for the CMS.
- S3-compatible object storage (AWS S3, DigitalOcean Spaces, MinIO and so on)
  with a bucket for the CMS. Every Kotahi instance needs one already, so the
  CMS can use the same service with its own bucket.
- Either Docker, or Node.js 26+ with Yarn 4 (via Corepack).
- A reachable Kotahi GraphQL endpoint for the publications sync.
- Outbound access to Google Fonts (`fonts.google.com` and
  `fonts.googleapis.com`), for the font search in a group's settings and to
  check custom fonts. Visitors' browsers load the fonts from Google too.

## Environment variables

| Variable                                   | Required         | Notes                                                                                                                                                             |
| ------------------------------------------ | ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `POSTGRES_URL`                             | Yes              | Connection string.                                                                                                                                                |
| `JWT_SECRET`                               | Yes              | A long random string. Changing it signs every admin out.                                                                                                          |
| `JWT_EXPIRES_IN`                           | No               | Admin token lifetime, default `7d`.                                                                                                                               |
| `ADMIN_PASSWORD`                           | Yes, first start | Password for the `admin` user, created only when the database has no users. Without it, a built-in default is used, so set it and change the password afterwards. |
| `PORT`                                     | No               | Default `5120`.                                                                                                                                                   |
| `NODE_ENV`                                 | No               | The Docker image sets `production`.                                                                                                                               |
| `POSTGRES_ALLOW_SELF_SIGNED_CERTIFICATES`  | No               | `true` connects to the database over TLS without checking its certificate.                                                                                        |
| `POSTGRES_CA_CERT`                         | No               | Base64-encoded CA certificate (`base64 -w0 ca-certificate.crt`): connects over TLS and checks the certificate. Overrides the setting above.                       |
| `S3_BUCKET`                                | Yes              | Bucket for uploaded images and images downloaded during the Kotahi sync. It can be private: the CMS serves the files itself at `/uploads`.                        |
| `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` | Yes              | Credentials that can read and write the bucket.                                                                                                                   |
| `S3_URL`                                   | Unless AWS       | The S3 endpoint, for example `https://ams3.digitaloceanspaces.com` or `http://minio:9000`. Leave it unset for AWS.                                                |
| `S3_REGION`                                | No               | Default `us-east-1`.                                                                                                                                              |

The server won't start without `POSTGRES_URL` or the S3 bucket and
credentials.

## Docker

Deploy the image built from the `Dockerfile`. It builds on
`node:26-trixie-slim`, installs dependencies, builds the client and server, and
runs `yarn start:prod`, which applies pending migrations before starting.
`.dockerignore` keeps `.env` and local build output out of the image.

```bash
docker build -t kotahi-cms .
```

Run it on any container platform, with the variables above set as
environment variables or platform secrets, and port `5120` exposed. No volume
is needed: files go to S3.

`docker-compose.yml` is for local development: it runs `yarn dev` with the
source mounted, its own database and MinIO.

## Without Docker

```bash
corepack enable
yarn install --immutable
yarn build
```

```bash
yarn start:prod
```

Run it under a process manager (systemd, PM2) so it restarts on failure and on
boot.

## Reverse proxy

Put the app behind a proxy that terminates TLS, for example nginx:

```nginx
server {
    listen 443 ssl;
    server_name cms.example.org;

    # Bug reports carry screenshots; the app accepts JSON bodies up to 50 MB.
    client_max_body_size 50m;

    location / {
        proxy_pass http://localhost:5120;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## After deploying

1. Open the site and sign in at `/login` as `admin`.
2. Change the admin password under Admin → User Management.
3. Under Admin → Manage Groups, add a group: enter the Kotahi endpoint, check
   it, and choose the Kotahi group.
4. In the group's settings, fill in its website details and look.
5. Under the group's Publications, press Refresh Publications and check that
   publications and their reviews appear on its site, at `/<slug>`.

## Updating

Pull or build the new version and restart. `yarn start:prod` applies any new
migrations on start-up.

## Troubleshooting

- **The container exits on start-up**: check the logs (`docker logs
kotahi-cms`). A missing `POSTGRES_URL` or an unreachable database stops the
  server before it listens.
- **`relation "…" already exists`**: the database has tables from a migration
  history that no longer matches `migrations/`, for example after migrations
  were squashed. Use a fresh database.
- **The sync fails**: check the endpoint and Kotahi group under the group's
  Settings → API. The error message from Kotahi is shown in the toast.
- **A group's site shows "Page not found"**: the group is inactive (only
  admins can see it) or the slug is wrong; check Admin → Manage Groups.
