import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const databaseUrl = process.env.DATABASE_URL;

let prisma: PrismaClient;

if (process.env.NODE_ENV === "production") {
  const url = databaseUrl || "postgresql://postgres:postgres@localhost:5432/errornest?sslmode=disable";
  const adapter = new PrismaNeon({ connectionString: url });
  prisma = new PrismaClient({ adapter });
} else {
  if (!globalForPrisma.prisma) {
    const url =
      databaseUrl || "postgresql://postgres:postgres@localhost:5432/errornest?sslmode=disable";
    const adapter = new PrismaNeon({ connectionString: url });
    globalForPrisma.prisma = new PrismaClient({ adapter });
  }
  prisma = globalForPrisma.prisma;
}

export const db = prisma;
