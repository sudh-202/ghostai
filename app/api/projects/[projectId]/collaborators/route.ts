import {
  getCurrentIdentity,
  getProjectAccess,
  normalizeEmail,
} from "@/lib/project-access"
import {
  inviteProjectCollaborator,
  listProjectAccessMembers,
} from "@/lib/project-collaborators"

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const identity = await getCurrentIdentity()
  if (!identity) return Response.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const { projectId } = await params
    const access = await getProjectAccess(projectId, identity.userId, identity.email)

    if (!access.exists) return Response.json({ error: "Not found" }, { status: 404 })
    if (!access.hasAccess) return Response.json({ error: "Forbidden" }, { status: 403 })

    const members = await listProjectAccessMembers(projectId)
    return Response.json({ members })
  } catch (error) {
    console.error("Failed to list collaborators:", error)
    return Response.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    )
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const identity = await getCurrentIdentity()
  if (!identity) return Response.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const { projectId } = await params
    const access = await getProjectAccess(projectId, identity.userId, identity.email)

    if (!access.exists) return Response.json({ error: "Not found" }, { status: 404 })
    if (!access.isOwner) return Response.json({ error: "Forbidden" }, { status: 403 })

    const body = await request.json().catch(() => ({}))
    const email = typeof body?.email === "string" ? normalizeEmail(body.email) : ""

    if (!EMAIL_PATTERN.test(email)) {
      return Response.json({ error: "Enter a valid email address." }, { status: 400 })
    }

    const normalizedIdentityEmail = normalizeEmail(identity.email)
    if (email === normalizedIdentityEmail) {
      return Response.json(
        { error: "The project owner already has access." },
        { status: 400 }
      )
    }

    try {
      await inviteProjectCollaborator(projectId, email)
      return Response.json({ ok: true }, { status: 201 })
    } catch (inviteError) {
      console.error("Failed to invite collaborator:", inviteError)
      return Response.json({ error: "Unable to invite collaborator." }, { status: 409 })
    }
  } catch (error) {
    console.error("Failed to process invitation:", error)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
