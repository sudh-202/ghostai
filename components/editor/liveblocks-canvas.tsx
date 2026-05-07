"use client"

import {
  createContext,
  type CSSProperties,
  type DragEvent,
  type KeyboardEvent,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react"
import { LiveMap, LiveObject } from "@liveblocks/client"
import { ClientSideSuspense, LiveblocksProvider, RoomProvider, useCanRedo, useCanUndo, useErrorListener, useMutation, useRedo, useStatus, useUndo } from "@liveblocks/react"
import { useLiveblocksFlow, type LiveblocksFlow } from "@liveblocks/react-flow"
import {
  addEdge,
  Background,
  BackgroundVariant,
  BaseEdge,
  ConnectionMode,
  EdgeLabelRenderer,
  getSmoothStepPath,
  Handle,
  MarkerType,
  type EdgeProps,
  NodeResizer,
  NodeToolbar,
  Panel,
  Position,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type NodeProps,
} from "@xyflow/react"
import {
  Circle,
  Cylinder,
  Diamond,
  Hexagon,
  Maximize2,
  Pill,
  Redo2,
  RectangleHorizontal,
  Undo2,
  ZoomIn,
  ZoomOut,
  type LucideIcon,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  cloneCanvasTemplate,
  type CanvasTemplate,
} from "@/components/editor/starter-templates"
import { cn } from "@/lib/utils"
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts"
import {
  CANVAS_NODE_COLOR_THEMES,
  DEFAULT_CANVAS_NODE_COLOR_THEME,
} from "@/types/canvas"
import type {
  CanvasNodeColorTheme,
  CanvasEdge,
  CanvasNode,
  CanvasNodeShape,
  CanvasShapeSize,
} from "@/types/canvas"

type LiveblocksCanvasProps = {
  roomId: string
  templateImportRequest?: {
    requestId: number
    template: CanvasTemplate
  } | null
}

type ShapeToolbarItem = {
  shape: CanvasNodeShape
  icon: LucideIcon
  label: string
  size: CanvasShapeSize
}

type ShapeDragPayload = {
  shape: CanvasNodeShape
  size: CanvasShapeSize
}

type ShapeDragPreviewState = ShapeDragPayload & {
  x: number
  y: number
}

const SHAPE_DRAG_MIME_TYPE = "application/x-ghost-ai-shape"
const RESTING_SHAPE_STROKE = "oklch(1 0 0 / 0.18)"
const SELECTED_SHAPE_STROKE = "oklch(0.92 0.04 244 / 0.86)"
const DRAG_PREVIEW_CURSOR_OFFSET = 18
const MIN_CANVAS_NODE_WIDTH = 120
const MIN_CANVAS_NODE_HEIGHT = 72
const EMPTY_LABEL_PLACEHOLDER = "Add label"
const EMPTY_EDGE_LABEL_HINT = "Add label"
const HANDLE_BASE_CLASS_NAME =
  "!h-3.5 !w-3.5 !border-2 !border-background/90 !bg-primary/80 !shadow-[0_0_0_1px_rgba(255,255,255,0.12)] transition-opacity"
const SOURCE_HANDLE_CLASS_NAME =
  "z-10 opacity-0 pointer-events-none group-hover/canvas-node:opacity-100 group-hover/canvas-node:pointer-events-auto"
const TARGET_HANDLE_CLASS_NAME =
  "z-20 opacity-0 pointer-events-none [&.connectionindicator]:opacity-100 [&.connectionindicator]:pointer-events-auto [&.connectionindicator]:shadow-[0_0_0_1px_rgba(255,255,255,0.18),0_0_14px_-6px_var(--color-primary)]"
const DEFAULT_CANVAS_EDGE_STROKE = "oklch(0.92 0.02 245 / 0.56)"
const ACTIVE_CANVAS_EDGE_STROKE = "oklch(0.98 0.01 255 / 0.92)"
const DEFAULT_CANVAS_EDGE_OPTIONS = {
  type: "canvasEdge",
  markerEnd: {
    type: MarkerType.ArrowClosed,
  },
  style: {
    strokeLinecap: "round",
    strokeLinejoin: "round",
  },
} as const
const NODE_HANDLE_POSITIONS = [
  {
    id: "top",
    position: Position.Top,
    className: "!top-0 left-1/2 -translate-x-1/2 -translate-y-1/2",
  },
  {
    id: "right",
    position: Position.Right,
    className: "!right-0 top-1/2 translate-x-1/2 -translate-y-1/2",
  },
  {
    id: "bottom",
    position: Position.Bottom,
    className: "!bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2",
  },
  {
    id: "left",
    position: Position.Left,
    className: "!left-0 top-1/2 -translate-x-1/2 -translate-y-1/2",
  },
] as const
const SHAPE_TOOLBAR_ITEMS: ShapeToolbarItem[] = [
  {
    shape: "rectangle",
    icon: RectangleHorizontal,
    label: "Rectangle",
    size: { width: 220, height: 124 },
  },
  {
    shape: "diamond",
    icon: Diamond,
    label: "Diamond",
    size: { width: 188, height: 188 },
  },
  {
    shape: "circle",
    icon: Circle,
    label: "Circle",
    size: { width: 156, height: 156 },
  },
  {
    shape: "pill",
    icon: Pill,
    label: "Pill",
    size: { width: 228, height: 112 },
  },
  {
    shape: "cylinder",
    icon: Cylinder,
    label: "Cylinder",
    size: { width: 196, height: 148 },
  },
  {
    shape: "hexagon",
    icon: Hexagon,
    label: "Hexagon",
    size: { width: 210, height: 156 },
  },
]

const canvasNodeTypes = {
  canvasNode: CanvasNodeCard,
}

type CanvasEdgeUiContextValue = {
  editingEdgeId: string | null
  hoveredEdgeId: string | null
  setEditingEdgeId: (edgeId: string | null) => void
  setHoveredEdgeId: (edgeId: string | null) => void
}

const CanvasEdgeUiContext = createContext<CanvasEdgeUiContextValue | null>(null)

function useCanvasEdgeUi() {
  const context = useContext(CanvasEdgeUiContext)

  if (!context) {
    throw new Error("CanvasEdgeUiContext is unavailable.")
  }

  return context
}

function getCanvasNodeTextColor(textColor?: string) {
  return textColor ?? DEFAULT_CANVAS_NODE_COLOR_THEME.textColor
}

function isActiveNodeColorTheme(
  theme: CanvasNodeColorTheme,
  nodeColor: string,
  nodeTextColor?: string
) {
  return (
    nodeColor === theme.color &&
    getCanvasNodeTextColor(nodeTextColor) === theme.textColor
  )
}

function createInitialStorage(): Liveblocks["Storage"] {
  return {
    flow: new LiveObject({
      nodes: new LiveMap(),
      edges: new LiveMap(),
    }) as LiveblocksFlow<CanvasNode, CanvasEdge>,
  }
}

function CanvasLoadingState() {
  return (
    <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
      Connecting collaborative canvas…
    </div>
  )
}

function CanvasErrorState({ message }: { message: string }) {
  return (
    <div className="flex h-full items-center justify-center p-6">
      <div className="max-w-sm rounded-2xl border border-destructive/30 bg-destructive/10 px-5 py-4 text-center">
        <p className="text-sm font-medium text-foreground">
          Live collaboration is unavailable
        </p>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          {message}
        </p>
      </div>
    </div>
  )
}

function getShapeStrokeColor(selected: boolean) {
  return selected ? SELECTED_SHAPE_STROKE : RESTING_SHAPE_STROKE
}

function getNodeHandleClassName(shape: CanvasNodeShape, className: string) {
  if (shape !== "cylinder") {
    return className
  }

  return className
    .replace("!top-0", "!top-[8%]")
    .replace("!right-0", "!right-[3%]")
    .replace("!bottom-0", "!bottom-[8%]")
    .replace("!left-0", "!left-[3%]")
}

function getTransparentDragImage() {
  if (typeof document === "undefined") {
    return null
  }

  const canvas = document.createElement("canvas")
  canvas.width = 1
  canvas.height = 1

  return canvas
}

function CanvasShapeFigure({
  color,
  shape,
  selected = false,
}: {
  color: string
  shape: CanvasNodeShape
  selected?: boolean
}) {
  const strokeColor = getShapeStrokeColor(selected)

  if (shape === "rectangle" || shape === "pill" || shape === "circle") {
    return (
      <div
        className={cn(
          "h-full w-full border shadow-[0_22px_50px_-32px_rgba(0,0,0,0.95)] transition-colors",
          shape === "rectangle" && "rounded-[1.75rem]",
          shape === "pill" && "rounded-full",
          shape === "circle" && "rounded-full",
          selected ? "border-primary/70" : "border-white/15"
        )}
        style={{ backgroundColor: color }}
      />
    )
  }

  if (shape === "diamond") {
    return (
      <svg
        aria-hidden="true"
        className="h-full w-full drop-shadow-[0_22px_50px_rgba(0,0,0,0.38)]"
        preserveAspectRatio="none"
        viewBox="0 0 100 100"
      >
        <polygon
          fill={color}
          points="50,1 99,50 50,99 1,50"
          stroke={strokeColor}
          strokeWidth="2.2"
        />
      </svg>
    )
  }

  if (shape === "hexagon") {
    return (
      <svg
        aria-hidden="true"
        className="h-full w-full drop-shadow-[0_22px_50px_rgba(0,0,0,0.38)]"
        preserveAspectRatio="none"
        viewBox="0 0 100 100"
      >
        <polygon
          fill={color}
          points="21,2 79,2 99,50 79,98 21,98 1,50"
          stroke={strokeColor}
          strokeWidth="2.2"
        />
      </svg>
    )
  }

  return (
    <svg
      aria-hidden="true"
      className="h-full w-full drop-shadow-[0_22px_50px_rgba(0,0,0,0.38)]"
      preserveAspectRatio="none"
      viewBox="0 0 100 100"
    >
      <path
        d="M3 13C3 5 97 5 97 13V87C97 95 3 95 3 87Z"
        fill={color}
        stroke={strokeColor}
        strokeWidth="2.2"
      />
      <ellipse
        cx="50"
        cy="13"
        fill={color}
        rx="47"
        ry="11"
        stroke={strokeColor}
        strokeWidth="2.2"
      />
      <path
        d="M3 87C3 95 97 95 97 87"
        fill="none"
        stroke={strokeColor}
        strokeWidth="2.2"
      />
    </svg>
  )
}

function CanvasEdgeRenderer({
  data,
  id,
  interactionWidth,
  markerEnd,
  selected,
  sourcePosition,
  sourceX,
  sourceY,
  style,
  targetPosition,
  targetX,
  targetY,
}: EdgeProps<CanvasEdge>) {
  const { editingEdgeId, hoveredEdgeId, setEditingEdgeId } = useCanvasEdgeUi()
  const [draftLabel, setDraftLabel] = useState(data?.label ?? "")
  const inputRef = useRef<HTMLInputElement>(null)
  const isEditing = editingEdgeId === id
  const isHovered = hoveredEdgeId === id
  const isActive = selected || isHovered || isEditing
  const edgeLabel = data?.label ?? ""
  const hasLabel = edgeLabel.trim().length > 0
  const stroke = isActive ? ACTIVE_CANVAS_EDGE_STROKE : DEFAULT_CANVAS_EDGE_STROKE

  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourcePosition,
    sourceX,
    sourceY,
    targetPosition,
    targetX,
    targetY,
  })

  const updateEdgeLabel = useMutation(
    ({ storage }, nextLabel: string) => {
      const flow = storage.get("flow")

      if (!flow) {
        return
      }

      const edge = flow.get("edges").get(id)

      if (!edge) {
        return
      }

      const edgeData = edge.get("data")

      if (edgeData) {
        edgeData.set("label", nextLabel)
        return
      }

      edge.set("data", new LiveObject({
        label: nextLabel,
      }))
    },
    [id]
  )

  useEffect(() => {
    if (!isEditing) {
      return
    }

    const frame = window.requestAnimationFrame(() => {
      const input = inputRef.current

      if (!input) {
        return
      }

      input.focus()
      input.select()
    })

    return () => window.cancelAnimationFrame(frame)
  }, [isEditing])

  function openEditor() {
    setDraftLabel(edgeLabel)
    setEditingEdgeId(id)
  }

  function saveLabel() {
    updateEdgeLabel(draftLabel)
    setEditingEdgeId(null)
  }

  function handleEditorKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" || event.key === "Escape") {
      event.preventDefault()
      event.stopPropagation()
      saveLabel()
      event.currentTarget.blur()
    }
  }

  return (
    <>
      <BaseEdge
        interactionWidth={interactionWidth ?? 28}
        markerEnd={markerEnd}
        path={edgePath}
        style={{
          ...style,
          stroke,
          strokeLinecap: "round",
          strokeLinejoin: "round",
          strokeWidth: isActive ? 2.35 : 2.05,
        }}
      />
      <EdgeLabelRenderer>
        {isEditing ? (
          <input
            ref={inputRef}
            className="nodrag nopan nowheel absolute rounded-full border border-white/12 bg-background/96 px-3 py-1 text-center text-xs font-medium text-foreground shadow-[0_16px_34px_-22px_rgba(0,0,0,0.95)] outline-none focus:border-primary/45"
            onBlur={saveLabel}
            onChange={(event) => setDraftLabel(event.target.value)}
            onDoubleClick={(event) => event.stopPropagation()}
            onKeyDown={handleEditorKeyDown}
            onPointerDown={(event) => event.stopPropagation()}
            style={{
              pointerEvents: "all",
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              width: `${Math.max(draftLabel.length, EMPTY_EDGE_LABEL_HINT.length - 2, 5)}ch`,
            }}
            value={draftLabel}
          />
        ) : hasLabel || isActive ? (
          <button
            className={cn(
              "nodrag nopan nowheel absolute rounded-full border px-2.5 py-1 text-[0.7rem] font-medium shadow-[0_16px_34px_-22px_rgba(0,0,0,0.95)] transition-colors",
              hasLabel
                ? "border-white/12 bg-background/94 text-foreground/88 hover:border-white/18 hover:text-foreground"
                : "border-white/8 bg-background/70 text-muted-foreground/55 hover:border-white/12 hover:text-muted-foreground/75"
            )}
            onDoubleClick={(event) => {
              event.stopPropagation()
              openEditor()
            }}
            onPointerDown={(event) => event.stopPropagation()}
            style={{
              pointerEvents: "all",
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            }}
            type="button"
          >
            {hasLabel ? edgeLabel : EMPTY_EDGE_LABEL_HINT}
          </button>
        ) : null}
      </EdgeLabelRenderer>
    </>
  )
}

