"use client"

import { useCallback, useState } from "react"
import { usePathname, useRouter } from "next/navigation"

import type { ProjectListItem } from "@/lib/projects"

export type { ProjectListItem }

export type DialogState =
  | { type: "none" }
  | { type: "create" }
  | { type: "rename"; project: ProjectListItem }
  | { type: "delete"; project: ProjectListItem }

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
}

function randomSuffix(): string {
  return Math.random().toString(36).slice(2, 6)
}

export function useProjectActions() {
  const router = useRouter()
  const pathname = usePathname()
  const [dialog, setDialog] = useState<DialogState>({ type: "none" })
  const [nameInput, setNameInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [suffix, setSuffix] = useState("")

  const slug = toSlug(nameInput)
  const roomId = slug ? `${slug}-${suffix}` : ""

  const openCreate = useCallback(() => {
    setNameInput("")
    setSuffix(randomSuffix())
    setDialog({ type: "create" })
  }, [])

  const openRename = useCallback((project: ProjectListItem) => {
    setNameInput(project.name)
    setDialog({ type: "rename", project })
  }, [])

  const openDelete = useCallback((project: ProjectListItem) => {
    setDialog({ type: "delete", project })
  }, [])

  const closeDialog = useCallback(() => {
    setDialog({ type: "none" })
    setNameInput("")
  }, [])

  const handleCreate = useCallback(async () => {
    if (!nameInput.trim()) return
    setIsLoading(true)
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: nameInput.trim(), id: roomId || undefined }),
      })
      if (res.ok) {
        const project: ProjectListItem = await res.json()
        closeDialog()
        router.push(`/editor/${project.id}`)
      }
    } finally {
      setIsLoading(false)
    }
  }, [nameInput, roomId, closeDialog, router])

  const handleRename = useCallback(async () => {
    if (dialog.type !== "rename" || !nameInput.trim()) return
    setIsLoading(true)
    try {
      const res = await fetch(`/api/projects/${dialog.project.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: nameInput.trim() }),
      })
      if (res.ok) {
        closeDialog()
        router.refresh()
      }
    } finally {
      setIsLoading(false)
    }
  }, [dialog, nameInput, closeDialog, router])

  const handleDelete = useCallback(async () => {
    if (dialog.type !== "delete") return
    setIsLoading(true)
    const projectId = dialog.project.id
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: "DELETE",
      })
      if (res.ok) {
        closeDialog()
        if (pathname === `/editor/${projectId}`) {
          router.push("/editor")
        } else {
          router.refresh()
        }
      }
    } finally {
      setIsLoading(false)
    }
  }, [dialog, closeDialog, pathname, router])

  return {
    dialog,
    nameInput,
    setNameInput,
    isLoading,
    roomId,
    openCreate,
    openRename,
    openDelete,
    closeDialog,
    handleCreate,
    handleRename,
    handleDelete,
  }
}
