import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'sqlite',
  schema: './src/lib/schema/index.ts',
  out: './drizzle',
  dbCredentials: {
    url: process.env.CPE_DATABASE_PATH || './data/cpe-monitor.db',
  },
});
