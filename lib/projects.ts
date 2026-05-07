import { prisma } from "./prisma"
import { normalizeEmail } from "./project-access"

export type ProjectListItem = {
  id: string
  name: string
}

export async function getOwnedProjects(userId: string): Promise<ProjectListItem[]> {
  if (typeof userId !== "string" || userId.trim().length === 0) {
    throw new Error("Invalid userId: must be a non-empty string")
  }
  
  return prisma.project.findMany({
    where: { ownerId: userId },
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true },
  })
}

export async function getSharedProjects(email: string): Promise<ProjectListItem[]> {
  if (!email) return []
  const rows = await prisma.projectCollaborator.findMany({
    where: { email: normalizeEmail(email) },
    include: { project: { select: { id: true, name: true } } },
    orderBy: { createdAt: "desc" },
  })
  return rows.map((r) => r.project)
}