const canvasEdgeTypes = {
  canvasEdge: CanvasEdgeRenderer,
}

function CanvasNodeCard({
  data,
  height,
  id,
  isConnectable,
  selected,
  width,
}: NodeProps<CanvasNode>) {
  const [isEditing, setIsEditing] = useState(false)
  const [draftLabel, setDraftLabel] = useState(data.label)
  const labelInputRef = useRef<HTMLTextAreaElement>(null)
  const nodeTextColor = getCanvasNodeTextColor(data.textColor)

  const updateNodeLabel = useMutation(
    ({ storage }, nextLabel: string) => {
      const flow = storage.get("flow")

      if (!flow) {
        return
      }

      const node = flow.get("nodes").get(id)

      if (!node) {
        return
      }

      node.get("data").set("label", nextLabel)
    },
    [id]
  )

  const updateNodeColors = useMutation(
    ({ storage }, theme: CanvasNodeColorTheme) => {
      const flow = storage.get("flow")

      if (!flow) {
        return
      }

      const node = flow.get("nodes").get(id)

      if (!node) {
        return
      }

      const nodeData = node.get("data")

      nodeData.set("color", theme.color)
      nodeData.set("textColor", theme.textColor)
    },
    [id]
  )

  useEffect(() => {
    if (!isEditing) {
      return
    }

    const frame = window.requestAnimationFrame(() => {
      const textarea = labelInputRef.current

      if (!textarea) {
        return
      }

      textarea.focus()
      textarea.select()
    })

    return () => window.cancelAnimationFrame(frame)
  }, [isEditing])

  useEffect(() => {
    if (!isEditing) {
      return
    }

    const textarea = labelInputRef.current

    if (!textarea) {
      return
    }

    textarea.style.height = "0px"
    textarea.style.height = `${Math.min(
      textarea.scrollHeight,
      Math.max((height ?? MIN_CANVAS_NODE_HEIGHT) - 24, textarea.scrollHeight)
    )}px`
  }, [draftLabel, height, isEditing])

  function openInlineEditor() {
    setDraftLabel(data.label)
    setIsEditing(true)
  }

  function closeInlineEditor() {
    setIsEditing(false)
  }

  function handleLabelChange(nextLabel: string) {
    setDraftLabel(nextLabel)
    updateNodeLabel(nextLabel)
  }

  function handleLabelKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== "Escape") {
      return
    }

    event.preventDefault()
    event.stopPropagation()
    closeInlineEditor()
    event.currentTarget.blur()
  }

  return (
    <div className="group/canvas-node relative h-full w-full">
      {selected ? (
        <NodeToolbar
          align="center"
          className="nodrag nopan nowheel"
          offset={18}
          position={Position.Top}
        >
          <div className="flex items-center gap-1 rounded-full border border-border/70 bg-sidebar/96 p-1.5 shadow-[0_18px_40px_-26px_rgba(0,0,0,0.95)] backdrop-blur-xl">
            {CANVAS_NODE_COLOR_THEMES.map((theme) => {
              const isActive = isActiveNodeColorTheme(theme, data.color, data.textColor)

              return (
                <button
                  key={theme.id}
                  aria-label={`Apply ${theme.label} node colors`}
                  className={cn(
                    "nodrag nopan nowheel flex h-7 w-7 items-center justify-center rounded-full border border-white/10 transition-all duration-150 outline-none hover:[box-shadow:0_0_0_1px_var(--swatch-glow),0_0_10px_-6px_var(--swatch-glow)]",
                    isActive
                      ? "scale-105 border-white/30 bg-background/45"
                      : "bg-background/20 hover:scale-[1.03] hover:border-white/18"
                  )}
                  onClick={() => updateNodeColors(theme)}
                  onPointerDown={(event) => event.stopPropagation()}
                  style={
                    {
                      "--swatch-glow": theme.textColor,
                      boxShadow: isActive
                        ? `0 0 0 1px ${theme.textColor}, 0 0 12px -6px ${theme.textColor}`
                        : undefined,
                    } as CSSProperties
                  }
                  title={theme.label}
                  type="button"
                >
                  <span
                    aria-hidden="true"
                    className="flex h-[1.125rem] w-[1.125rem] items-center justify-center rounded-full border border-black/10 transition-[box-shadow]"
                    style={
                      {
                        backgroundColor: theme.color,
                        boxShadow: `inset 0 0 0 1px color-mix(in oklab, ${theme.textColor} 20%, transparent)`,
                      } as CSSProperties
                    }
                  >
                    <span
                      className="h-1.5 w-1.5 rounded-full"
                      style={{ backgroundColor: theme.textColor }}
                    />
                  </span>
                </button>
              )
            })}
          </div>
        </NodeToolbar>
      ) : null}
      <NodeResizer
        autoScale
        color="oklch(0.84 0.03 248 / 0.95)"
        handleClassName="!h-3 !w-3 !rounded-full !border !border-background/80 !bg-card/95 shadow-[0_0_0_1px_rgba(255,255,255,0.08)]"
        isVisible={selected}
        lineClassName="!border-white/12"
        minHeight={MIN_CANVAS_NODE_HEIGHT}
        minWidth={MIN_CANVAS_NODE_WIDTH}
      />
      {NODE_HANDLE_POSITIONS.map((handle) => (
        <Handle
          key={`${handle.id}-source`}
          className={cn(
            HANDLE_BASE_CLASS_NAME,
            SOURCE_HANDLE_CLASS_NAME,
            getNodeHandleClassName(data.shape, handle.className),
            selected
              ? "opacity-100 pointer-events-auto"
              : ""
          )}
          id={`${handle.id}-source`}
          isConnectable={isConnectable}
          isConnectableEnd={false}
          position={handle.position}
          type="source"
        />
      ))}
      {NODE_HANDLE_POSITIONS.map((handle) => (
        <Handle
          key={`${handle.id}-target`}
          className={cn(
            HANDLE_BASE_CLASS_NAME,
            TARGET_HANDLE_CLASS_NAME,
            getNodeHandleClassName(data.shape, handle.className),
            selected
              ? "[&.connectionindicator]:opacity-100 [&.connectionindicator]:pointer-events-auto"
              : ""
          )}
          id={`${handle.id}-target`}
          isConnectable={isConnectable}
          isConnectableStart={false}
          position={handle.position}
          type="target"
        />
      ))}
      <CanvasShapeFigure color={data.color} selected={selected} shape={data.shape} />
      <div className="absolute inset-0 flex items-center justify-center px-6 py-4">
        {isEditing ? (
          <textarea
            ref={labelInputRef}
            className="nodrag nopan nowheel block max-h-full w-full resize-none overflow-hidden rounded-xl border border-white/10 bg-background/82 px-3 py-1.5 text-center text-sm font-medium leading-6 outline-none ring-0 placeholder:text-muted-foreground/45 focus:border-primary/45"
            onBlur={closeInlineEditor}
            onChange={(event) => handleLabelChange(event.target.value)}
            onDoubleClick={(event) => event.stopPropagation()}
            onKeyDown={handleLabelKeyDown}
            onPointerDown={(event) => event.stopPropagation()}
            placeholder={EMPTY_LABEL_PLACEHOLDER}
            rows={1}
            style={{
              maxWidth: Math.max((width ?? MIN_CANVAS_NODE_WIDTH) - 32, 64),
              minHeight: "calc(1lh + 0.75rem)",
              color: nodeTextColor,
            }}
            value={draftLabel}
          />
        ) : (
          <button
            className="nodrag nopan flex w-full items-center justify-center rounded-xl px-3 py-2 text-center"
            onDoubleClick={openInlineEditor}
            type="button"
          >
            <span
              className={cn(
                "text-sm font-medium leading-6",
                data.label ? "" : "text-muted-foreground/45"
              )}
              style={data.label ? { color: nodeTextColor } : undefined}
            >
              {data.label || EMPTY_LABEL_PLACEHOLDER}
            </span>
          </button>
        )}
      </div>
    </div>
  )
}

