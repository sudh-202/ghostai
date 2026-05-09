import { get } from "@vercel/blob"
import { auth } from "@clerk/nextjs/server"

import { getCurrentIdentity, getProjectAccess } from "@/lib/project-access"
import { getProjectSpecFilename } from "@/lib/project-specs"
import { prisma } from "@/lib/prisma"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ projectId: string; specId: string }> }
) {
  const { userId } = await auth()
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const { projectId, specId } = await params
    const identity = await getCurrentIdentity()
    if (!identity) return Response.json({ error: "Unauthorized" }, { status: 401 })

    const access = await getProjectAccess(projectId, identity.userId, identity.email)
    if (!access.exists) return Response.json({ error: "Not found" }, { status: 404 })
    if (!access.hasAccess) return Response.json({ error: "Forbidden" }, { status: 403 })

    const spec = await prisma.projectSpec.findFirst({
      where: { id: specId, projectId },
      select: { id: true, filePath: true, createdAt: true },
    })

    if (!spec) return Response.json({ error: "Not found" }, { status: 404 })

    const blobResult = await get(spec.filePath, { access: "private" })
    if (!blobResult || blobResult.statusCode !== 200) {
      return Response.json({ error: "Spec file not available" }, { status: 404 })
    }

    const content = await new Response(blobResult.stream).text()

    return Response.json({
      spec: {
        id: spec.id,
        filename: getProjectSpecFilename(spec.filePath),
        createdAt: spec.createdAt.toISOString(),
        content,
      },
    })
  } catch (error) {
    console.error("Failed to load spec:", error)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
