"use client"

import {
  createContext,
  type CSSProperties,
  type DragEvent,
  type KeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react"
import { LiveMap, LiveObject, shallow } from "@liveblocks/client"
import { ClientSideSuspense, LiveblocksProvider, RoomProvider, useCanRedo, useCanUndo, useErrorListener, useMutation, useOther, useOthers, useOthersConnectionIds, useRedo, useStatus, useUndo, useUpdateMyPresence } from "@liveblocks/react"
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
import { useAuth, UserButton } from "@clerk/nextjs"
import {
  Circle,
  Cloud,
  CloudOff,
  Cylinder,
  Diamond,
  Hexagon,
  Loader2,
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
import { clerkAppearance } from "@/lib/clerk-appearance"
import { cn } from "@/lib/utils"
import { useCanvasAutosave, type SaveStatus } from "@/hooks/useCanvasAutosave"
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
  onSaveStatusChange?: (status: SaveStatus) => void
  onRegisterSave?: (save: () => void) => void
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
const MIN_CANVAS_NODE_WIDTH = 120
const MIN_CANVAS_NODE_HEIGHT = 72
const EMPTY_LABEL_PLACEHOLDER = "Add label"
const EMPTY_EDGE_LABEL_HINT = "Add label"
const HANDLE_BASE_CLASS_NAME =
  "!h-3.5 !w-3.5 !border-2 !border-background/90 !bg-primary/80 !shadow-[0_0_0_1px_rgba(255,255,255,0.12)] transition-opacity"
const SOURCE_HANDLE_CLASS_NAME =
  "z-10 opacity-0 group-hover/canvas-node:opacity-100 group-hover/canvas-node:pointer-events-auto"
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
const CANVAS_PRESENCE_USER_BUTTON_APPEARANCE = {
  ...clerkAppearance,
  elements: {
    ...clerkAppearance.elements,
    avatarBox: {
      width: "1.75rem",
      height: "1.75rem",
      border: "1px solid color-mix(in oklab, var(--background) 82%, transparent)",
      boxShadow: "0 0 0 1px rgba(255,255,255,0.06)",
    },
  },
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

function getAvatarInitials(value: string) {
  return value
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("")
}

function CanvasPresenceAvatar({
  avatarUrl,
  label,
}: {
  avatarUrl: string | null
  label: string
}) {
  return (
    <div
      aria-hidden="true"
      className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full border border-background/80 bg-card text-[0.65rem] font-semibold text-foreground shadow-[0_0_0_1px_rgba(255,255,255,0.06)] ring-1 ring-white/8"
      title={label}
    >
      {avatarUrl ? (
        <span
          className="h-full w-full bg-cover bg-center"
          style={{ backgroundImage: `url("${avatarUrl.replace(/"/g, '\\"')}")` }}
        />
      ) : (
        getAvatarInitials(label || "U")
      )}
    </div>
  )
}

function CanvasPresenceCluster() {
  const { userId } = useAuth()
  const collaborators = useOthers(
    (others) => {
      const seenUserIds = new Set<string>()

      return others.reduce<
        Array<{
          userId: string
          displayName: string
          avatarUrl: string | null
        }>
      >((accumulator, other) => {
        const otherUserId = other.id

        if (!otherUserId || otherUserId === userId || seenUserIds.has(otherUserId)) {
          return accumulator
        }

        seenUserIds.add(otherUserId)
        accumulator.push({
          userId: otherUserId,
          displayName: other.info.displayName || "Collaborator",
          avatarUrl: other.info.avatarUrl || null,
        })

        return accumulator
      }, [])
    },
    shallow
  )

  const visibleCollaborators = collaborators.slice(0, 5)
  const overflowCount = Math.max(collaborators.length - visibleCollaborators.length, 0)

  return (
    <Panel className="pointer-events-none !right-5 !top-5" position="top-right">
      <div className="pointer-events-auto flex items-center rounded-full border border-border/70 bg-sidebar/92 p-1.5 shadow-2xl shadow-black/35 backdrop-blur-xl">
        {visibleCollaborators.length > 0 ? (
          <>
            <div className="flex items-center">
              {visibleCollaborators.map((collaborator, index) => (
                <div
                  key={collaborator.userId}
                  className={cn(index > 0 ? "-ml-2" : "", "relative")}
                >
                  <CanvasPresenceAvatar
                    avatarUrl={collaborator.avatarUrl}
                    label={collaborator.displayName}
                  />
                </div>
              ))}
              {overflowCount > 0 ? (
                <div className="-ml-2 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-background/80 bg-background/90 text-[0.65rem] font-semibold text-foreground shadow-[0_0_0_1px_rgba(255,255,255,0.06)] ring-1 ring-white/8">
                  +{overflowCount}
                </div>
              ) : null}
            </div>
            <div aria-hidden="true" className="mx-2 h-5 w-px bg-border/70" />
          </>
        ) : null}

        <UserButton appearance={CANVAS_PRESENCE_USER_BUTTON_APPEARANCE} />
      </div>
    </Panel>
  )
}

function RemoteCursor({
  connectionId,
  currentUserId,
}: {
  connectionId: number
  currentUserId: string | null
}) {
  const cursorData = useOther(
    connectionId,
    (other) => ({
      cursor: other.presence.cursor,
      thinking: other.presence.thinking,
      cursorColor: other.info.cursorColor,
      displayName: other.info.displayName,
      userId: other.id,
    }),
    shallow
  )

  if (
    !cursorData ||
    !cursorData.cursor ||
    (currentUserId && cursorData.userId === currentUserId)
  ) {
    return null
  }

  return (
    <div
      className="pointer-events-none absolute left-0 top-0 z-30"
      style={{
        transform: `translate(${cursorData.cursor.x}px, ${cursorData.cursor.y}px)`,
      }}
    >
      <div className="-translate-x-[2px] -translate-y-[2px]">
        <svg
          aria-hidden="true"
          className="h-4 w-4 drop-shadow-[0_6px_18px_rgba(0,0,0,0.55)]"
          fill="none"
          viewBox="0 0 16 16"
        >
          <path
            d="M2 1.75L12.7 8.05L7.6 8.9L9.9 14.25L7.55 15L5.3 9.65L2 13.6V1.75Z"
            fill={cursorData.cursorColor}
            stroke="rgba(8,10,14,0.85)"
            strokeLinejoin="round"
            strokeWidth="1"
          />
        </svg>
        <div
          className="mt-1 inline-flex max-w-40 items-center gap-1 rounded-full border px-2 py-0.5 text-[0.68rem] font-medium leading-5 text-white shadow-[0_10px_26px_-14px_rgba(0,0,0,0.9)]"
          style={{
            backgroundColor: cursorData.cursorColor,
            borderColor: "rgba(8,10,14,0.32)",
          }}
        >
          {cursorData.thinking && (
            <Loader2 aria-hidden="true" className="h-2.5 w-2.5 flex-shrink-0 animate-spin" />
          )}
          <span className="truncate">{cursorData.displayName || "Collaborator"}</span>
        </div>
      </div>
    </div>
  )
}

function CanvasRemoteCursors() {
  const { userId } = useAuth()
  const connectionIds = useOthersConnectionIds()

  return (
    <div className="pointer-events-none absolute inset-0 z-30 overflow-hidden">
      {connectionIds.map((connectionId) => (
        <RemoteCursor
          connectionId={connectionId}
          currentUserId={userId ?? null}
          key={connectionId}
        />
      ))}
    </div>
  )
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
        transform: `translate(${preview.x - preview.size.width / 2}px, ${preview.y - preview.size.height / 2}px)`,
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

const SAVE_STATUS_LABEL: Record<SaveStatus, string> = {
  idle: "Autosave on",
  saving: "Saving…",
  saved: "Saved",
  error: "Save error",
}

function CanvasControlBar({
  canRedo,
  canUndo,
  onRedo,
  onUndo,
  saveStatus,
}: {
  canRedo: boolean
  canUndo: boolean
  onRedo: () => void
  onUndo: () => void
  saveStatus: SaveStatus
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
        <div aria-hidden="true" className="mx-1 h-4 w-px bg-border/60" />
        <Button
          aria-label={SAVE_STATUS_LABEL[saveStatus]}
          className={cn(
            CONTROL_BUTTON_CLASS,
            "pointer-events-none",
            saveStatus === "error" && "!text-destructive/80",
            saveStatus === "saved" && "!text-emerald-400/75",
          )}
          size="icon-sm"
          title={SAVE_STATUS_LABEL[saveStatus]}
          variant="ghost"
        >
          {saveStatus === "saving" ? (
            <Loader2 aria-hidden="true" className="animate-spin" />
          ) : saveStatus === "error" ? (
            <CloudOff aria-hidden="true" />
          ) : (
            <Cloud aria-hidden="true" />
          )}
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
  roomId,
  templateImportRequest,
  onSaveStatusChange,
  onRegisterSave,
}: Pick<LiveblocksCanvasProps, "roomId" | "templateImportRequest" | "onSaveStatusChange" | "onRegisterSave">) {
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [dragPreview, setDragPreview] = useState<ShapeDragPreviewState | null>(null)
  const [editingEdgeId, setEditingEdgeId] = useState<string | null>(null)
  const [hoveredEdgeId, setHoveredEdgeId] = useState<string | null>(null)
  const [loadAttempted, setLoadAttempted] = useState(false)
  const nodeIdCounterRef = useRef(0)
  const didLoadRef = useRef(false)
  const isShapeDragging = dragPreview !== null
  const status = useStatus()
  const reactFlow = useReactFlow<CanvasNode, CanvasEdge>()
  const undo = useUndo()
  const redo = useRedo()
  const canUndo = useCanUndo()
  const canRedo = useCanRedo()
  const updateMyPresence = useUpdateMyPresence()

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

  const { status: saveStatus, save } = useCanvasAutosave({
    projectId: roomId,
    nodes,
    edges,
    enabled: loadAttempted,
  })

  const onSaveStatusChangeRef = useRef(onSaveStatusChange)
  onSaveStatusChangeRef.current = onSaveStatusChange
  const onRegisterSaveRef = useRef(onRegisterSave)
  onRegisterSaveRef.current = onRegisterSave

  useEffect(() => {
    onSaveStatusChangeRef.current?.(saveStatus)
  }, [saveStatus])

  useEffect(() => {
    onRegisterSaveRef.current?.(save)
  }, [save])

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

  const loadFromBlob = useMutation(
    ({ storage }, data: { nodes: CanvasNode[]; edges: CanvasEdge[] }) => {
      const flow = storage.get("flow")

      if (!flow) {
        return
      }

      const nextNodes = new LiveMap(
        data.nodes.map((node) => [
          node.id,
          new LiveObject({
            id: node.id,
            type: node.type,
            position: new LiveObject({ x: node.position.x, y: node.position.y }),
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
        data.edges.map((edge) => [
          edge.id,
          new LiveObject({
            id: edge.id,
            source: edge.source,
            target: edge.target,
            type: edge.type ?? DEFAULT_CANVAS_EDGE_OPTIONS.type,
            sourceHandle: edge.sourceHandle,
            targetHandle: edge.targetHandle,
            data: new LiveObject({ label: edge.data?.label ?? "" }),
          }),
        ])
      )

      flow.set("nodes", nextNodes as never)
      flow.set("edges", nextEdges as never)
    },
    []
  )

  useEffect(() => {
    if (didLoadRef.current) return
    didLoadRef.current = true

    if (nodes.length > 0 || edges.length > 0) {
      setLoadAttempted(true)
      return
    }

    fetch(`/api/projects/${roomId}/canvas`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.nodes?.length > 0 || data?.edges?.length > 0) {
          loadFromBlob(data)
          window.requestAnimationFrame(() => {
            window.requestAnimationFrame(() => {
              reactFlow.fitView({ duration: 320, padding: 0.18 })
            })
          })
        }
      })
      .catch(() => {})
      .finally(() => setLoadAttempted(true))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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

  useEffect(() => {
    function handleDeleteKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key !== "Delete" && event.key !== "Backspace") return

      const target = event.target
      if (target instanceof HTMLElement) {
        const tag = target.tagName
        if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target.isContentEditable) {
          return
        }
      }

      const selectedNodes = nodes.filter((n) => n.selected)
      const selectedNodeIds = new Set(selectedNodes.map((n) => n.id))
      const edgesToDelete = edges.filter(
        (e) => e.selected || selectedNodeIds.has(e.source) || selectedNodeIds.has(e.target)
      )

      if (selectedNodes.length === 0 && edgesToDelete.length === 0) return

      event.preventDefault()
      onDelete({ nodes: selectedNodes, edges: edgesToDelete })
    }

    window.addEventListener("keydown", handleDeleteKeyDown)
    return () => window.removeEventListener("keydown", handleDeleteKeyDown)
  }, [nodes, edges, onDelete])

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

    const center = reactFlow.screenToFlowPosition({
      x: event.clientX,
      y: event.clientY,
    })
    const position = {
      x: center.x - payload.size.width / 2,
      y: center.y - payload.size.height / 2,
    }
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

  function handleCanvasMouseMove(event: ReactMouseEvent<Element>) {
    const bounds = event.currentTarget.getBoundingClientRect()

    updateMyPresence({
      cursor: {
        x: event.clientX - bounds.left,
        y: event.clientY - bounds.top,
      },
    })
  }

  function clearCanvasCursor() {
    updateMyPresence({
      cursor: null,
    })
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
          deleteKeyCode={null}
          edgeTypes={canvasEdgeTypes}
          edges={edges}
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
          onMouseLeave={clearCanvasCursor}
          onMouseMove={handleCanvasMouseMove}
          onNodesChange={onNodesChange}
          onPaneClick={() => {
            setEditingEdgeId(null)
            setHoveredEdgeId(null)
          }}
        >
          <CanvasPresenceCluster />
          <CanvasRemoteCursors />
          <CanvasControlBar
            canRedo={canRedo}
            canUndo={canUndo}
            onRedo={redo}
            onUndo={undo}
            saveStatus={saveStatus}
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

export function LiveblocksWorkspaceProvider({
  roomId,
  children,
}: {
  roomId: string
  children: ReactNode
}) {
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
          thinking: false,
        }}
        initialStorage={createInitialStorage}
      >
        {children}
      </RoomProvider>
    </LiveblocksProvider>
  )
}

export function LiveblocksCanvas({
  roomId,
  templateImportRequest = null,
  onSaveStatusChange,
  onRegisterSave,
}: LiveblocksCanvasProps) {
  return (
    <ClientSideSuspense fallback={<CanvasLoadingState />}>
      {() => (
        <ReactFlowProvider>
          <CollaborativeCanvasFlow
            roomId={roomId}
            templateImportRequest={templateImportRequest}
            onSaveStatusChange={onSaveStatusChange}
            onRegisterSave={onRegisterSave}
          />
        </ReactFlowProvider>
      )}
    </ClientSideSuspense>
  )
}
