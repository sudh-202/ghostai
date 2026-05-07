import { auth } from "@clerk/nextjs/server"

import { prisma } from "@/lib/prisma"

export async function GET() {
  const { userId } = await auth()
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const projects = await prisma.project.findMany({
      where: { ownerId: userId },
      orderBy: { createdAt: "desc" },
    })
    return Response.json(projects)
  } catch (error) {
    console.error("Failed to fetch projects:", error)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}

const MAX_PROJECT_NAME_LENGTH = 255

export async function POST(request: Request) {
  const { userId } = await auth()
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const body = await request.json().catch(() => ({}))
    const rawName = typeof body?.name === "string" ? body.name.trim() : ""
    
    if (!rawName) {
      return Response.json(
        { error: "Project name is required" },
        { status: 400 }
      )
    }
    
    if (rawName.length > MAX_PROJECT_NAME_LENGTH) {
      return Response.json(
        { error: `Project name must be ${MAX_PROJECT_NAME_LENGTH} characters or less` },
        { status: 400 }
      )
    }
    
    const name = rawName

    const project = await prisma.project.create({
      data: { ownerId: userId, name },
    })

    return Response.json(project, { status: 201 })
  } catch (error) {
    console.error("Failed to create project:", error)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
