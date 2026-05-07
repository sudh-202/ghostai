import { clerkClient } from "@clerk/nextjs/server"

import { prisma } from "@/lib/prisma"
import { normalizeEmail } from "@/lib/project-access"

export type CollaboratorListItem = {
  id: string
  email: string
  displayName: string | null
  avatarUrl: string | null
}

export type ProjectAccessMember = {
  id: string
  email: string | null
  displayName: string | null
  avatarUrl: string | null
  role: "owner" | "collaborator"
}

function getDisplayName(user: {
  firstName: string | null
  lastName: string | null
  username: string | null
}): string | null {
  const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ").trim()
  if (fullName) return fullName
  if (user.username) return user.username
  return null
}

async function getProfilesByEmail(
  emails: string[]
): Promise<Map<string, { displayName: string | null; avatarUrl: string | null }>> {
  if (emails.length === 0) return new Map()
  const uniqueEmails = [...new Set(emails.map((email) => normalizeEmail(email)))]

  try {
    const client = await clerkClient()
    const profiles = new Map<
      string,
      { displayName: string | null; avatarUrl: string | null }
    >()

    // Clerk has a limit of 100 emails per filter and limit must be 1-500
    // Chunk emails into groups of 100
    const chunkSize = 100
    for (let i = 0; i < uniqueEmails.length; i += chunkSize) {
      const chunk = uniqueEmails.slice(i, i + chunkSize)
      try {
        const response = await client.users.getUserList({
          emailAddress: chunk,
          limit: Math.min(500, chunk.length),
        })

        for (const user of response.data) {
          const profile = {
            displayName: getDisplayName(user),
            avatarUrl: user.imageUrl ?? null,
          }

          for (const address of user.emailAddresses) {
            profiles.set(normalizeEmail(address.emailAddress), profile)
          }
        }
      } catch (chunkError) {
        console.error("Failed to fetch profiles for email chunk:", chunkError)
      }
    }

    return profiles
  } catch (error) {
    console.error("Failed to fetch profiles:", error)
    return new Map()
  }
}

async function getProfileByUserId(userId: string): Promise<{
  email: string | null
  displayName: string | null
  avatarUrl: string | null
}> {
  try {
    const client = await clerkClient()
    const user = await client.users.getUser(userId)

    return {
      email: user.primaryEmailAddress?.emailAddress
        ? normalizeEmail(user.primaryEmailAddress.emailAddress)
        : null,
      displayName: getDisplayName(user),
      avatarUrl: user.imageUrl ?? null,
    }
  } catch {
    return {
      email: null,
      displayName: null,
      avatarUrl: null,
    }
  }
}

export async function listProjectCollaborators(
  projectId: string
): Promise<CollaboratorListItem[]> {
  const rows = await prisma.projectCollaborator.findMany({
    where: { projectId },
    orderBy: [{ createdAt: "asc" }, { email: "asc" }],
    select: {
      id: true,
      email: true,
    },
  })

  const profilesByEmail = await getProfilesByEmail(rows.map((row) => row.email))

  return rows.map((row) => {
    const profile = profilesByEmail.get(row.email)

    return {
      id: row.id,
      email: row.email,
      displayName: profile?.displayName ?? null,
      avatarUrl: profile?.avatarUrl ?? null,
    }
  })
}

export async function listProjectAccessMembers(
  projectId: string
): Promise<ProjectAccessMember[]> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: {
      ownerId: true,
      collaborators: {
        orderBy: [{ createdAt: "asc" }, { email: "asc" }],
        select: {
          id: true,
          email: true,
        },
      },
    },
  })

  if (!project) return []

  const [ownerProfile, collaboratorProfiles] = await Promise.all([
    getProfileByUserId(project.ownerId),
    getProfilesByEmail(project.collaborators.map((row) => row.email)),
  ])

  const owner: ProjectAccessMember = {
    id: `owner:${project.ownerId}`,
    email: ownerProfile.email,
    displayName: ownerProfile.displayName ?? "Project owner",
    avatarUrl: ownerProfile.avatarUrl,
    role: "owner",
  }

  const collaborators: ProjectAccessMember[] = project.collaborators.map((row) => {
    const profile = collaboratorProfiles.get(row.email)

    return {
      id: row.id,
      email: row.email,
      displayName: profile?.displayName ?? null,
      avatarUrl: profile?.avatarUrl ?? null,
      role: "collaborator",
    }
  })

  return [owner, ...collaborators]
}

export async function inviteProjectCollaborator(projectId: string, email: string) {
  const normalizedEmail = normalizeEmail(email)
  
  // Validate email format
  if (!normalizedEmail || !normalizedEmail.includes("@") || !normalizedEmail.includes(".")) {
    throw new Error("Invalid email address")
  }
  
  return prisma.projectCollaborator.upsert({
    where: {
      projectId_email: {
        projectId,
        email: normalizedEmail,
      },
    },
    update: {},
    create: {
      projectId,
      email: normalizedEmail,
    },
  })
}

export async function removeProjectCollaborator(
  projectId: string,
  collaboratorId: string
): Promise<boolean> {
  const result = await prisma.projectCollaborator.deleteMany({
    where: {
      id: collaboratorId,
      projectId,
    },
  })

  return result.count > 0
}
