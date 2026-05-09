import { z } from "zod"

import {
  CANVAS_NODE_COLOR_THEMES,
  type CanvasNodeShape,
  type CanvasShapeSize,
} from "./canvas"

const COLOR_THEME_IDS = new Set(CANVAS_NODE_COLOR_THEMES.map((theme) => theme.id))
const NODE_SHAPES = new Set<CanvasNodeShape>([
  "rectangle",
  "diamond",
  "circle",
  "pill",
  "cylinder",
  "hexagon",
])
const EDGE_HANDLES = new Set(["top", "right", "bottom", "left"] as const)

export const AI_STATUS_FEED_ID = "ai-status-feed"
export const AI_CHAT_FEED_ID = "ai-chat"

export const chatFeedMessageSchema = z.object({
  kind: z.literal("chat"),
  userId: z.string(),
  sender: z.string(),
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1),
  timestamp: z.string(),
})

export type ChatFeedMessage = z.infer<typeof chatFeedMessageSchema>

export function isChatFeedMessage(value: unknown): value is ChatFeedMessage {
  return chatFeedMessageSchema.safeParse(value).success
}

export type AiStatusPhase = "start" | "processing" | "complete" | "error"

export type AiStatusFeedMessage = {
  kind: "status"
  task: "design" | "spec"
  phase: AiStatusPhase
  text?: string
  createdAt: string
  runId?: string
}

export type DesignAgentEdgeHandle = "top" | "right" | "bottom" | "left"

export type DesignAgentAction =
  | {
      type: "add-node"
      nodeId?: string
      label?: string
      shape: CanvasNodeShape
      colorThemeId: string
      position?: { x: number; y: number }
      size?: CanvasShapeSize
    }
  | {
      type: "move-node"
      nodeId: string
      position: { x: number; y: number }
    }
  | {
      type: "resize-node"
      nodeId: string
      size: CanvasShapeSize
    }
  | {
      type: "update-node"
      nodeId: string
      label?: string
      shape?: CanvasNodeShape
      colorThemeId?: string
    }
  | {
      type: "delete-node"
      nodeId: string
    }
  | {
      type: "add-edge"
      edgeId?: string
      sourceNodeId: string
      targetNodeId: string
      sourceHandle?: DesignAgentEdgeHandle
      targetHandle?: DesignAgentEdgeHandle
      label?: string
    }
  | {
      type: "delete-edge"
      edgeId: string
    }

export type DesignAgentPlan = {
  summary?: string
  actions: DesignAgentAction[]
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value)
}

function parsePosition(value: unknown) {
  if (!isRecord(value) || !isFiniteNumber(value.x) || !isFiniteNumber(value.y)) {
    return null
  }

  return { x: value.x, y: value.y }
}

function parseSize(value: unknown) {
  if (!isRecord(value) || !isFiniteNumber(value.width) || !isFiniteNumber(value.height)) {
    return null
  }

  return { width: value.width, height: value.height }
}

function parseHandle(value: unknown): DesignAgentEdgeHandle | undefined {
  if (typeof value !== "string") {
    return undefined
  }

  const normalized = value.trim().toLowerCase()

  if (!EDGE_HANDLES.has(normalized as DesignAgentEdgeHandle)) {
    return undefined
  }

  return normalized as DesignAgentEdgeHandle
}

function parseShape(value: unknown): CanvasNodeShape | undefined {
  if (typeof value !== "string") {
    return undefined
  }

  const normalized = value.trim().toLowerCase().replace(/[\s_]+/g, "-")
  const aliases: Record<string, CanvasNodeShape> = {
    rect: "rectangle",
    box: "rectangle",
    rounded: "pill",
    "rounded-rectangle": "pill",
    oval: "pill",
    database: "cylinder",
    db: "cylinder",
    hex: "hexagon",
    decision: "diamond",
    rhombus: "diamond",
  }
  const resolved = aliases[normalized] ?? normalized

  if (!NODE_SHAPES.has(resolved as CanvasNodeShape)) {
    return undefined
  }

  return resolved as CanvasNodeShape
}

