import { PrismaClient } from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined }

function createPrismaClient(): PrismaClient {
  const url = process.env.DATABASE_URL
  
  if (!url) {
    throw new Error(
      "DATABASE_URL environment variable is not set. Please configure your database connection."
    )
  }

  if (url.startsWith("prisma+postgres:/")) {
    // TODO: Enable Accelerate when extension is installed
    // Currently requires installing @prisma/extension-accelerate
    console.warn(
      "Accelerate URL detected (prisma+postgres://). Install @prisma/extension-accelerate to use it."
    )
    // For now, continue with direct adapter
  }

  const adapter = new PrismaPg({ connectionString: url })
  return new PrismaClient({ adapter })
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma
}
