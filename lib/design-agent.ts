import {
  CANVAS_NODE_COLOR_THEMES,
  type CanvasNodeShape,
  type CanvasShapeSize,
} from "../types/canvas"

export const DESIGN_AGENT_TASK_ID = "design-agent"
export const GENERATE_SPEC_TASK_ID = "generate-spec"
export const DESIGN_AGENT_TOKEN_TTL = "1h"
export const DESIGN_AGENT_MODEL_ID = "gemini-2.5-flash"
export const DESIGN_AGENT_USER_ID = "ghost-ai-design-agent"
export const DESIGN_AGENT_USER_INFO = {
  displayName: "Ghost AI",
  avatarUrl: "",
  cursorColor: "#60a5fa",
} as const
export const DESIGN_AGENT_MIN_NODE_WIDTH = 120
export const DESIGN_AGENT_MIN_NODE_HEIGHT = 72
export const DESIGN_AGENT_ALLOWED_COLOR_THEME_IDS = CANVAS_NODE_COLOR_THEMES.map(
  (theme) => theme.id
)
export const DESIGN_AGENT_ALLOWED_SHAPES: CanvasNodeShape[] = [
  "rectangle",
  "diamond",
  "circle",
  "pill",
  "cylinder",
  "hexagon",
]
export const DESIGN_AGENT_DEFAULT_NODE_SIZES: Record<
  CanvasNodeShape,
  CanvasShapeSize
> = {
  rectangle: { width: 220, height: 124 },
  diamond: { width: 188, height: 188 },
  circle: { width: 156, height: 156 },
  pill: { width: 228, height: 112 },
  cylinder: { width: 196, height: 148 },
  hexagon: { width: 210, height: 156 },
}

export type DesignAgentPayload = {
  prompt: string
  roomId: string
}
