import { auth } from "@clerk/nextjs/server"
import { tasks } from "@trigger.dev/sdk/v3"

import { GENERATE_SPEC_TASK_ID } from "@/lib/design-agent"
import { getCurrentIdentity, getProjectAccess } from "@/lib/project-access"
import { prisma } from "@/lib/prisma"
import type { GenerateSpecPayload } from "@/trigger/generate-spec"

type SpecRequestBody = {
  roomId: string
  chatHistory: GenerateSpecPayload["chatHistory"]
  nodes: GenerateSpecPayload["nodes"]
  edges: GenerateSpecPayload["edges"]
}

function parseSpecRequestBody(body: unknown): SpecRequestBody | null {
  if (!body || typeof body !== "object") return null
  const payload = body as Record<string, unknown>

  const roomId = typeof payload.roomId === "string" ? payload.roomId.trim() : ""
  if (!roomId) return null

  const chatHistory = Array.isArray(payload.chatHistory) ? payload.chatHistory : []
  const nodes = Array.isArray(payload.nodes) ? payload.nodes : []
  const edges = Array.isArray(payload.edges) ? payload.edges : []

  return { roomId, chatHistory, nodes, edges }
}

export async function POST(request: Request) {
  const { userId } = await auth()
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const identity = await getCurrentIdentity()
    if (!identity) return Response.json({ error: "Unauthorized" }, { status: 401 })

    const body = parseSpecRequestBody(await request.json().catch(() => null))
    if (!body) {
      return Response.json({ error: "roomId is required" }, { status: 400 })
    }

    // roomId is the project ID — never trust a client-supplied projectId
    const projectId = body.roomId
    const access = await getProjectAccess(projectId, identity.userId, identity.email)
    if (!access.exists) return Response.json({ error: "Not found" }, { status: 404 })
    if (!access.hasAccess) return Response.json({ error: "Forbidden" }, { status: 403 })

    const handle = await tasks.trigger(
      GENERATE_SPEC_TASK_ID,
      {
        projectId,
        roomId: body.roomId,
        chatHistory: body.chatHistory,
        nodes: body.nodes,
        edges: body.edges,
      } satisfies GenerateSpecPayload,
      {
        tags: [`project:${projectId}`, `room:${body.roomId}`, `user:${identity.userId}`],
        metadata: {
          projectId,
          roomId: body.roomId,
          requestedBy: identity.userId,
        },
      }
    )

    await prisma.taskRun.create({
      data: {
        runId: handle.id,
        projectId,
        userId: identity.userId,
      },
    })

    return Response.json({ runId: handle.id }, { status: 201 })
  } catch (error) {
    console.error("Failed to trigger spec generation:", error)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
