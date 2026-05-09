import { del, get, put } from "@vercel/blob"
import { auth } from "@clerk/nextjs/server"

import { getCurrentIdentity } from "@/lib/project-access"
import { getProjectAccess } from "@/lib/project-access"
import { prisma } from "@/lib/prisma"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { userId } = await auth()
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const { projectId } = await params
    const identity = await getCurrentIdentity()
    if (!identity) return Response.json({ error: "Unauthorized" }, { status: 401 })

    const access = await getProjectAccess(projectId, identity.userId, identity.email)
    if (!access.hasAccess) return Response.json({ error: "Forbidden" }, { status: 403 })
    if (!access.exists) return Response.json({ error: "Not found" }, { status: 404 })

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { canvasBlobUrl: true },
    })

    if (!project?.canvasBlobUrl) {
      return Response.json({ nodes: [], edges: [] })
    }

    const blobResult = await get(project.canvasBlobUrl, { access: "private" })
    if (!blobResult || blobResult.statusCode !== 200) {
      return Response.json({ nodes: [], edges: [] })
    }

    const canvasData = await new Response(blobResult.stream).json()
    return Response.json(canvasData)
  } catch (error) {
    console.error("Failed to load canvas:", error)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { userId } = await auth()
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const { projectId } = await params
    const identity = await getCurrentIdentity()
    if (!identity) return Response.json({ error: "Unauthorized" }, { status: 401 })

    const access = await getProjectAccess(projectId, identity.userId, identity.email)
    if (!access.hasAccess) return Response.json({ error: "Forbidden" }, { status: 403 })
    if (!access.exists) return Response.json({ error: "Not found" }, { status: 404 })

    const body = await request.json().catch(() => null)
    if (!body) return Response.json({ error: "Invalid body" }, { status: 400 })

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { canvasBlobUrl: true },
    })

    if (project?.canvasBlobUrl) {
      await del(project.canvasBlobUrl).catch(() => {})
    }

    const blob = await put(`canvas/${projectId}.json`, JSON.stringify(body), {
      access: "private",
      contentType: "application/json",
      addRandomSuffix: false,
      allowOverwrite: true,
    })

    await prisma.project.update({
      where: { id: projectId },
      data: { canvasBlobUrl: blob.url },
    })

    return Response.json({ url: blob.url })
  } catch (error) {
    console.error("Failed to save canvas:", error)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
