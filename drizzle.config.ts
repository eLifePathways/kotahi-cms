import { defineConfig } from 'drizzle-kit'

if (!process.env.POSTGRES_URL) {
  throw new Error('POSTGRES_URL, ensure the database is provisioned')
}

export default defineConfig({
  out: './migrations',
  schema: './shared/schema.ts',
  schemaFilter: ['public'],
  strict: true,
  dialect: 'postgresql',
  migrations: {
    prefix: 'timestamp',
  },
  dbCredentials: {
    url: process.env.POSTGRES_URL,
  },
})