function parseColorThemeId(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined
  }

  const normalized = value.trim().toLowerCase().replace(/[\s_]+/g, "-")
  const aliases: Record<string, string> = {
    blue: "steel",
    "steel-blue": "steel",
    green: "mint",
    red: "rose",
    orange: "amber",
    yellow: "amber",
    purple: "plum",
    gray: "slate",
    grey: "slate",
  }
  const resolved = aliases[normalized] ?? normalized

  if (!COLOR_THEME_IDS.has(resolved)) {
    return undefined
  }

  return resolved
}

function parseOptionalString(value: unknown) {
  if (typeof value !== "string") {
    return undefined
  }

  const trimmed = value.trim()
  return trimmed ? trimmed : undefined
}

function normalizeActionType(value: unknown): DesignAgentAction["type"] | null {
  if (typeof value !== "string") {
    return null
  }

  const normalized = value.trim().toLowerCase().replace(/[\s_]+/g, "-")
  const aliases: Record<string, DesignAgentAction["type"]> = {
    "create-node": "add-node",
    "insert-node": "add-node",
    "new-node": "add-node",
    "create-edge": "add-edge",
    "insert-edge": "add-edge",
    connect: "add-edge",
    connection: "add-edge",
    "remove-node": "delete-node",
    "remove-edge": "delete-edge",
  }
  const resolved = aliases[normalized] ?? normalized

  switch (resolved) {
    case "add-node":
    case "move-node":
    case "resize-node":
    case "update-node":
    case "delete-node":
    case "add-edge":
    case "delete-edge":
      return resolved
    default:
      return null
  }
}

function pickRecordValue(
  record: Record<string, unknown>,
  keys: string[]
) {
  for (const key of keys) {
    if (key in record) {
      return record[key]
    }
  }

  return undefined
}

export function createAiStatusFeedMessage(
  phase: AiStatusPhase,
  text?: string,
  options?: {
    runId?: string
    task?: "design" | "spec"
  }
): AiStatusFeedMessage {
  return {
    kind: "status",
    task: options?.task ?? "design",
    phase,
    ...(text ? { text } : {}),
    ...(options?.runId ? { runId: options.runId } : {}),
    createdAt: new Date().toISOString(),
  }
}

export function isAiStatusFeedMessage(value: unknown): value is AiStatusFeedMessage {
  if (!isRecord(value)) {
    return false
  }

  if (value.kind !== "status") return false
  if (value.task !== "design" && value.task !== "spec") return false
  if (
    value.phase !== "start" &&
    value.phase !== "processing" &&
    value.phase !== "complete" &&
    value.phase !== "error"
  ) {
    return false
  }
  if (
    value.text !== undefined &&
    (typeof value.text !== "string" || value.text.trim().length === 0)
  ) {
    return false
  }
  if (typeof value.createdAt !== "string" || Number.isNaN(Date.parse(value.createdAt))) {
    return false
  }
  if (value.runId !== undefined && typeof value.runId !== "string") {
    return false
  }

  return true
}