function ShapeDragPreview({ preview }: { preview: ShapeDragPreviewState }) {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed left-0 top-0 z-50 opacity-90"
      style={{
        transform: `translate(${preview.x + DRAG_PREVIEW_CURSOR_OFFSET}px, ${preview.y + DRAG_PREVIEW_CURSOR_OFFSET}px)`,
      }}
    >
      <div
        className="relative"
        style={{
          width: preview.size.width,
          height: preview.size.height,
        }}
      >
        <CanvasShapeFigure
          color={DEFAULT_CANVAS_NODE_COLOR_THEME.color}
          shape={preview.shape}
        />
      </div>
    </div>
  )
}

function parseShapeDragPayload(event: DragEvent<HTMLElement>): ShapeDragPayload | null {
  const payload = event.dataTransfer.getData(SHAPE_DRAG_MIME_TYPE)

  if (!payload) {
    return null
  }

  try {
    const data = JSON.parse(payload) as Partial<ShapeDragPayload>

    if (
      typeof data.shape !== "string" ||
      typeof data.size?.width !== "number" ||
      typeof data.size?.height !== "number"
    ) {
      return null
    }

    return {
      shape: data.shape as CanvasNodeShape,
      size: {
        width: data.size.width,
        height: data.size.height,
      },
    }
  } catch {
    return null
  }
}

