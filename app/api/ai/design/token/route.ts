import { auth } from "@clerk/nextjs/server"
import { auth as triggerAuth } from "@trigger.dev/sdk/v3"

import { DESIGN_AGENT_TOKEN_TTL } from "@/lib/design-agent"
import { prisma } from "@/lib/prisma"

type TokenRequestBody = {
  runId: string
}

function parseTokenRequestBody(body: unknown): TokenRequestBody | null {
  if (!body || typeof body !== "object") return null

  const payload = body as Record<string, unknown>

  const runId = typeof payload.runId === "string" ? payload.runId.trim() : ""
  if (!runId) return null

  return { runId }
}

export async function POST(request: Request) {
  const { userId } = await auth()
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const body = parseTokenRequestBody(await request.json().catch(() => null))
    if (!body) {
      return Response.json({ error: "runId is required" }, { status: 400 })
    }

    const taskRun = await prisma.taskRun.findFirst({
      where: {
        runId: body.runId,
        userId,
      },
      select: {
        runId: true,
      },
    })

    if (!taskRun) {
      return Response.json({ error: "Not found" }, { status: 404 })
    }

    const token = await triggerAuth.createPublicToken({
      scopes: {
        read: {
          runs: [taskRun.runId],
        },
      },
      expirationTime: DESIGN_AGENT_TOKEN_TTL,
    })

    return Response.json({ token })
  } catch (error) {
    console.error("Failed to create design token:", error)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
