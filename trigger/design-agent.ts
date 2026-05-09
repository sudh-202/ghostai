import { createGoogleGenerativeAI } from "@ai-sdk/google"
import { LiveMap, LiveObject, type Liveblocks } from "@liveblocks/node"
import { generateObject } from "ai"
import { task } from "@trigger.dev/sdk/v3"
import { z } from "zod"

import {
  CANVAS_NODE_COLOR_THEMES,
  DEFAULT_CANVAS_NODE_COLOR_THEME,
  type CanvasEdge,
  type CanvasNode,
  type CanvasNodeColorTheme,
  type CanvasNodeShape,
} from "../types/canvas"
import {
  AI_CHAT_FEED_ID,
  AI_STATUS_FEED_ID,
  createAiStatusFeedMessage,
  type DesignAgentAction,
  type DesignAgentEdgeHandle,
  type DesignAgentPlan,
} from "../types/tasks"
import {
  DESIGN_AGENT_ALLOWED_COLOR_THEME_IDS,
  DESIGN_AGENT_ALLOWED_SHAPES,
  DESIGN_AGENT_DEFAULT_NODE_SIZES,
  DESIGN_AGENT_MIN_NODE_HEIGHT,
  DESIGN_AGENT_MIN_NODE_WIDTH,
  DESIGN_AGENT_MODEL_ID,
  DESIGN_AGENT_TASK_ID,
  DESIGN_AGENT_USER_ID,
  DESIGN_AGENT_USER_INFO,
  type DesignAgentPayload,
} from "../lib/design-agent"
import { getLiveblocks } from "../lib/liveblocks"

type CanvasState = {
  nodes: CanvasNode[]
  edges: CanvasEdge[]
}

type MutableFlowState = {
  nodes: Map<string, CanvasNode>
  edges: Map<string, CanvasEdge>
}

// Liveblocks' nested LSON helpers are valid at runtime here, but the node SDK's
// generic surface does not model this storage shape precisely.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MutableLiveObject = LiveObject<any>
type MutableLiveMap = LiveMap<string, MutableLiveObject>

const google = createGoogleGenerativeAI({
  apiKey:
    process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_AI_API_KEY,
})

const COLOR_THEME_BY_ID = new Map(
  CANVAS_NODE_COLOR_THEMES.map((theme) => [theme.id, theme] as const)
)

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function clampSize(value: number, minimum: number) {
  return Math.max(minimum, Math.round(value))
}

function snapToGrid(value: number, grid = 24) {
  return Math.round(value / grid) * grid
}

