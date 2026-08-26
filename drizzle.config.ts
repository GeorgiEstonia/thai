import { config } from 'dotenv'
import { defineConfig } from 'drizzle-kit'

// Read the same files Next does, in the same precedence order, so the CLI and
// the app never disagree about which database they're pointing at.
config({ path: '.env.local' })
config({ path: '.env' })

export default defineConfig({
  schema: './src/lib/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
})
