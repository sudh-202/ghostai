"use client"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { CanvasEdge, CanvasNode, CanvasNodeShape } from "@/types/canvas"

import type { CanvasTemplate } from "@/components/editor/starter-templates"

type StarterTemplatesModalProps = {
  open: boolean
  onImport: (template: CanvasTemplate) => void
  onOpenChange: (open: boolean) => void
  templates: CanvasTemplate[]
}

const PREVIEW_WIDTH = 272
const PREVIEW_HEIGHT = 160
const PREVIEW_PADDING = 18

function getPreviewBounds(nodes: CanvasNode[]) {
  if (nodes.length === 0) {
    return {
      minX: 0,
      minY: 0,
      width: 1,
      height: 1,
    }
  }

  let minX = Number.POSITIVE_INFINITY
  let minY = Number.POSITIVE_INFINITY
  let maxX = Number.NEGATIVE_INFINITY
  let maxY = Number.NEGATIVE_INFINITY

  for (const node of nodes) {
    const nodeWidth = node.width ?? 0
    const nodeHeight = node.height ?? 0

    minX = Math.min(minX, node.position.x)
    minY = Math.min(minY, node.position.y)
    maxX = Math.max(maxX, node.position.x + nodeWidth)
    maxY = Math.max(maxY, node.position.y + nodeHeight)
  }

  return {
    minX,
    minY,
    width: Math.max(maxX - minX, 1),
    height: Math.max(maxY - minY, 1),
  }
}

function getTemplatePreviewLayout(nodes: CanvasNode[]) {
  const bounds = getPreviewBounds(nodes)
  const scale = Math.min(
    (PREVIEW_WIDTH - PREVIEW_PADDING * 2) / bounds.width,
    (PREVIEW_HEIGHT - PREVIEW_PADDING * 2) / bounds.height
  )
  const safeScale = Number.isFinite(scale) && scale > 0 ? scale : 1
  const contentWidth = bounds.width * safeScale
  const contentHeight = bounds.height * safeScale
  const offsetX = (PREVIEW_WIDTH - contentWidth) / 2
  const offsetY = (PREVIEW_HEIGHT - contentHeight) / 2

  return {
    scale: safeScale,
    toPreviewX: (x: number) => offsetX + (x - bounds.minX) * safeScale,
    toPreviewY: (y: number) => offsetY + (y - bounds.minY) * safeScale,
  }
}

function PreviewShape({
  className,
  color,
  shape,
}: {
  className?: string
  color: string
  shape: CanvasNodeShape
}) {
  if (shape === "rectangle" || shape === "pill" || shape === "circle") {
    return (
      <div
        className={cn(
          "relative h-full w-full border border-white/14",
          shape === "rectangle" && "rounded-[1rem]",
          shape === "pill" && "rounded-full",
          shape === "circle" && "rounded-full",
          className
        )}
        style={{ backgroundColor: color }}
      />
    )
  }

  if (shape === "diamond") {
    return (
      <svg
        aria-hidden="true"
        className={cn("h-full w-full", className)}
        preserveAspectRatio="none"
        viewBox="0 0 100 100"
      >
        <polygon
          fill={color}
          points="50,1 99,50 50,99 1,50"
          stroke="oklch(1 0 0 / 0.16)"
          strokeWidth="2.2"
        />
      </svg>
    )
  }

  if (shape === "hexagon") {
    return (
      <svg
        aria-hidden="true"
        className={cn("h-full w-full", className)}
        preserveAspectRatio="none"
        viewBox="0 0 100 100"
      >
        <polygon
          fill={color}
          points="21,2 79,2 99,50 79,98 21,98 1,50"
          stroke="oklch(1 0 0 / 0.16)"
          strokeWidth="2.2"
        />
      </svg>
    )
  }

  return (
    <svg
      aria-hidden="true"
      className={cn("h-full w-full", className)}
      preserveAspectRatio="none"
      viewBox="0 0 100 100"
    >
      <path
        d="M3 13C3 5 97 5 97 13V87C97 95 3 95 3 87Z"
        fill={color}
        stroke="oklch(1 0 0 / 0.16)"
        strokeWidth="2.2"
      />
      <ellipse
        cx="50"
        cy="13"
        fill={color}
        rx="47"
        ry="11"
        stroke="oklch(1 0 0 / 0.16)"
        strokeWidth="2.2"
      />
      <path
        d="M3 87C3 95 97 95 97 87"
        fill="none"
        stroke="oklch(1 0 0 / 0.16)"
        strokeWidth="2.2"
      />
    </svg>
  )
}

