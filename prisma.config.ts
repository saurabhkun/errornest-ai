import { defineConfig } from "prisma/config";

try {
  process.loadEnvFile();
} catch {
  // Ignore error if .env doesn't exist
}

export default defineConfig({
  schema: "./prisma/schema.prisma",
  datasource: {
    url: process.env.DATABASE_URL,
  },
  migrations: {
    seed: "npx tsx prisma/seed.ts",
  },
});
