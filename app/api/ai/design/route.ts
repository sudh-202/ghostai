import { auth } from "@clerk/nextjs/server"
import { tasks } from "@trigger.dev/sdk/v3"

import { DESIGN_AGENT_TASK_ID, type DesignAgentPayload } from "@/lib/design-agent"
import { getCurrentIdentity, getProjectAccess } from "@/lib/project-access"
import { prisma } from "@/lib/prisma"

type DesignRequestBody = DesignAgentPayload & {
  projectId: string
}

function parseDesignRequestBody(body: unknown): DesignRequestBody | null {
  if (!body || typeof body !== "object") return null

  const payload = body as Record<string, unknown>

  const prompt = typeof payload.prompt === "string" ? payload.prompt.trim() : ""
  const roomId = typeof payload.roomId === "string" ? payload.roomId.trim() : ""
  const projectId = typeof payload.projectId === "string" ? payload.projectId.trim() : ""

  if (!prompt || !roomId || !projectId) return null

  return { prompt, roomId, projectId }
}

export async function POST(request: Request) {
  const { userId } = await auth()
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const identity = await getCurrentIdentity()
    if (!identity) return Response.json({ error: "Unauthorized" }, { status: 401 })

    const body = parseDesignRequestBody(await request.json().catch(() => null))
    if (!body) {
      return Response.json(
        { error: "Prompt, roomId, and projectId are required" },
        { status: 400 }
      )
    }

    if (body.roomId !== body.projectId) {
      return Response.json(
        { error: "roomId must match projectId" },
        { status: 400 }
      )
    }

    const access = await getProjectAccess(body.projectId, identity.userId, identity.email)
    if (!access.exists) return Response.json({ error: "Not found" }, { status: 404 })
    if (!access.hasAccess) return Response.json({ error: "Forbidden" }, { status: 403 })

    const handle = await tasks.trigger(DESIGN_AGENT_TASK_ID, {
      prompt: body.prompt,
      roomId: body.roomId,
    } satisfies DesignAgentPayload, {
      tags: [`project:${body.projectId}`, `room:${body.roomId}`, `user:${identity.userId}`],
      metadata: {
        projectId: body.projectId,
        roomId: body.roomId,
        requestedBy: identity.userId,
      },
    })

    await prisma.taskRun.create({
      data: {
        runId: handle.id,
        projectId: body.projectId,
        userId: identity.userId,
      },
    })

    return Response.json({ runId: handle.id }, { status: 201 })
  } catch (error) {
    console.error("Failed to trigger design agent:", error)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
