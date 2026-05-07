import { getCurrentIdentity, getProjectAccess } from "@/lib/project-access"
import { removeProjectCollaborator } from "@/lib/project-collaborators"

export async function DELETE(
  _request: Request,
  {
    params,
  }: {
    params: Promise<{ projectId: string; collaboratorId: string }>
  }
) {
  const identity = await getCurrentIdentity()
  if (!identity) return Response.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const { projectId, collaboratorId } = await params
    const access = await getProjectAccess(projectId, identity.userId, identity.email)

    if (!access.exists) return Response.json({ error: "Not found" }, { status: 404 })
    if (!access.isOwner) return Response.json({ error: "Forbidden" }, { status: 403 })

    const removed = await removeProjectCollaborator(projectId, collaboratorId)
    if (!removed) return Response.json({ error: "Not found" }, { status: 404 })

    return new Response(null, { status: 204 })
  } catch (error) {
    console.error("Failed to remove collaborator:", error)
    return Response.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    )
  }
}
