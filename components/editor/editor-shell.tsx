"use client"

import { UserButton } from "@clerk/nextjs"
import { Plus } from "lucide-react"
import { useState } from "react"

import { EditorNavbar } from "@/components/editor/editor-navbar"
import { ProjectDialogs } from "@/components/editor/project-dialogs"
import { ProjectSidebar } from "@/components/editor/project-sidebar"
import { Button } from "@/components/ui/button"
import { useProjectActions } from "@/hooks/use-project-actions"
import type { ProjectListItem } from "@/lib/projects"
import { clerkAppearance } from "@/lib/clerk-appearance"

export type EditorShellProps = {
  ownedProjects: ProjectListItem[]
  sharedProjects: ProjectListItem[]
}

export function EditorShell({ ownedProjects, sharedProjects }: EditorShellProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const actions = useProjectActions()

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <EditorNavbar
        isSidebarOpen={isSidebarOpen}
        onSidebarToggle={() => setIsSidebarOpen((open) => !open)}
        rightSlot={<UserButton appearance={clerkAppearance} />}
      />

      <main className="relative flex flex-1 gap-3 overflow-hidden p-3">
        <ProjectSidebar
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          ownedProjects={ownedProjects}
          sharedProjects={sharedProjects}
          onCreateProject={actions.openCreate}
          onRenameProject={actions.openRename}
          onDeleteProject={actions.openDelete}
        />

        <section
          className="relative flex min-w-0 flex-1 flex-col items-center justify-center gap-6 overflow-hidden rounded-2xl border border-border/70 text-center shadow-2xl shadow-black/20"
          style={{
            backgroundColor: "oklch(0.10 0.008 260)",
            backgroundImage:
              "radial-gradient(circle, oklch(0.24 0.01 260) 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        >
          <div className="flex flex-col items-center gap-6">
            <div className="space-y-3">
              <h1 className="font-heading text-2xl font-semibold tracking-tight text-foreground/80">
                Create a project or open an existing one
              </h1>
              <p className="max-w-sm text-sm leading-6 text-muted-foreground/60">
                Start a new architecture workspace, or choose a project from
                the sidebar.
              </p>
            </div>
            <Button onClick={actions.openCreate}>
              <Plus />
              New Project
            </Button>
          </div>
        </section>
      </main>

      <ProjectDialogs {...actions} />
    </div>
  )
}
