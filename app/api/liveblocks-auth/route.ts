import { currentUser } from "@clerk/nextjs/server"

import { getLiveblocks, getCursorColorForUser } from "@/lib/liveblocks"
import { getCurrentIdentity, getProjectAccess } from "@/lib/project-access"
import { AI_CHAT_FEED_ID, AI_STATUS_FEED_ID } from "@/types/tasks"

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

async function ensureProjectFeeds(projectId: string) {
  const liveblocks = getLiveblocks()

  const feeds = [
    { feedId: AI_STATUS_FEED_ID, channel: AI_STATUS_FEED_ID, task: "design" as const },
    { feedId: AI_CHAT_FEED_ID, channel: AI_CHAT_FEED_ID },
  ]

  await Promise.all(
    feeds.map(async ({ feedId, channel, task }) => {
      try {
        await liveblocks.getFeed({ roomId: projectId, feedId })
      } catch (error) {
        const status =
          typeof error === "object" && error && "status" in error ? error.status : null
        if (status !== 404) return
        await liveblocks.createFeed({
          roomId: projectId,
          feedId,
          metadata: { channel, ...(task ? { task } : {}) },
        })
      }
    })
  )
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

  await ensureProjectFeeds(projectId)

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
