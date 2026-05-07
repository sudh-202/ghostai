"use client"

import { type DragEvent, useEffect, useRef, useState } from "react"
import { LiveMap, LiveObject } from "@liveblocks/client"
import { LiveblocksProvider, RoomProvider, ClientSideSuspense, useErrorListener, useStatus } from "@liveblocks/react"
import { useLiveblocksFlow, type LiveblocksFlow } from "@liveblocks/react-flow"
import {
  Background,
  BackgroundVariant,
  ConnectionMode,
  Handle,
  MiniMap,
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
  Pill,
  RectangleHorizontal,
  type LucideIcon,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { CanvasEdge, CanvasNode, CanvasNodeShape, CanvasShapeSize } from "@/types/canvas"

type LiveblocksCanvasProps = {
  roomId: string
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
const DEFAULT_CANVAS_NODE_COLOR = "color-mix(in oklab, var(--card) 92%, white 4%)"
const RESTING_SHAPE_STROKE = "oklch(1 0 0 / 0.18)"
const SELECTED_SHAPE_STROKE = "oklch(0.92 0.04 244 / 0.86)"
const DRAG_PREVIEW_CURSOR_OFFSET = 18
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
          points="50,2 98,50 50,98 2,50"
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
          points="24,6 76,6 98,50 76,94 24,94 2,50"
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
        d="M16 18C16 9 84 9 84 18V82C84 91 16 91 16 82Z"
        fill={color}
        stroke={strokeColor}
        strokeWidth="2.2"
      />
      <ellipse
        cx="50"
        cy="18"
        fill={color}
        rx="34"
        ry="10"
        stroke={strokeColor}
        strokeWidth="2.2"
      />
      <path
        d="M16 82C16 91 84 91 84 82"
        fill="none"
        stroke={strokeColor}
        strokeWidth="2.2"
      />
    </svg>
  )
}

function CanvasNodeCard({ data, isConnectable, selected }: NodeProps<CanvasNode>) {
  return (
    <div className="group/canvas-node relative h-full w-full">
      <Handle
        className="opacity-0"
        isConnectable={isConnectable}
        position={Position.Left}
        type="target"
      />
      <Handle
        className="opacity-0"
        isConnectable={isConnectable}
        position={Position.Right}
        type="source"
      />
      <CanvasShapeFigure color={data.color} selected={selected} shape={data.shape} />
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-6 py-4 text-center">
        <span className="text-sm font-medium text-foreground/90">
          {data.label || "\u00A0"}
        </span>
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
          color={DEFAULT_CANVAS_NODE_COLOR}
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

function CollaborativeCanvasFlow() {
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [dragPreview, setDragPreview] = useState<ShapeDragPreviewState | null>(null)
  const nodeIdCounterRef = useRef(0)
  const isShapeDragging = dragPreview !== null
  const status = useStatus()
  const reactFlow = useReactFlow<CanvasNode, CanvasEdge>()

  useErrorListener((error) => {
    setErrorMessage(error.message)
  })

  const {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
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
            color: DEFAULT_CANVAS_NODE_COLOR,
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
    <>
      <ReactFlow
        className="bg-transparent"
        connectionMode={ConnectionMode.Loose}
        edges={edges}
        fitView
        nodeTypes={canvasNodeTypes}
        nodes={nodes}
        onConnect={onConnect}
        onDragOver={handleCanvasDragOver}
        onDelete={onDelete}
        onDrop={handleCanvasDrop}
        onEdgesChange={onEdgesChange}
        onNodesChange={onNodesChange}
      >
        <MiniMap
          bgColor="transparent"
          maskColor="oklch(0.145 0.01 260 / 0.72)"
          nodeBorderRadius={12}
          nodeColor="oklch(0.87 0.03 250 / 0.7)"
          nodeStrokeColor="oklch(1 0 0 / 0.18)"
          pannable
          zoomable
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
  )
}

export function LiveblocksCanvas({ roomId }: LiveblocksCanvasProps) {
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
              <CollaborativeCanvasFlow />
            </ReactFlowProvider>
          )}
        </ClientSideSuspense>
      </RoomProvider>
    </LiveblocksProvider>
  )
}
