import { auth } from "@clerk/nextjs/server"

import { getCurrentIdentity, getProjectAccess } from "@/lib/project-access"
import { getProjectSpecFilename } from "@/lib/project-specs"
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
    if (!access.exists) return Response.json({ error: "Not found" }, { status: 404 })
    if (!access.hasAccess) return Response.json({ error: "Forbidden" }, { status: 403 })

    const specs = await prisma.projectSpec.findMany({
      where: { projectId },
      select: { id: true, filePath: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    })

    return Response.json({
      specs: specs.map((s) => ({
        id: s.id,
        filename: getProjectSpecFilename(s.filePath),
        createdAt: s.createdAt.toISOString(),
      })),
    })
  } catch (error) {
    console.error("Failed to list specs:", error)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
