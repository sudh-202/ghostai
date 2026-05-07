"use client"

import { useEffect } from "react"

type ZoomControls = {
  zoomIn(options?: { duration?: number }): void
  zoomOut(options?: { duration?: number }): void
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  const tag = target.tagName
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true
  if (target.isContentEditable) return true
  return false
}

export function useKeyboardShortcuts({
  reactFlow,
  onUndo,
  onRedo,
}: {
  reactFlow: ZoomControls
  onUndo: () => void
  onRedo: () => void
}) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (isEditableTarget(event.target)) return

      const isMod = event.metaKey || event.ctrlKey
      const key = event.key.toLowerCase()

      if (isMod && event.shiftKey && key === "z") {
        event.preventDefault()
        onRedo()
        return
      }

      if (isMod && key === "y") {
        event.preventDefault()
        onRedo()
        return
      }

      if (isMod && key === "z") {
        event.preventDefault()
        onUndo()
        return
      }

      if (!isMod && (event.key === "+" || event.key === "=")) {
        reactFlow.zoomIn({ duration: 200 })
        return
      }

      if (!isMod && event.key === "-") {
        reactFlow.zoomOut({ duration: 200 })
        return
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [reactFlow, onUndo, onRedo])
}
