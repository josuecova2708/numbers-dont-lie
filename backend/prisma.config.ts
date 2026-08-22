import { defineConfig } from 'prisma/config';
import { config } from 'dotenv';

// Load .env variables
config();

export default defineConfig({
  datasource: {
    url: process.env.DATABASE_URL,
  },
});