function TemplatePreview({
  edges,
  nodes,
}: {
  edges: CanvasEdge[]
  nodes: CanvasNode[]
}) {
  const { scale, toPreviewX, toPreviewY } = getTemplatePreviewLayout(nodes)
  const nodeById = new Map(nodes.map((node) => [node.id, node] as const))

  return (
    <div className="relative h-40 overflow-hidden rounded-xl border border-border/70 bg-[radial-gradient(circle_at_center,oklch(1_0_0_/_0.06)_0,transparent_65%),linear-gradient(180deg,oklch(0.19_0.01_260),oklch(0.145_0.01_260))]">
      <svg
        aria-hidden="true"
        className="absolute inset-0 h-full w-full"
        viewBox={`0 0 ${PREVIEW_WIDTH} ${PREVIEW_HEIGHT}`}
      >
        {edges.map((edge) => {
          const sourceNode = nodeById.get(edge.source)
          const targetNode = nodeById.get(edge.target)

          if (!sourceNode || !targetNode) {
            return null
          }

          const sourceWidth = (sourceNode.width ?? 0) * scale
          const sourceHeight = (sourceNode.height ?? 0) * scale
          const targetWidth = (targetNode.width ?? 0) * scale
          const targetHeight = (targetNode.height ?? 0) * scale

          return (
            <line
              key={edge.id}
              stroke="oklch(0.94 0.01 250 / 0.58)"
              strokeLinecap="round"
              strokeWidth="1.8"
              x1={toPreviewX(sourceNode.position.x) + sourceWidth / 2}
              x2={toPreviewX(targetNode.position.x) + targetWidth / 2}
              y1={toPreviewY(sourceNode.position.y) + sourceHeight / 2}
              y2={toPreviewY(targetNode.position.y) + targetHeight / 2}
            />
          )
        })}
      </svg>

      {nodes.map((node) => {
        const nodeWidth = (node.width ?? 0) * scale
        const nodeHeight = (node.height ?? 0) * scale

        return (
          <div
            key={node.id}
            className="absolute"
            style={{
              left: toPreviewX(node.position.x),
              top: toPreviewY(node.position.y),
              width: nodeWidth,
              height: nodeHeight,
            }}
          >
            <PreviewShape
              color={node.data.color}
              shape={node.data.shape}
            />
          </div>
        )
      })}
    </div>
  )
}

export function StarterTemplatesModal({
  open,
  onImport,
  onOpenChange,
  templates,
}: StarterTemplatesModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-5xl" showCloseButton>
        <DialogHeader>
          <DialogTitle>Starter Templates</DialogTitle>
          <DialogDescription>
            Start from a predefined diagram and replace the current canvas in one step.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[70vh] pr-3">
          <div className="grid gap-4 pb-1 md:grid-cols-2 xl:grid-cols-3">
            {templates.map((template) => (
              <Card
                key={template.id}
                className="overflow-hidden border-border/70 bg-card/70 shadow-lg shadow-black/15"
              >
                <CardHeader className="space-y-2">
                  <TemplatePreview edges={template.edges} nodes={template.nodes} />
                  <div className="space-y-1">
                    <CardTitle>{template.name}</CardTitle>
                    <CardDescription>{template.description}</CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-xs text-muted-foreground">
                    {template.nodes.length} nodes and {template.edges.length} connections.
                  </p>
                </CardContent>
                <CardFooter className="justify-end">
                  <Button
                    onClick={() => {
                      onImport(template)
                      onOpenChange(false)
                    }}
                    size="sm"
                  >
                    Import
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
