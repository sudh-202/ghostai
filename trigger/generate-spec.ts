import { createGoogleGenerativeAI } from "@ai-sdk/google"
import { put } from "@vercel/blob"
import { generateText } from "ai"
import { schemaTask, metadata } from "@trigger.dev/sdk/v3"
import { z } from "zod"

import { GENERATE_SPEC_TASK_ID } from "../lib/design-agent"
import { prisma } from "../lib/prisma"

const google = createGoogleGenerativeAI({
  apiKey:
    process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_AI_API_KEY,
})

const chatMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(8000),
})

const nodeSchema = z.object({
  id: z.string(),
  label: z.string(),
  shape: z.string(),
  colorThemeId: z.string().optional(),
})

const edgeSchema = z.object({
  id: z.string(),
  source: z.string(),
  target: z.string(),
  label: z.string().optional(),
})

const generateSpecPayloadSchema = z.object({
  projectId: z.string().min(1),
  roomId: z.string().min(1),
  chatHistory: z.array(chatMessageSchema).max(100),
  nodes: z.array(nodeSchema).max(200),
  edges: z.array(edgeSchema).max(500),
})

export type GenerateSpecPayload = z.infer<typeof generateSpecPayloadSchema>

function buildSpecPrompt(payload: GenerateSpecPayload): string {
  const nodeList =
    payload.nodes.length > 0
      ? payload.nodes
          .map((n) => `- **${n.label}** (${n.shape}) [id: ${n.id}]`)
          .join("\n")
      : "No nodes on canvas."

  const edgeList =
    payload.edges.length > 0
      ? payload.edges
          .map((e) => {
            const srcLabel =
              payload.nodes.find((n) => n.id === e.source)?.label ?? e.source
            const tgtLabel =
              payload.nodes.find((n) => n.id === e.target)?.label ?? e.target
            return `- **${srcLabel}** → **${tgtLabel}**${e.label ? ` (${e.label})` : ""}`
          })
          .join("\n")
      : "No connections defined."

  const chatSection =
    payload.chatHistory.length > 0
      ? payload.chatHistory
          .map((m) => `**${m.role === "user" ? "User" : "Ghost AI"}:** ${m.content}`)
          .join("\n\n")
      : "No conversation history."

  return `You are a senior software architect writing a technical specification document.

Using the architecture diagram and conversation history below, produce a comprehensive Markdown technical specification. The spec should include:

1. **Overview** – one paragraph summary of the system and its purpose
2. **Components** – a section for each node in the diagram, describing its role, responsibilities, and technology choices
3. **Communication & Data Flow** – how components interact based on the edges
4. **Deployment Considerations** – scaling, availability, and infrastructure notes derived from the architecture
5. **Open Questions** – unresolved design decisions or gaps not answered by the conversation

Keep the tone technical and precise. Write for a senior engineering audience.

---

## Architecture Diagram

### Components
${nodeList}

### Connections
${edgeList}

---

## Conversation History

${chatSection}

---

Produce the full Markdown specification now:`
}

export const generateSpec = schemaTask({
  id: GENERATE_SPEC_TASK_ID,
  schema: generateSpecPayloadSchema,
  retry: {
    maxAttempts: 3,
    minTimeoutInMs: 2000,
    maxTimeoutInMs: 30_000,
    factor: 2,
    randomize: true,
  },
  maxDuration: 180,
  run: async (payload) => {
    await metadata.set("status", "starting")
    await metadata.set("projectId", payload.projectId)
    await metadata.set("nodeCount", payload.nodes.length)
    await metadata.set("edgeCount", payload.edges.length)

    await metadata.set("status", "generating")

    const { text } = await generateText({
      model: google("gemini-2.5-flash"),
      temperature: 0.3,
      prompt: buildSpecPrompt(payload),
    })

    await metadata.set("status", "saving")

    const blob = await put(
      `specs/${payload.projectId}/${Date.now()}.md`,
      text,
      {
        access: "private",
        contentType: "text/markdown",
        addRandomSuffix: false,
        allowOverwrite: false,
      }
    )

    const projectSpec = await prisma.projectSpec.create({
      data: {
        projectId: payload.projectId,
        filePath: blob.url,
      },
      select: { id: true },
    })

    await metadata.set("status", "complete")
    await metadata.set("specLength", text.length)
    await metadata.set("specId", projectSpec.id)

    return { spec: text, specId: projectSpec.id, specBlobUrl: blob.url }
  },
})
