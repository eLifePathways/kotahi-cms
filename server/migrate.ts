// Must run before importing './db', which reads process.env.POSTGRES_URL at
// module load time.
import 'dotenv/config'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import { db, client } from './db'

async function main() {
  console.log('Applying pending migrations...')
  await migrate(db, { migrationsFolder: 'migrations' })

  console.log('Migrations up to date.')
  await client.end()
}

main().catch(error => {
  console.error('Migration failed:', error)
  process.exit(1)
})
