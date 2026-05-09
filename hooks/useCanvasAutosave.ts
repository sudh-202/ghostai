"use client"

import { useCallback, useEffect, useRef, useState } from "react"

import type { CanvasEdge, CanvasNode } from "@/types/canvas"

export type SaveStatus = "idle" | "saving" | "saved" | "error"

const AUTOSAVE_DELAY_MS = 2000

export function useCanvasAutosave({
  projectId,
  nodes,
  edges,
  enabled,
}: {
  projectId: string
  nodes: CanvasNode[]
  edges: CanvasEdge[]
  enabled: boolean
}): { status: SaveStatus; save: () => void } {
  const [status, setStatus] = useState<SaveStatus>("idle")
  const abortRef = useRef<AbortController | null>(null)
  const nodesRef = useRef(nodes)
  const edgesRef = useRef(edges)

  nodesRef.current = nodes
  edgesRef.current = edges

  const save = useCallback(async () => {
    if (!enabled) return

    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setStatus("saving")

    try {
      const res = await fetch(`/api/projects/${projectId}/canvas`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nodes: nodesRef.current, edges: edgesRef.current }),
        signal: controller.signal,
      })

      if (!res.ok) throw new Error("Save failed")
      setStatus("saved")
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return
      setStatus("error")
    }
  }, [projectId, enabled])

  useEffect(() => {
    if (!enabled) return
    if (nodes.length === 0 && edges.length === 0) return

    const timer = setTimeout(save, AUTOSAVE_DELAY_MS)
    return () => clearTimeout(timer)
  }, [projectId, nodes, edges, enabled, save])

  return { status, save }
}
