import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from '../shared/schema'
import { getPostgresSsl } from './db-ssl'

const connectionString = process.env.POSTGRES_URL

if (!connectionString) {
  throw new Error('POSTGRES_URL is not set; a database is required to start')
}

// Create PostgreSQL client
export const client = postgres(connectionString, {
  ssl: getPostgresSsl(),
  // Suppress informational NOTICE logs (e.g. "IF NOT EXISTS ... skipping"
  // emitted by migrations); they are not errors.
  onnotice: () => {},
})

// Create Drizzle ORM instance
export const db = drizzle(client, { schema })

// Check the database is reachable; throws if it is not.
export async function initDatabase() {
  await client`SELECT 1`
  console.log('Database connection successful')
}
