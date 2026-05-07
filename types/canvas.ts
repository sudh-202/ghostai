import type { Edge, Node } from "@xyflow/react"

export type CanvasNodeShape =
  | "rectangle"
  | "diamond"
  | "circle"
  | "pill"
  | "cylinder"
  | "hexagon"

export type CanvasShapeSize = {
  width: number
  height: number
}

export type CanvasNodeColorTheme = {
  id: string
  label: string
  color: string
  textColor: string
}

export const CANVAS_NODE_COLOR_THEMES: CanvasNodeColorTheme[] = [
  {
    id: "slate",
    label: "Slate",
    color: "color-mix(in oklab, var(--card) 92%, white 4%)",
    textColor: "var(--foreground)",
  },
  {
    id: "steel",
    label: "Steel Blue",
    color: "color-mix(in oklab, var(--chart-1) 28%, var(--card) 72%)",
    textColor: "color-mix(in oklab, var(--foreground) 92%, var(--chart-1) 8%)",
  },
  {
    id: "mint",
    label: "Mint",
    color: "color-mix(in oklab, var(--state-success) 26%, var(--card) 74%)",
    textColor: "color-mix(in oklab, var(--foreground) 90%, var(--state-success) 10%)",
  },
  {
    id: "plum",
    label: "Plum",
    color: "color-mix(in oklab, var(--chart-3) 24%, var(--card) 76%)",
    textColor: "color-mix(in oklab, var(--foreground) 92%, var(--chart-3) 8%)",
  },
  {
    id: "amber",
    label: "Amber",
    color: "color-mix(in oklab, var(--chart-5) 32%, var(--card) 68%)",
    textColor: "color-mix(in oklab, var(--foreground) 84%, var(--chart-5) 16%)",
  },
  {
    id: "rose",
    label: "Rose",
    color: "color-mix(in oklab, var(--destructive) 22%, var(--card) 78%)",
    textColor: "color-mix(in oklab, var(--foreground) 92%, var(--destructive) 8%)",
  },
]

export const DEFAULT_CANVAS_NODE_COLOR_THEME = CANVAS_NODE_COLOR_THEMES[0]

export type CanvasNodeData = {
  label: string
  color: string
  textColor: string
  shape: CanvasNodeShape
}

export type CanvasNode = Node<CanvasNodeData, "canvasNode">

export type CanvasEdgeData = {
  label: string
}

export type CanvasEdge = Edge<CanvasEdgeData, "canvasEdge">
