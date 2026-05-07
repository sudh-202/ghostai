import { auth, currentUser } from "@clerk/nextjs/server"

import { prisma } from "./prisma"

export type CurrentIdentity = {
  userId: string
  email: string
}

export type ProjectAccess = {
  exists: boolean
  hasAccess: boolean
  isOwner: boolean
  project: { id: string; name: string } | null
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

export async function getCurrentIdentity(): Promise<CurrentIdentity | null> {
  const { userId } = await auth()
  if (!userId) return null
  const user = await currentUser()
  const email = normalizeEmail(user?.primaryEmailAddress?.emailAddress ?? "")
  if (!email) return null
  return { userId, email }
}

export async function getProjectAccess(
  projectId: string,
  userId: string,
  email: string
): Promise<ProjectAccess> {
  try {
    const normalizedEmail = normalizeEmail(email)
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: {
        id: true,
        name: true,
        ownerId: true,
        collaborators: {
          where: { email: normalizedEmail },
          select: { id: true },
        },
      },
    })

    if (!project) {
      return {
        exists: false,
        hasAccess: false,
        isOwner: false,
        project: null,
      }
    }

    const isOwner = project.ownerId === userId
    const hasAccess = isOwner || project.collaborators.length > 0

    return {
      exists: true,
      hasAccess,
      isOwner,
      project: hasAccess ? { id: project.id, name: project.name } : null,
    }
  } catch (error) {
    console.error("Error checking project access:", error)
    throw new Error(
      `Failed to check project access: ${error instanceof Error ? error.message : "Unknown error"}`
    )
  }
}

export async function getProjectWithAccess(
  projectId: string,
  userId: string,
  email: string
): Promise<{ id: string; name: string; isOwner: boolean } | null> {
  const access = await getProjectAccess(projectId, userId, email)
  if (!access.project || !access.hasAccess) return null

  return {
    ...access.project,
    isOwner: access.isOwner,
  }
}
