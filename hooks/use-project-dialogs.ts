"use client"

import { useState, useCallback } from "react"

export type Project = {
  id: string
  name: string
  slug: string
  isOwned: boolean
}

export type DialogState =
  | { type: "none" }
  | { type: "create" }
  | { type: "rename"; project: Project }
  | { type: "delete"; project: Project }

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
}

const MOCK_PROJECTS: Project[] = [
  {
    id: "1",
    name: "Auth Service Architecture",
    slug: "auth-service-architecture",
    isOwned: true,
  },
  {
    id: "2",
    name: "Data Pipeline Design",
    slug: "data-pipeline-design",
    isOwned: true,
  },
  {
    id: "3",
    name: "Shared Infra Map",
    slug: "shared-infra-map",
    isOwned: false,
  },
]

export function useProjectDialogs() {
  const [dialog, setDialog] = useState<DialogState>({ type: "none" })
  const [projects, setProjects] = useState<Project[]>(MOCK_PROJECTS)
  const [nameInput, setNameInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const openCreate = useCallback(() => {
    setNameInput("")
    setDialog({ type: "create" })
  }, [])

  const openRename = useCallback((project: Project) => {
    setNameInput(project.name)
    setDialog({ type: "rename", project })
  }, [])

  const openDelete = useCallback((project: Project) => {
    setDialog({ type: "delete", project })
  }, [])

  const closeDialog = useCallback(() => {
    setDialog({ type: "none" })
    setNameInput("")
  }, [])

  const handleCreate = useCallback(() => {
    if (!nameInput.trim()) return
    setIsLoading(true)
    setTimeout(() => {
      setProjects((prev) => [
        {
          id: Date.now().toString(),
          name: nameInput.trim(),
          slug: toSlug(nameInput),
          isOwned: true,
        },
        ...prev,
      ])
      setIsLoading(false)
      closeDialog()
    }, 400)
  }, [nameInput, closeDialog])

  const handleRename = useCallback(() => {
    if (dialog.type !== "rename" || !nameInput.trim()) return
    setIsLoading(true)
    const id = dialog.project.id
    setTimeout(() => {
      setProjects((prev) =>
        prev.map((p) =>
          p.id === id
            ? { ...p, name: nameInput.trim(), slug: toSlug(nameInput) }
            : p
        )
      )
      setIsLoading(false)
      closeDialog()
    }, 400)
  }, [dialog, nameInput, closeDialog])

  const handleDelete = useCallback(() => {
    if (dialog.type !== "delete") return
    setIsLoading(true)
    const id = dialog.project.id
    setTimeout(() => {
      setProjects((prev) => prev.filter((p) => p.id !== id))
      setIsLoading(false)
      closeDialog()
    }, 400)
  }, [dialog, closeDialog])

  return {
    dialog,
    projects,
    nameInput,
    setNameInput,
    isLoading,
    slug: toSlug(nameInput),
    openCreate,
    openRename,
    openDelete,
    closeDialog,
    handleCreate,
    handleRename,
    handleDelete,
  }
}