const CONTROL_BUTTON_CLASS =
  "rounded-full border border-transparent bg-transparent text-muted-foreground/75 hover:border-border/70 hover:bg-background/70 hover:text-foreground disabled:pointer-events-none disabled:opacity-35"

function CanvasControlBar({
  canRedo,
  canUndo,
  onRedo,
  onUndo,
}: {
  canRedo: boolean
  canUndo: boolean
  onRedo: () => void
  onUndo: () => void
}) {
  const reactFlow = useReactFlow<CanvasNode, CanvasEdge>()

  return (
    <Panel className="pointer-events-none !bottom-6 !left-6" position="bottom-left">
      <div className="pointer-events-auto flex items-center gap-0.5 rounded-full border border-border/70 bg-sidebar/92 p-1.5 shadow-2xl shadow-black/35 backdrop-blur-xl">
        <Button
          aria-label="Zoom out"
          className={CONTROL_BUTTON_CLASS}
          onClick={() => reactFlow.zoomOut({ duration: 200 })}
          size="icon-sm"
          variant="ghost"
        >
          <ZoomOut aria-hidden="true" />
        </Button>
        <Button
          aria-label="Fit view"
          className={CONTROL_BUTTON_CLASS}
          onClick={() => reactFlow.fitView({ duration: 300 })}
          size="icon-sm"
          variant="ghost"
        >
          <Maximize2 aria-hidden="true" />
        </Button>
        <Button
          aria-label="Zoom in"
          className={CONTROL_BUTTON_CLASS}
          onClick={() => reactFlow.zoomIn({ duration: 200 })}
          size="icon-sm"
          variant="ghost"
        >
          <ZoomIn aria-hidden="true" />
        </Button>
        <div aria-hidden="true" className="mx-1 h-4 w-px bg-border/60" />
        <Button
          aria-label="Undo"
          className={CONTROL_BUTTON_CLASS}
          disabled={!canUndo}
          onClick={onUndo}
          size="icon-sm"
          variant="ghost"
        >
          <Undo2 aria-hidden="true" />
        </Button>
        <Button
          aria-label="Redo"
          className={CONTROL_BUTTON_CLASS}
          disabled={!canRedo}
          onClick={onRedo}
          size="icon-sm"
          variant="ghost"
        >
          <Redo2 aria-hidden="true" />
        </Button>
      </div>
    </Panel>
  )
}

