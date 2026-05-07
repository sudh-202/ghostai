import { auth } from "@clerk/nextjs/server"

import { prisma } from "@/lib/prisma"

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { userId } = await auth()
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const { projectId } = await params
    const project = await prisma.project.findUnique({ where: { id: projectId } })

    if (!project) return Response.json({ error: "Not found" }, { status: 404 })
    if (project.ownerId !== userId) return Response.json({ error: "Forbidden" }, { status: 403 })

    const body = await request.json().catch(() => ({}))
    
    if ("name" in body) {
      const nameValue = body.name
      if (typeof nameValue !== "string" || nameValue.trim() === "") {
        return Response.json({ error: "Project name must be a non-empty string" }, { status: 400 })
      }
      const name = nameValue.trim()
      if (name === project.name) {
        return Response.json(project)
      }
      
      const updated = await prisma.project.update({
        where: { id: projectId },
        data: { name },
      })
      return Response.json(updated)
    }

    return Response.json(project)
  } catch (error) {
    console.error("Failed to update project:", error)
    if (error instanceof Error && error.message.includes("P2025")) {
      return Response.json({ error: "Project not found" }, { status: 404 })
    }
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { userId } = await auth()
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const { projectId } = await params
    const project = await prisma.project.findUnique({ where: { id: projectId } })

    if (!project) return Response.json({ error: "Not found" }, { status: 404 })
    if (project.ownerId !== userId) return Response.json({ error: "Forbidden" }, { status: 403 })

    await prisma.project.delete({ where: { id: projectId } })

    return new Response(null, { status: 204 })
  } catch (error) {
    console.error("Failed to delete project:", error)
    if (error instanceof Error && error.message.includes("P2025")) {
      return Response.json({ error: "Project not found" }, { status: 404 })
    }
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
