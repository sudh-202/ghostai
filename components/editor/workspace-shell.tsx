"use client"

import { useEffect, useRef, useState } from "react"
import { Bot, LayoutTemplate } from "lucide-react"

import { AiSidebar } from "@/components/editor/ai-sidebar"
import { EditorNavbar } from "@/components/editor/editor-navbar"
import { LiveblocksCanvas, LiveblocksWorkspaceProvider } from "@/components/editor/liveblocks-canvas"
import { ProjectDialogs } from "@/components/editor/project-dialogs"
import { ProjectSidebar } from "@/components/editor/project-sidebar"
import { ShareDialog } from "@/components/editor/share-dialog"
import { StarterTemplatesModal } from "@/components/editor/starter-templates-modal"
import { CANVAS_TEMPLATES, type CanvasTemplate } from "@/components/editor/starter-templates"
import { Button } from "@/components/ui/button"
import { useProjectActions } from "@/hooks/use-project-actions"
import { type SaveStatus } from "@/hooks/useCanvasAutosave"
import type { ProjectListItem } from "@/lib/projects"

type WorkspaceShellProps = {
  project: { id: string; name: string; isOwner: boolean }
  ownedProjects: ProjectListItem[]
  sharedProjects: ProjectListItem[]
}

export function WorkspaceShell({
  project,
  ownedProjects,
  sharedProjects,
}: WorkspaceShellProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [isAiOpen, setIsAiOpen] = useState(true)
  const [isStarterTemplatesOpen, setIsStarterTemplatesOpen] = useState(false)
  const [templateImportRequest, setTemplateImportRequest] = useState<{
    requestId: number
    template: CanvasTemplate
  } | null>(null)
  const [canvasSaveStatus, setCanvasSaveStatus] = useState<SaveStatus>("idle")
  const [saveButtonLabel, setSaveButtonLabel] = useState("Save")
  const canvasSaveRef = useRef<() => void>(() => {})
  const actions = useProjectActions()

  useEffect(() => {
    if (canvasSaveStatus === "saving") {
      setSaveButtonLabel("Saving...")
    } else if (canvasSaveStatus === "saved") {
      setSaveButtonLabel("Saved")
      const t = setTimeout(() => setSaveButtonLabel("Save"), 2000)
      return () => clearTimeout(t)
    } else if (canvasSaveStatus === "error") {
      setSaveButtonLabel("Error")
      const t = setTimeout(() => setSaveButtonLabel("Save"), 2000)
      return () => clearTimeout(t)
    }
  }, [canvasSaveStatus])

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <EditorNavbar
        isSidebarOpen={isSidebarOpen}
        onSidebarToggle={() => setIsSidebarOpen((o) => !o)}
        centerSlot={
          <div className="flex flex-col items-center leading-none">
            <span className="font-heading text-sm font-semibold text-foreground">
              {project.name}
            </span>
            <span className="mt-0.5 text-[0.65rem] text-muted-foreground/60">
              Workspace
            </span>
          </div>
        }
        rightSlot={
          <div className="flex items-center gap-1.5">
            <Button onClick={() => setIsStarterTemplatesOpen(true)} size="sm" variant="ghost">
              <LayoutTemplate aria-hidden="true" />
              Templates
            </Button>
            <ShareDialog canManage={project.isOwner} projectId={project.id} />
            <Button
              disabled={canvasSaveStatus === "saving"}
              onClick={() => canvasSaveRef.current()}
              size="sm"
              variant={canvasSaveStatus === "error" ? "destructive" : "ghost"}
            >
              {saveButtonLabel}
            </Button>
            <Button
              aria-label="Toggle AI sidebar"
              aria-pressed={isAiOpen}
              onClick={() => setIsAiOpen((o) => !o)}
              size="sm"
              variant={isAiOpen ? "secondary" : "ghost"}
            >
              <Bot aria-hidden="true" />
              AI
            </Button>
          </div>
        }
      />

      <main className="relative flex flex-1 gap-3 overflow-hidden p-3">
        <LiveblocksWorkspaceProvider roomId={project.id}>
          <ProjectSidebar
            activeProjectId={project.id}
            isOpen={isSidebarOpen}
            onClose={() => setIsSidebarOpen(false)}
            ownedProjects={ownedProjects}
            sharedProjects={sharedProjects}
            onCreateProject={actions.openCreate}
            onRenameProject={actions.openRename}
            onDeleteProject={actions.openDelete}
          />

          <section className="relative min-w-0 flex-1 overflow-hidden rounded-2xl border border-border/70 shadow-2xl shadow-black/20">
            <LiveblocksCanvas
              roomId={project.id}
              templateImportRequest={templateImportRequest}
              onSaveStatusChange={setCanvasSaveStatus}
              onRegisterSave={(save) => { canvasSaveRef.current = save }}
            />
          </section>

          <AiSidebar isOpen={isAiOpen} onClose={() => setIsAiOpen(false)} roomId={project.id} />
        </LiveblocksWorkspaceProvider>
      </main>

      <StarterTemplatesModal
        onImport={(template) => {
          setTemplateImportRequest({
            requestId: Date.now(),
            template,
          })
        }}
        onOpenChange={setIsStarterTemplatesOpen}
        open={isStarterTemplatesOpen}
        templates={CANVAS_TEMPLATES}
      />
      <ProjectDialogs {...actions} />
    </div>
  )
}
