import { prisma } from "./prisma"

export type ProjectListItem = {
  id: string
  name: string
}

export async function getOwnedProjects(userId: string): Promise<ProjectListItem[]> {
  return prisma.project.findMany({
    where: { ownerId: userId },
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true },
  })
}

export async function getSharedProjects(email: string): Promise<ProjectListItem[]> {
  if (!email) return []
  const rows = await prisma.projectCollaborator.findMany({
    where: { email },
    include: { project: { select: { id: true, name: true } } },
    orderBy: { createdAt: "desc" },
  })
  return rows.map((r) => r.project)
}
