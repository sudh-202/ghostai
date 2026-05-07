import { currentUser } from "@clerk/nextjs/server"

import { getLiveblocks, getCursorColorForUser } from "@/lib/liveblocks"
import { getCurrentIdentity, getProjectAccess } from "@/lib/project-access"

function getDisplayName(user: Awaited<ReturnType<typeof currentUser>>) {
  const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim()

  if (fullName) return fullName
  if (user?.username) return user.username
  if (user?.primaryEmailAddress?.emailAddress) {
    return user.primaryEmailAddress.emailAddress
  }

  return "Ghost AI User"
}

function getAvatarUrl(user: Awaited<ReturnType<typeof currentUser>>) {
  return user?.imageUrl ?? ""
}

export async function POST(request: Request) {
  const identity = await getCurrentIdentity()
  if (!identity) return Response.json({ error: "Unauthorized" }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const projectId =
    typeof body?.projectId === "string" && body.projectId.trim()
      ? body.projectId.trim()
      : ""

  if (!projectId) {
    return Response.json({ error: "Project ID is required." }, { status: 400 })
  }

  const access = await getProjectAccess(projectId, identity.userId, identity.email)
  if (!access.hasAccess) {
    return Response.json({ error: "Forbidden" }, { status: 403 })
  }

  const user = await currentUser()
  const displayName = getDisplayName(user)
  const avatarUrl = getAvatarUrl(user)
  const cursorColor = getCursorColorForUser(identity.userId)

  const liveblocks = getLiveblocks()

  await liveblocks.getOrCreateRoom(projectId, {
    defaultAccesses: [],
    metadata: {
      projectId,
    },
  })

  const session = liveblocks.prepareSession(identity.userId, {
    userInfo: {
      displayName,
      avatarUrl,
      cursorColor,
    },
  })

  session.allow(projectId, session.FULL_ACCESS)

  const { body: responseBody, status } = await session.authorize()

  return new Response(responseBody, {
    status,
    headers: {
      "Content-Type": "application/json",
    },
  })
}