function ShapeToolbar({
  onShapeDragEnd,
  onShapeDragStart,
}: {
  onShapeDragEnd: () => void
  onShapeDragStart: (event: DragEvent<HTMLButtonElement>, payload: ShapeDragPayload) => void
}) {
  return (
    <Panel className="pointer-events-none !bottom-6" position="bottom-center">
      <div className="pointer-events-auto flex items-center gap-1 rounded-full border border-border/70 bg-sidebar/92 p-1.5 shadow-2xl shadow-black/35 backdrop-blur-xl">
        {SHAPE_TOOLBAR_ITEMS.map(({ shape, icon: Icon, label, size }) => (
          <Button
            key={shape}
            aria-label={`Drag ${label} shape`}
            className="rounded-full border border-transparent bg-transparent text-muted-foreground/75 hover:border-border/70 hover:bg-background/70 hover:text-foreground"
            draggable
            onDragEnd={onShapeDragEnd}
            onDragStart={(event) => onShapeDragStart(event, { shape, size })}
            size="icon-sm"
            title={label}
            variant="ghost"
          >
            <Icon aria-hidden="true" />
          </Button>
        ))}
      </div>
    </Panel>
  )
}

function CollaborativeCanvasFlow({
  templateImportRequest,
}: Pick<LiveblocksCanvasProps, "templateImportRequest">) {
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [dragPreview, setDragPreview] = useState<ShapeDragPreviewState | null>(null)
  const [editingEdgeId, setEditingEdgeId] = useState<string | null>(null)
  const [hoveredEdgeId, setHoveredEdgeId] = useState<string | null>(null)
  const nodeIdCounterRef = useRef(0)
  const isShapeDragging = dragPreview !== null
  const status = useStatus()
  const reactFlow = useReactFlow<CanvasNode, CanvasEdge>()
  const undo = useUndo()
  const redo = useRedo()
  const canUndo = useCanUndo()
  const canRedo = useCanRedo()

  useKeyboardShortcuts({ reactFlow, onUndo: undo, onRedo: redo })

  useErrorListener((error) => {
    setErrorMessage(error.message)
  })

  const {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onDelete,
  } = useLiveblocksFlow<CanvasNode, CanvasEdge>({
    suspense: true,
    nodes: {
      initial: [],
    },
    edges: {
      initial: [],
    },
    storageKey: "flow",
  })

  const importTemplate = useMutation(
    ({ storage }, template: CanvasTemplate) => {
      const flow = storage.get("flow")

      if (!flow) {
        return
      }

      const nextTemplate = cloneCanvasTemplate(template)
      const nextNodes = new LiveMap(
        nextTemplate.nodes.map((node) => [
          node.id,
          new LiveObject({
            id: node.id,
            type: node.type,
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
          }),
        ])
      )

      const nextEdges = new LiveMap(
        nextTemplate.edges.map((edge) => [
          edge.id,
          new LiveObject({
            id: edge.id,
            source: edge.source,
            target: edge.target,
            type: edge.type ?? DEFAULT_CANVAS_EDGE_OPTIONS.type,
            sourceHandle: edge.sourceHandle,
            targetHandle: edge.targetHandle,
            data: new LiveObject({
              label: edge.data?.label ?? "",
            }),
          }),
        ])
      )

      flow.set("nodes", nextNodes as never)
      flow.set("edges", nextEdges as never)
    },
    []
  )

  useEffect(() => {
    if (!isShapeDragging) {
      return
    }

    function handleWindowDragOver(event: globalThis.DragEvent) {
      setDragPreview((current) => {
        if (!current) {
          return null
        }

        return {
          ...current,
          x: event.clientX,
          y: event.clientY,
        }
      })
    }

    function handleWindowDrop() {
      setDragPreview(null)
    }

    window.addEventListener("dragover", handleWindowDragOver)
    window.addEventListener("drop", handleWindowDrop)

    return () => {
      window.removeEventListener("dragover", handleWindowDragOver)
      window.removeEventListener("drop", handleWindowDrop)
    }
  }, [isShapeDragging])

  useEffect(() => {
    if (!templateImportRequest) {
      return
    }

    importTemplate(templateImportRequest.template)

    let cancelled = false
    let nextFrame = 0
    const frame = window.requestAnimationFrame(() => {
      nextFrame = window.requestAnimationFrame(() => {
        if (!cancelled) {
          reactFlow.fitView({ duration: 320, padding: 0.18 })
        }
      })
    })

    return () => {
      cancelled = true
      window.cancelAnimationFrame(frame)
      window.cancelAnimationFrame(nextFrame)
    }
  }, [importTemplate, reactFlow, templateImportRequest])

  function handleShapeDragStart(
    event: DragEvent<HTMLButtonElement>,
    payload: ShapeDragPayload
  ) {
    const transparentDragImage = getTransparentDragImage()

    event.dataTransfer.effectAllowed = "copy"
    event.dataTransfer.setData(SHAPE_DRAG_MIME_TYPE, JSON.stringify(payload))

    if (transparentDragImage) {
      event.dataTransfer.setDragImage(transparentDragImage, 0, 0)
    }

    setDragPreview({
      ...payload,
      x: event.clientX,
      y: event.clientY,
    })
  }

  function handleShapeDragEnd() {
    setDragPreview(null)
  }

  function handleEdgeConnect(connection: Parameters<typeof addEdge>[0]) {
    const nextEdges = addEdge(
      {
        ...DEFAULT_CANVAS_EDGE_OPTIONS,
        ...connection,
        data: {
          label: "",
        },
      },
      edges
    )

    if (nextEdges.length === edges.length) {
      return
    }

    const nextEdge = nextEdges.at(-1)

    if (!nextEdge) {
      return
    }

    onEdgesChange([
      {
        type: "add",
        item: nextEdge as CanvasEdge,
      },
    ])
  }

  function handleCanvasDragOver(event: DragEvent<HTMLDivElement>) {
    if (!Array.from(event.dataTransfer.types).includes(SHAPE_DRAG_MIME_TYPE)) {
      return
    }

    event.preventDefault()
    event.dataTransfer.dropEffect = "copy"
  }

  function handleCanvasDrop(event: DragEvent<HTMLDivElement>) {
    const payload = parseShapeDragPayload(event)

    if (!payload) {
      return
    }

    event.preventDefault()

    const position = reactFlow.screenToFlowPosition({
      x: event.clientX,
      y: event.clientY,
    })
    const nodeCounter = nodeIdCounterRef.current
    const timestamp = Date.now()

    nodeIdCounterRef.current += 1
    setDragPreview(null)

    onNodesChange([
      {
        type: "add",
        item: {
          id: `${payload.shape}-${timestamp}-${nodeCounter}`,
          type: "canvasNode",
          position,
          width: payload.size.width,
          height: payload.size.height,
          data: {
            label: "",
            color: DEFAULT_CANVAS_NODE_COLOR_THEME.color,
            textColor: DEFAULT_CANVAS_NODE_COLOR_THEME.textColor,
            shape: payload.shape,
          },
        },
      },
    ])
  }

  if (status === "disconnected" && errorMessage) {
    return <CanvasErrorState message={errorMessage} />
  }

  return (
    <CanvasEdgeUiContext.Provider
      value={{
        editingEdgeId,
        hoveredEdgeId,
        setEditingEdgeId,
        setHoveredEdgeId,
      }}
    >
      <>
        <ReactFlow
          className="bg-transparent"
          connectionMode={ConnectionMode.Loose}
          defaultEdgeOptions={DEFAULT_CANVAS_EDGE_OPTIONS}
          defaultMarkerColor={DEFAULT_CANVAS_EDGE_STROKE}
          edgeTypes={canvasEdgeTypes}
          edges={edges}
          fitView
          nodeTypes={canvasNodeTypes}
          nodes={nodes}
          onConnect={handleEdgeConnect}
          onDragOver={handleCanvasDragOver}
          onDelete={onDelete}
          onDrop={handleCanvasDrop}
          onEdgeDoubleClick={(_, edge) => setEditingEdgeId(edge.id)}
          onEdgeMouseEnter={(_, edge) => setHoveredEdgeId(edge.id)}
          onEdgeMouseLeave={(_, edge) => {
            setHoveredEdgeId((current) => (current === edge.id ? null : current))
          }}
          onEdgesChange={onEdgesChange}
          onNodesChange={onNodesChange}
          onPaneClick={() => {
            setEditingEdgeId(null)
            setHoveredEdgeId(null)
          }}
        >
          <CanvasControlBar
            canRedo={canRedo}
            canUndo={canUndo}
            onRedo={redo}
            onUndo={undo}
          />
          <Background
            color="oklch(1 0 0 / 0.08)"
            gap={24}
            id="ghost-ai-canvas-dots"
            size={1.4}
            variant={BackgroundVariant.Dots}
          />
          <ShapeToolbar
            onShapeDragEnd={handleShapeDragEnd}
            onShapeDragStart={handleShapeDragStart}
          />
        </ReactFlow>
        {dragPreview ? <ShapeDragPreview preview={dragPreview} /> : null}
      </>
    </CanvasEdgeUiContext.Provider>
  )
}

export function LiveblocksCanvas({
  roomId,
  templateImportRequest = null,
}: LiveblocksCanvasProps) {
  return (
    <LiveblocksProvider
      authEndpoint={async (room) => {
        const response = await fetch("/api/liveblocks-auth", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ projectId: room }),
        })

        if (!response.ok) {
          const data = await response.json().catch(() => null)
          throw new Error(
            typeof data?.error === "string"
              ? data.error
              : "Unable to authorize the collaborative canvas."
          )
        }

        return await response.json()
      }}
    >
      <RoomProvider
        id={roomId}
        initialPresence={{
          cursor: null,
          isThinking: false,
        }}
        initialStorage={createInitialStorage}
      >
        <ClientSideSuspense fallback={<CanvasLoadingState />}>
          {() => (
            <ReactFlowProvider>
              <CollaborativeCanvasFlow
                templateImportRequest={templateImportRequest}
              />
            </ReactFlowProvider>
          )}
        </ClientSideSuspense>
      </RoomProvider>
    </LiveblocksProvider>
  )
}
