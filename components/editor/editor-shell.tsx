"use client"

import { UserButton } from "@clerk/nextjs"
import { Plus } from "lucide-react"
import { useState } from "react"

import { EditorNavbar } from "@/components/editor/editor-navbar"
import { ProjectDialogs } from "@/components/editor/project-dialogs"
import { ProjectSidebar } from "@/components/editor/project-sidebar"
import { Button } from "@/components/ui/button"
import { useProjectDialogs } from "@/hooks/use-project-dialogs"
import { clerkAppearance } from "@/lib/clerk-appearance"

export function EditorShell() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const dialogs = useProjectDialogs()

  return (
    <div className="flex min-h-screen flex-col">
      <EditorNavbar
        isSidebarOpen={isSidebarOpen}
        onSidebarToggle={() => setIsSidebarOpen((open) => !open)}
        rightSlot={<UserButton appearance={clerkAppearance} />}
      />

      <main className="relative flex-1 overflow-hidden">
        <ProjectSidebar
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          projects={dialogs.projects}
          onCreateProject={dialogs.openCreate}
          onRenameProject={dialogs.openRename}
          onDeleteProject={dialogs.openDelete}
        />

        <section className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center px-6 py-10">
          <div className="flex flex-col items-center gap-6 text-center">
            <div className="space-y-3">
              <h1 className="font-heading text-2xl font-semibold tracking-tight text-foreground">
                Create a project or open an existing one
              </h1>
              <p className="max-w-sm text-sm leading-6 text-muted-foreground">
                Start a new architecture workspace, or choose a project from
                the sidebar.
              </p>
            </div>
            <Button onClick={dialogs.openCreate}>
              <Plus />
              New Project
            </Button>
          </div>
        </section>
      </main>

      <ProjectDialogs {...dialogs} />
    </div>
  )
}