function sanitizeNodeId(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

function getTheme(themeId?: string): CanvasNodeColorTheme {
  if (!themeId) {
    return DEFAULT_CANVAS_NODE_COLOR_THEME
  }

  return COLOR_THEME_BY_ID.get(themeId) ?? DEFAULT_CANVAS_NODE_COLOR_THEME
}

function getThemeIdForNode(node: CanvasNode) {
  const matchedTheme = CANVAS_NODE_COLOR_THEMES.find(
    (theme) =>
      theme.color === node.data.color &&
      theme.textColor === (node.data.textColor || DEFAULT_CANVAS_NODE_COLOR_THEME.textColor)
  )

  return matchedTheme?.id ?? DEFAULT_CANVAS_NODE_COLOR_THEME.id
}

function getNodeCenter(node: CanvasNode) {
  const width = node.width ?? DESIGN_AGENT_DEFAULT_NODE_SIZES[node.data.shape].width
  const height = node.height ?? DESIGN_AGENT_DEFAULT_NODE_SIZES[node.data.shape].height

  return {
    x: node.position.x + width / 2,
    y: node.position.y + height / 2,
  }
}

function boxesOverlap(
  a: { x: number; y: number; width: number; height: number },
  b: { x: number; y: number; width: number; height: number },
  padding = 56
) {
  return !(
    a.x + a.width + padding <= b.x ||
    b.x + b.width + padding <= a.x ||
    a.y + a.height + padding <= b.y ||
    b.y + b.height + padding <= a.y
  )
}

function findOpenPosition(
  requestedPosition: { x: number; y: number },
  size: { width: number; height: number },
  state: MutableFlowState,
  ignoredNodeId?: string
) {
  let next = {
    x: snapToGrid(requestedPosition.x),
    y: snapToGrid(requestedPosition.y),
  }

  const existingNodes = Array.from(state.nodes.values()).filter(
    (node) => node.id !== ignoredNodeId
  )

  for (let attempt = 0; attempt < 24; attempt += 1) {
    const overlaps = existingNodes.some((node) =>
      boxesOverlap(
        { x: next.x, y: next.y, width: size.width, height: size.height },
        {
          x: node.position.x,
          y: node.position.y,
          width: node.width ?? DESIGN_AGENT_DEFAULT_NODE_SIZES[node.data.shape].width,
          height: node.height ?? DESIGN_AGENT_DEFAULT_NODE_SIZES[node.data.shape].height,
        }
      )
    )

    if (!overlaps) {
      return next
    }

    next = {
      x: snapToGrid(next.x + 72),
      y: snapToGrid(next.y + (attempt % 2 === 0 ? 56 : -24)),
    }
  }

  return next
}

function guessHandleBetweenNodes(
  sourceNode: CanvasNode,
  targetNode: CanvasNode
): { sourceHandle: DesignAgentEdgeHandle; targetHandle: DesignAgentEdgeHandle } {
  const sourceCenter = getNodeCenter(sourceNode)
  const targetCenter = getNodeCenter(targetNode)
  const dx = targetCenter.x - sourceCenter.x
  const dy = targetCenter.y - sourceCenter.y

  if (Math.abs(dx) >= Math.abs(dy)) {
    return dx >= 0
      ? { sourceHandle: "right", targetHandle: "left" }
      : { sourceHandle: "left", targetHandle: "right" }
  }

  return dy >= 0
    ? { sourceHandle: "bottom", targetHandle: "top" }
    : { sourceHandle: "top", targetHandle: "bottom" }
}


function normalizeNode(value: unknown): CanvasNode | null {
  if (!isRecord(value) || !isRecord(value.position) || !isRecord(value.data)) {
    return null
  }

  const id = typeof value.id === "string" ? value.id : ""
  const shape = typeof value.data.shape === "string" ? value.data.shape : ""

  if (!id || !DESIGN_AGENT_ALLOWED_SHAPES.includes(shape as CanvasNodeShape)) {
    return null
  }

  const defaultSize = DESIGN_AGENT_DEFAULT_NODE_SIZES[shape as CanvasNodeShape]

  return {
    id,
    type: "canvasNode",
    position: {
      x: typeof value.position.x === "number" ? value.position.x : 0,
      y: typeof value.position.y === "number" ? value.position.y : 0,
    },
    width: typeof value.width === "number" ? value.width : defaultSize.width,
    height: typeof value.height === "number" ? value.height : defaultSize.height,
    data: {
      label: typeof value.data.label === "string" ? value.data.label : "",
      color:
        typeof value.data.color === "string"
          ? value.data.color
          : DEFAULT_CANVAS_NODE_COLOR_THEME.color,
      textColor:
        typeof value.data.textColor === "string"
          ? value.data.textColor
          : DEFAULT_CANVAS_NODE_COLOR_THEME.textColor,
      shape: shape as CanvasNodeShape,
    },
  }
}

function normalizeEdge(value: unknown): CanvasEdge | null {
  if (!isRecord(value)) {
    return null
  }

  const id = typeof value.id === "string" ? value.id : ""
  const source = typeof value.source === "string" ? value.source : ""
  const target = typeof value.target === "string" ? value.target : ""

  if (!id || !source || !target) {
    return null
  }

  const data = isRecord(value.data) ? value.data : {}

  return {
    id,
    source,
    target,
    sourceHandle:
      typeof value.sourceHandle === "string" ? value.sourceHandle : undefined,
    targetHandle:
      typeof value.targetHandle === "string" ? value.targetHandle : undefined,
    type: "canvasEdge",
    data: {
      label: typeof data.label === "string" ? data.label : "",
    },
  }
}

function parseCanvasState(document: unknown): CanvasState {
  if (!isRecord(document) || !isRecord(document.flow)) {
    return { nodes: [], edges: [] }
  }

  const nodesObject = isRecord(document.flow.nodes) ? document.flow.nodes : {}
  const edgesObject = isRecord(document.flow.edges) ? document.flow.edges : {}

  return {
    nodes: Object.values(nodesObject)
      .map(normalizeNode)
      .filter((node): node is CanvasNode => Boolean(node)),
    edges: Object.values(edgesObject)
      .map(normalizeEdge)
      .filter((edge): edge is CanvasEdge => Boolean(edge)),
  }
}

function buildCanvasSnapshot(state: CanvasState) {
  return {
    nodes: state.nodes.map((node) => ({
      id: node.id,
      label: node.data.label || "",
      shape: node.data.shape,
      colorThemeId: getThemeIdForNode(node),
      x: Math.round(node.position.x),
      y: Math.round(node.position.y),
      width: Math.round(node.width ?? DESIGN_AGENT_DEFAULT_NODE_SIZES[node.data.shape].width),
      height: Math.round(node.height ?? DESIGN_AGENT_DEFAULT_NODE_SIZES[node.data.shape].height),
    })),
    edges: state.edges.map((edge) => ({
      id: edge.id,
      sourceNodeId: edge.source,
      targetNodeId: edge.target,
      sourceHandle: edge.sourceHandle || null,
      targetHandle: edge.targetHandle || null,
      label: edge.data?.label || "",
    })),
  }
}

async function ensureFeed(
  liveblocks: Liveblocks,
  roomId: string,
  feedId: string,
  metadata: { channel: string; task?: string }
) {
  try {
    await liveblocks.getFeed({ roomId, feedId })
  } catch (error) {
    const status = typeof error === "object" && error && "status" in error ? error.status : null
    if (status !== 404) throw error
    await liveblocks.createFeed({ roomId, feedId, metadata })
  }
}

async function publishStatus(
  liveblocks: Liveblocks,
  roomId: string,
  phase: "start" | "processing" | "complete" | "error",
  text?: string
) {
  await ensureFeed(liveblocks, roomId, AI_STATUS_FEED_ID, { channel: AI_STATUS_FEED_ID, task: "design" })
  await liveblocks.createFeedMessage({
    roomId,
    feedId: AI_STATUS_FEED_ID,
    data: createAiStatusFeedMessage(phase, text, { task: "design" }),
  })
}

async function updateAgentPresence(
  liveblocks: Liveblocks,
  roomId: string,
  options: {
    cursor: { x: number; y: number } | null
    thinking: boolean
    ttl?: number
  }
) {
  await liveblocks.setPresence(roomId, {
    userId: DESIGN_AGENT_USER_ID,
    data: {
      cursor: options.cursor,
      thinking: options.thinking,
    },
    userInfo: DESIGN_AGENT_USER_INFO,
    ttl: options.ttl ?? 120,
  })
}

async function getCanvasState(liveblocks: Liveblocks, roomId: string) {
  try {
    return parseCanvasState(await liveblocks.getStorageDocument(roomId, "json"))
  } catch {
    return { nodes: [], edges: [] }
  }
}

function createNodeFromAction(
  action: Extract<DesignAgentAction, { type: "add-node" }>,
  state: MutableFlowState
) {
  const shape = action.shape
  const size = action.size
    ? {
        width: clampSize(action.size.width, DESIGN_AGENT_MIN_NODE_WIDTH),
        height: clampSize(action.size.height, DESIGN_AGENT_MIN_NODE_HEIGHT),
      }
    : DESIGN_AGENT_DEFAULT_NODE_SIZES[shape]
  const requestedPosition = action.position ?? {
    x: 120 + state.nodes.size * 56,
    y: 120 + state.nodes.size * 48,
  }
  const position = findOpenPosition(requestedPosition, size, state)
  const theme = getTheme(action.colorThemeId)
  const label = action.label?.trim() || "New node"
  const candidateId = sanitizeNodeId(action.nodeId || label || shape) || `${shape}-${Date.now()}`
  let nodeId = candidateId
  let suffix = 1

  while (state.nodes.has(nodeId)) {
    suffix += 1
    nodeId = `${candidateId}-${suffix}`
  }

  const node: CanvasNode = {
    id: nodeId,
    type: "canvasNode",
    position,
    width: size.width,
    height: size.height,
    data: {
      label,
      color: theme.color,
      textColor: theme.textColor,
      shape,
    },
  }

  return node
}

function upsertNodeLiveObject(
  nodesMap: MutableLiveMap,
  node: CanvasNode
) {
  nodesMap.set(
    node.id,
    new LiveObject({
      id: node.id,
      type: "canvasNode",
      position: new LiveObject({
        x: node.position.x,
        y: node.position.y,
      }),
      width: node.width,
      height: node.height,
      data: new LiveObject({
        label: node.data.label,
        color: node.data.color,
        textColor: node.data.textColor,
        shape: node.data.shape,
      }),
    })
  )
}

function upsertEdgeLiveObject(
  edgesMap: MutableLiveMap,
  edge: CanvasEdge
) {
  edgesMap.set(
    edge.id,
    new LiveObject({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      type: "canvasEdge",
      sourceHandle: edge.sourceHandle,
      targetHandle: edge.targetHandle,
      data: new LiveObject({
        label: edge.data?.label ?? "",
      }),
    })
  )
}

const designNodeSchema = z.object({
  nodeId: z.string().describe("Unique lowercase-kebab-case ID, e.g. 'api-gateway'"),
  label: z.string(),
  shape: z.enum(["rectangle", "diamond", "circle", "pill", "cylinder", "hexagon"]),
  colorThemeId: z.string().describe(`One of: ${DESIGN_AGENT_ALLOWED_COLOR_THEME_IDS.join(", ")}`),
  x: z.number().describe("X position, snapped to 24px grid"),
  y: z.number().describe("Y position, snapped to 24px grid"),
  width: z.number().optional(),
  height: z.number().optional(),
})

const designEdgeSchema = z.object({
  sourceNodeId: z.string().describe("EXACT nodeId of the source node"),
  targetNodeId: z.string().describe("EXACT nodeId of the target node"),
  label: z.string().optional().describe("Short verb label e.g. HTTP, Publish, Query"),
  sourceHandle: z.enum(["top", "right", "bottom", "left"]).optional(),
  targetHandle: z.enum(["top", "right", "bottom", "left"]).optional(),
})

const canvasDesignSchema = z.object({
  summary: z.string().describe("One sentence describing the architecture"),
  nodes: z.array(designNodeSchema).describe("All components/services in the design"),
  edges: z.array(designEdgeSchema).describe("ALL connections between components — every communicating pair MUST have an edge"),
})

function buildPrompt(state: CanvasState, userPrompt: string) {
  const snapshot = buildCanvasSnapshot(state)
  return `
You are Ghost AI, an architecture diagram assistant.

Design rules:
- shapes: rectangle (services/APIs), cylinder (databases/caches), hexagon (queues/brokers), pill (gateways/clients), circle (users/actors), diamond (decisions)
- colorThemeId values: ${DESIGN_AGENT_ALLOWED_COLOR_THEME_IDS.join(", ")}
- snap x/y to multiples of 24 (e.g. 120, 144, 168, 240, 360, 480)
- keep at least 56px space between node edges; typical canvas width 1200px
- left-to-right flow: sourceHandle "right", targetHandle "left"
- top-to-bottom flow: sourceHandle "bottom", targetHandle "top"
- preserve existing nodes unless the request explicitly removes them
- default sizes: ${JSON.stringify(DESIGN_AGENT_DEFAULT_NODE_SIZES)}

${snapshot.nodes.length > 0
  ? `Current canvas:\n${JSON.stringify(snapshot, null, 2)}`
  : "Canvas is empty — design from scratch."}

User request: ${userPrompt}
  `.trim()
}

const DESIGN_AGENT_SYSTEM_PROMPT = `You are a senior software architect that designs system diagrams.

CRITICAL: Your output is INCOMPLETE and INVALID if you produce a multi-node architecture without edges. Every component that interacts with another component MUST have an explicit edge connecting them. If you generate 5 nodes that are all part of one architecture, you MUST also generate the edges between them.

Think about the request, then for each pair of components that communicate, emit an edge with the EXACT nodeId values you assigned in the nodes array.`

async function generateDesignPlan(state: CanvasState, prompt: string) {
  const { object } = await generateObject({
    model: google(DESIGN_AGENT_MODEL_ID),
    schema: canvasDesignSchema,
    system: DESIGN_AGENT_SYSTEM_PROMPT,
    temperature: 0.2,
    prompt: buildPrompt(state, prompt),
  })

  let edges = object.edges

  // Fallback: if Gemini returned multi-node nodes but no edges, retry with an
  // edge-only call. Gemini occasionally omits edges in the first pass even with
  // the schema requirement; this guarantees connections for every architecture.
  if (object.nodes.length > 1 && edges.length === 0) {
    const nodesList = object.nodes
      .map((n) => `- ${n.nodeId}: ${n.label} (${n.shape})`)
      .join("\n")

    const edgeOnly = await generateObject({
      model: google(DESIGN_AGENT_MODEL_ID),
      schema: z.object({
        edges: z.array(designEdgeSchema).min(1),
      }),
      system: "You connect components in a software architecture. Output one edge per logical connection. Use the EXACT nodeId values from the list provided.",
      prompt: `User request: "${prompt}"

Components in the diagram:
${nodesList}

For every pair of components that should communicate or depend on each other in this architecture, produce an add-edge with the exact nodeId from the list above. Use short verb labels (HTTP, Publish, Subscribe, Query, Cache Hit, etc.).`,
    })
    edges = edgeOnly.object.edges
  }

  const actions: DesignAgentAction[] = [
    ...object.nodes.map((n): DesignAgentAction => ({
      type: "add-node",
      nodeId: n.nodeId,
      label: n.label,
      shape: n.shape,
      colorThemeId: DESIGN_AGENT_ALLOWED_COLOR_THEME_IDS.includes(n.colorThemeId)
        ? n.colorThemeId
        : "slate",
      position: { x: n.x, y: n.y },
      ...(n.width && n.height ? { size: { width: n.width, height: n.height } } : {}),
    })),
    ...edges.map((e): DesignAgentAction => ({
      type: "add-edge",
      sourceNodeId: e.sourceNodeId,
      targetNodeId: e.targetNodeId,
      label: e.label,
      sourceHandle: e.sourceHandle,
      targetHandle: e.targetHandle,
    })),
  ]

  return { summary: object.summary, actions }
}

function getCursorForAction(action: DesignAgentAction, state: MutableFlowState) {
  switch (action.type) {
    case "add-node": {
      return null
    }
    case "move-node":
    case "resize-node":
    case "update-node":
    case "delete-node": {
      const node = state.nodes.get(action.nodeId)
      return node ? getNodeCenter(node) : null
    }
    case "add-edge": {
      const source = state.nodes.get(action.sourceNodeId)
      const target = state.nodes.get(action.targetNodeId)

      if (!source || !target) {
        return null
      }

      const sourceCenter = getNodeCenter(source)
      const targetCenter = getNodeCenter(target)

      return {
        x: (sourceCenter.x + targetCenter.x) / 2,
        y: (sourceCenter.y + targetCenter.y) / 2,
      }
    }
    case "delete-edge": {
      const edge = state.edges.get(action.edgeId)
      if (!edge) {
        return null
      }

      const source = state.nodes.get(edge.source)
      const target = state.nodes.get(edge.target)
      if (!source || !target) {
        return null
      }

      const sourceCenter = getNodeCenter(source)
      const targetCenter = getNodeCenter(target)

      return {
        x: (sourceCenter.x + targetCenter.x) / 2,
        y: (sourceCenter.y + targetCenter.y) / 2,
      }
    }
  }
}

async function applyDesignPlan(
  liveblocks: Liveblocks,
  roomId: string,
  state: MutableFlowState,
  plan: DesignAgentPlan
) {
  let processedActions = 0

  await liveblocks.mutateStorage(roomId, async ({ root }) => {
    let flow = root.get("flow") as MutableLiveObject | undefined
    if (!flow) {
      flow = new LiveObject({
        nodes: new LiveMap(),
        edges: new LiveMap(),
      }) as MutableLiveObject
      root.set("flow", flow as never)
    }

    let nodesMap = flow.get("nodes") as MutableLiveMap | undefined
    let edgesMap = flow.get("edges") as MutableLiveMap | undefined

    if (!nodesMap) {
      nodesMap = new LiveMap()
      flow.set("nodes", nodesMap as never)
    }

    if (!edgesMap) {
      edgesMap = new LiveMap()
      flow.set("edges", edgesMap as never)
    }

    for (const action of plan.actions) {
      let applied = false

      switch (action.type) {
        case "add-node": {
          const node = createNodeFromAction(action, state)
          state.nodes.set(node.id, node)
          upsertNodeLiveObject(nodesMap, node)
          applied = true
          break
        }
        case "move-node": {
          const node = state.nodes.get(action.nodeId)
          if (!node) break

          const width =
            node.width ?? DESIGN_AGENT_DEFAULT_NODE_SIZES[node.data.shape].width
          const height =
            node.height ?? DESIGN_AGENT_DEFAULT_NODE_SIZES[node.data.shape].height
          node.position = findOpenPosition(action.position, { width, height }, state, node.id)
          state.nodes.set(node.id, node)
          upsertNodeLiveObject(nodesMap, node)
          applied = true
          break
        }
        case "resize-node": {
          const node = state.nodes.get(action.nodeId)
          if (!node) break

          node.width = clampSize(action.size.width, DESIGN_AGENT_MIN_NODE_WIDTH)
          node.height = clampSize(action.size.height, DESIGN_AGENT_MIN_NODE_HEIGHT)
          node.position = findOpenPosition(
            node.position,
            { width: node.width, height: node.height },
            state,
            node.id
          )
          state.nodes.set(node.id, node)
          upsertNodeLiveObject(nodesMap, node)
          applied = true
          break
        }
        case "update-node": {
          const node = state.nodes.get(action.nodeId)
          if (!node) break

          if (action.label) {
            node.data.label = action.label
          }

          if (action.shape && DESIGN_AGENT_ALLOWED_SHAPES.includes(action.shape)) {
            node.data.shape = action.shape

            if (!node.width || !node.height) {
              const defaultSize = DESIGN_AGENT_DEFAULT_NODE_SIZES[action.shape]
              node.width = defaultSize.width
              node.height = defaultSize.height
            }
          }

          if (action.colorThemeId) {
            const theme = getTheme(action.colorThemeId)
            node.data.color = theme.color
            node.data.textColor = theme.textColor
          }

          state.nodes.set(node.id, node)
          upsertNodeLiveObject(nodesMap, node)
          applied = true
          break
        }
        case "delete-node": {
          if (!state.nodes.has(action.nodeId)) break

          state.nodes.delete(action.nodeId)
          nodesMap.delete(action.nodeId)

          for (const [edgeId, edge] of Array.from(state.edges.entries())) {
            if (edge.source === action.nodeId || edge.target === action.nodeId) {
              state.edges.delete(edgeId)
              edgesMap.delete(edgeId)
            }
          }
          applied = true
          break
        }
        case "add-edge": {
          const sourceNode =
            state.nodes.get(action.sourceNodeId) ??
            state.nodes.get(sanitizeNodeId(action.sourceNodeId))
          const targetNode =
            state.nodes.get(action.targetNodeId) ??
            state.nodes.get(sanitizeNodeId(action.targetNodeId))

          if (!sourceNode || !targetNode || sourceNode.id === targetNode.id) {
            break
          }

          const handles = guessHandleBetweenNodes(sourceNode, targetNode)
          const sourcePosition = action.sourceHandle ?? handles.sourceHandle
          const targetPosition = action.targetHandle ?? handles.targetHandle
          // React Flow handle IDs in this canvas are suffixed (`right-source`,
          // `left-target`); without the suffix the renderer can't locate a
          // matching handle and silently drops the edge.
          const sourceHandle = `${sourcePosition}-source`
          const targetHandle = `${targetPosition}-target`
          const candidateId =
            sanitizeNodeId(
              action.edgeId ||
                `${sourceNode.id}-${sourcePosition}-${targetNode.id}-${targetPosition}`
            ) || `edge-${Date.now()}`
          let edgeId = candidateId
          let suffix = 1

          while (state.edges.has(edgeId)) {
            suffix += 1
            edgeId = `${candidateId}-${suffix}`
          }

          const duplicate = Array.from(state.edges.values()).some(
            (edge) =>
              edge.source === sourceNode.id &&
              edge.target === targetNode.id &&
              edge.sourceHandle === sourceHandle &&
              edge.targetHandle === targetHandle
          )

          if (duplicate) {
            break
          }

          const edge: CanvasEdge = {
            id: edgeId,
            source: sourceNode.id,
            target: targetNode.id,
            sourceHandle,
            targetHandle,
            type: "canvasEdge",
            data: {
              label: action.label ?? "",
            },
          }

          state.edges.set(edge.id, edge)
          upsertEdgeLiveObject(edgesMap, edge)
          applied = true
          break
        }
        case "delete-edge": {
          if (!state.edges.has(action.edgeId)) break
          state.edges.delete(action.edgeId)
          edgesMap.delete(action.edgeId)
          applied = true
          break
        }
      }

      if (!applied) {
        continue
      }

      processedActions += 1
      const cursor = getCursorForAction(action, state)

      await updateAgentPresence(liveblocks, roomId, {
        cursor,
        thinking: true,
        ttl: 120,
      })
    }
  })

  return processedActions
}

export const designAgentTask = task({
  id: DESIGN_AGENT_TASK_ID,
  maxDuration: 300,
  run: async (payload: DesignAgentPayload) => {
    const liveblocks = getLiveblocks()

    await liveblocks.getOrCreateRoom(payload.roomId, {
      defaultAccesses: [],
      metadata: {
        projectId: payload.roomId,
      },
    })

    await updateAgentPresence(liveblocks, payload.roomId, {
      cursor: { x: 96, y: 96 },
      thinking: true,
      ttl: 180,
    })
    await publishStatus(liveblocks, payload.roomId, "start", "Ghost AI started interpreting your prompt.")

    try {
      const currentState = await getCanvasState(liveblocks, payload.roomId)
      const plan = await generateDesignPlan(currentState, payload.prompt)

      await publishStatus(
        liveblocks,
        payload.roomId,
        "processing",
        plan.summary ||
          (plan.actions.length > 0
            ? `Applying ${plan.actions.length} canvas update${plan.actions.length === 1 ? "" : "s"}.`
            : "No canvas changes were needed.")
      )

      const workingState: MutableFlowState = {
        nodes: new Map(currentState.nodes.map((node) => [node.id, { ...node, data: { ...node.data }, position: { ...node.position } }])),
        edges: new Map(currentState.edges.map((edge) => [edge.id, { ...edge, data: edge.data ? { ...edge.data } : { label: "" } }])),
      }

      const processedActions =
        plan.actions.length > 0
          ? await applyDesignPlan(liveblocks, payload.roomId, workingState, plan)
          : 0

      await publishStatus(
        liveblocks,
        payload.roomId,
        "complete",
        processedActions > 0
          ? `Ghost AI finished ${processedActions} canvas update${processedActions === 1 ? "" : "s"}.`
          : "Ghost AI reviewed the prompt and left the canvas unchanged."
      )

      const replyContent =
        plan.summary ||
        (processedActions > 0
          ? `Canvas updated with ${processedActions} change${processedActions === 1 ? "" : "s"}.`
          : "Reviewed the prompt — no canvas changes were needed.")

      await ensureFeed(liveblocks, payload.roomId, AI_CHAT_FEED_ID, { channel: AI_CHAT_FEED_ID })
      await liveblocks.createFeedMessage({
        roomId: payload.roomId,
        feedId: AI_CHAT_FEED_ID,
        data: {
          kind: "chat",
          userId: DESIGN_AGENT_USER_ID,
          sender: DESIGN_AGENT_USER_INFO.displayName,
          role: "assistant",
          content: replyContent,
          timestamp: new Date().toISOString(),
        },
      })

      return {
        ok: true,
        summary: plan.summary ?? null,
        actionsApplied: processedActions,
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Ghost AI could not update the canvas."

      await publishStatus(liveblocks, payload.roomId, "error", message)
      throw error
    } finally {
      await updateAgentPresence(liveblocks, payload.roomId, {
        cursor: null,
        thinking: false,
        ttl: 2,
      })
    }
  },
})
