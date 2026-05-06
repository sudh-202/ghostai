import { PrismaClient } from "@/app/generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined }

function createPrismaClient(): PrismaClient {
  const url = process.env.DATABASE_URL ?? ""

  if (url.startsWith("prisma+postgres:/")) {
    // Accelerate requires @prisma/extension-accelerate — install it and wire the
    // withAccelerate() extension here when switching to an Accelerate URL.
    throw new Error(
      "Accelerate URLs (prisma+postgres://) require @prisma/extension-accelerate. " +
        "Install the package and update lib/prisma.ts to use withAccelerate()."
    )
  }

  const adapter = new PrismaPg({ connectionString: url })
  return new PrismaClient({ adapter })
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma
}