export function parseDesignAgentPlan(value: unknown): DesignAgentPlan | null {
  if (Array.isArray(value)) {
    return parseDesignAgentPlan({ actions: value })
  }

  if (!isRecord(value)) {
    return null
  }

  const actionsValue =
    pickRecordValue(value, ["actions", "steps", "operations", "changes"]) ?? value.actions

  if (!Array.isArray(actionsValue)) {
    return null
  }

  const actions: DesignAgentAction[] = []

  for (const candidate of actionsValue) {
    if (!isRecord(candidate)) {
      return null
    }

    const actionType =
      normalizeActionType(candidate.type ?? pickRecordValue(candidate, ["action", "kind"])) 

    if (!actionType) {
      return null
    }

    switch (actionType) {
      case "add-node": {
        const shape = parseShape(
          pickRecordValue(candidate, ["shape", "nodeShape", "kind"])
        )
        const colorThemeId =
          parseColorThemeId(
            pickRecordValue(candidate, ["colorThemeId", "themeId", "color", "theme"])
          ) ?? "slate"

        if (!shape) {
          return null
        }

        actions.push({
          type: "add-node",
          nodeId: parseOptionalString(
            pickRecordValue(candidate, ["nodeId", "id", "node"])
          ),
          label: parseOptionalString(
            pickRecordValue(candidate, ["label", "text", "name", "title"])
          ),
          shape,
          colorThemeId,
          position:
            parsePosition(
              pickRecordValue(candidate, ["position", "coordinates", "pos"])
            ) ?? undefined,
          size:
            parseSize(
              pickRecordValue(candidate, ["size", "dimensions"])
            ) ?? undefined,
        })
        break
      }
      case "move-node": {
        const nodeId = parseOptionalString(
          pickRecordValue(candidate, ["nodeId", "id", "node"])
        )
        const position = parsePosition(
          pickRecordValue(candidate, ["position", "coordinates", "to", "pos"])
        )

        if (!nodeId || !position) {
          return null
        }

        actions.push({
          type: "move-node",
          nodeId,
          position,
        })
        break
      }
      case "resize-node": {
        const nodeId = parseOptionalString(
          pickRecordValue(candidate, ["nodeId", "id", "node"])
        )
        const size = parseSize(
          pickRecordValue(candidate, ["size", "dimensions"])
        )

        if (!nodeId || !size) {
          return null
        }

        actions.push({
          type: "resize-node",
          nodeId,
          size,
        })
        break
      }
      case "update-node": {
        const nodeId = parseOptionalString(
          pickRecordValue(candidate, ["nodeId", "id", "node"])
        )

        if (!nodeId) {
          return null
        }

        actions.push({
          type: "update-node",
          nodeId,
          label: parseOptionalString(
            pickRecordValue(candidate, ["label", "text", "name", "title"])
          ),
          shape: parseShape(
            pickRecordValue(candidate, ["shape", "nodeShape", "kind"])
          ),
          colorThemeId: parseColorThemeId(
            pickRecordValue(candidate, ["colorThemeId", "themeId", "color", "theme"])
          ),
        })
        break
      }
      case "delete-node": {
        const nodeId = parseOptionalString(
          pickRecordValue(candidate, ["nodeId", "id", "node"])
        )

        if (!nodeId) {
          return null
        }

        actions.push({
          type: "delete-node",
          nodeId,
        })
        break
      }
      case "add-edge": {
        const sourceNodeId = parseOptionalString(
          pickRecordValue(candidate, ["sourceNodeId", "source", "fromNodeId", "from"])
        )
        const targetNodeId = parseOptionalString(
          pickRecordValue(candidate, ["targetNodeId", "target", "toNodeId", "to"])
        )

        if (!sourceNodeId || !targetNodeId) {
          continue
        }

        actions.push({
          type: "add-edge",
          edgeId: parseOptionalString(
            pickRecordValue(candidate, ["edgeId", "id", "edge"])
          ),
          sourceNodeId,
          targetNodeId,
          sourceHandle: parseHandle(
            pickRecordValue(candidate, ["sourceHandle", "fromHandle"])
          ),
          targetHandle: parseHandle(
            pickRecordValue(candidate, ["targetHandle", "toHandle"])
          ),
          label: parseOptionalString(
            pickRecordValue(candidate, ["label", "text", "name", "title"])
          ),
        })
        break
      }
      case "delete-edge": {
        const edgeId = parseOptionalString(
          pickRecordValue(candidate, ["edgeId", "id", "edge"])
        )

        if (!edgeId) {
          continue
        }

        actions.push({
          type: "delete-edge",
          edgeId,
        })
        break
      }
      default:
        return null
    }
  }

  return {
    summary: parseOptionalString(value.summary),
    actions,
  }
}
