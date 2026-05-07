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
  // Normalize unicode and remove diacritics for better slug generation
  const normalized = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove diacritics
    .toLowerCase()
    .trim()
  
  // Handle non-ASCII characters (CJK, Arabic, Cyrillic, etc.)
  // Remove any remaining non-ASCII characters
  const asciiOnly = normalized
    .replace(/[^\x00-\x7F]/g, "") // Keep only ASCII
    .replace(/[^a-z0-9\s-]/g, "") // Remove special chars
    .replace(/\s+/g, "-") // Replace spaces with hyphens
    .replace(/-+/g, "-") // Collapse multiple hyphens
    .replace(/^-|-$/g, "") // Remove leading/trailing hyphens
  
  return asciiOnly
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
  const [error, setError] = useState<string | null>(null)
  const [isError, setIsError] = useState(false)

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
    setError(null)
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
      } else {
        const errorData = await res.json().catch(() => ({}))
        setError(errorData.error || "Failed to create project")
        setIsError(true)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create project")
      setIsError(true)
    } finally {
      setIsLoading(false)
    }
  }, [nameInput, roomId, closeDialog, router])

  const handleRename = useCallback(async () => {
    if (dialog.type !== "rename" || !nameInput.trim()) return
    setIsLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/projects/${dialog.project.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: nameInput.trim() }),
      })
      if (res.ok) {
        closeDialog()
        router.refresh()
      } else {
        const errorData = await res.json().catch(() => ({}))
        setError(errorData.error || "Failed to rename project")
        setIsError(true)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to rename project")
      setIsError(true)
    } finally {
      setIsLoading(false)
    }
  }, [dialog, nameInput, closeDialog, router])

  const handleDelete = useCallback(async () => {
    if (dialog.type !== "delete") return
    setIsLoading(true)
    setError(null)
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
      } else {
        const errorData = await res.json().catch(() => ({}))
        setError(errorData.error || "Failed to delete project")
        setIsError(true)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete project")
      setIsError(true)
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
    closeDialog,
    openCreate,
    openRename,
    openDelete,
    handleCreate,
    handleRename,
    handleDelete,
    error,
    isError,
    setError,
  }
}
