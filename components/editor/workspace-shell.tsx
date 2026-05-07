"use client"

import { FormEvent, useRef, useEffect, useState } from "react"
import { Bot, Compass, Send, Sparkles } from "lucide-react"
import { UserButton } from "@clerk/nextjs"

import { EditorNavbar } from "@/components/editor/editor-navbar"
import { ProjectDialogs } from "@/components/editor/project-dialogs"
import { ProjectSidebar } from "@/components/editor/project-sidebar"
import { ShareDialog } from "@/components/editor/share-dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { useProjectActions } from "@/hooks/use-project-actions"
import { clerkAppearance } from "@/lib/clerk-appearance"
import type { ProjectListItem } from "@/lib/projects"
import { cn } from "@/lib/utils"

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
  const [taskInput, setTaskInput] = useState("")
  const [chatMessages, setChatMessages] = useState<
    Array<{ id: string; role: "assistant" | "user"; text: string }>
  >([
    {
      id: "assistant-intro",
      role: "assistant",
      text: "Describe the architecture task you want help with and this panel will hold your prompt history.",
    },
  ])
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const actions = useProjectActions()

  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight
    }
  }, [chatMessages])

  function handleTaskSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const value = taskInput.trim()
    if (!value) return

    const messageId = `${Date.now()}`

    setChatMessages((current) => [
      ...current,
      { id: `user-${messageId}`, role: "user", text: value },
      {
        id: `assistant-${messageId}`,
        role: "assistant",
        text: "Task captured in the workspace shell. AI execution wiring can attach to this composer next.",
      },
    ])
    setTaskInput("")
  }

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
            <ShareDialog canManage={project.isOwner} projectId={project.id} />
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
            <UserButton appearance={clerkAppearance} />
          </div>
        }
      />

      <main className="relative flex flex-1 gap-3 overflow-hidden p-3">
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

        {/* canvas placeholder — dot-grid background */}
        <section
          className="relative flex min-w-0 flex-1 flex-col items-center justify-center gap-8 overflow-hidden rounded-2xl border border-border/70 text-center shadow-2xl shadow-black/20"
          style={{
            backgroundColor: "oklch(0.10 0.008 260)",
            backgroundImage:
              "radial-gradient(circle, oklch(0.24 0.01 260) 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        >
          <div className="flex h-20 w-20 items-center justify-center rounded-full border border-border/30 bg-muted/15">
            <Compass aria-hidden="true" className="h-8 w-8 text-muted-foreground/50" />
          </div>
          <div className="space-y-4">
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-muted-foreground/50">
              Workspace Shell
            </p>
            <h2 className="font-heading text-3xl font-semibold leading-snug tracking-tight text-foreground/80 sm:text-4xl">
              Canvas and collaboration
              <br />
              tooling land here next.
            </h2>
            <p className="max-w-md text-sm leading-6 text-muted-foreground/60">
              This room is ready for the shared architecture canvas, durable AI
              workflows, and real-time presence. For now, the shell is wired
              with project context and navigation only.
            </p>
          </div>
        </section>

        <aside
          aria-hidden={!isAiOpen}
          className={cn(
            "absolute inset-y-0 right-0 z-20 w-full max-w-sm px-3 pb-3 pt-2 transition-all duration-300 ease-out sm:w-[22rem] lg:relative lg:inset-auto lg:h-full lg:max-w-none lg:overflow-hidden lg:px-0 lg:pb-0 lg:pt-0 lg:transition-[width,opacity,transform]",
            isAiOpen
              ? "pointer-events-auto translate-x-0 opacity-100 lg:w-[22rem]"
              : "pointer-events-none translate-x-[calc(100%+1rem)] opacity-0 lg:w-0 lg:translate-x-3"
          )}
        >
          <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-border/70 bg-sidebar/95 shadow-2xl shadow-black/30 backdrop-blur-xl">
            <div className="flex items-start justify-between border-b border-sidebar-border px-5 py-4">
              <div>
                <p className="font-heading text-sm font-semibold text-foreground">
                  AI Copilot
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Task workspace
                </p>
              </div>
              <Sparkles aria-hidden="true" className="mt-0.5 h-4 w-4 text-muted-foreground/50" />
            </div>

            <div className="flex min-h-0 flex-1 flex-col">
              <div ref={messagesContainerRef} className="flex-1 space-y-3 overflow-y-auto p-4">
                {chatMessages.map((message) => (
                  <div
                    key={message.id}
                    className={
                      message.role === "user"
                        ? "ml-8 rounded-2xl rounded-br-md border border-primary/20 bg-primary/12 px-4 py-3"
                        : "mr-4 rounded-2xl rounded-bl-md border border-border/60 bg-card/60 px-4 py-3"
                    }
                  >
                    <div className="mb-2 flex items-center gap-2">
                      {message.role === "assistant" ? (
                        <>
                          <Bot aria-hidden="true" className="h-4 w-4 text-muted-foreground/70" />
                          <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground/60">
                            AI Copilot
                          </p>
                        </>
                      ) : (
                        <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground/60">
                          Your task
                        </p>
                      )}
                    </div>
                    <p className="text-sm leading-6 text-foreground/90">
                      {message.text}
                    </p>
                  </div>
                ))}
              </div>

              <form
                className="border-t border-sidebar-border bg-sidebar/80 p-4"
                onSubmit={handleTaskSubmit}
              >
                <div className="rounded-2xl border border-border/70 bg-card/55 p-3">
                  <label
                    className="mb-2 block text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground/55"
                    htmlFor="ai-task-input"
                  >
                    Ask AI Copilot
                  </label>
                  <Textarea
                    id="ai-task-input"
                    className="min-h-24 resize-none border-border/60 bg-background/55"
                    placeholder="Describe the task, architecture change, or implementation help you want..."
                    value={taskInput}
                    onChange={(event) => setTaskInput(event.target.value)}
                  />
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <p className="text-xs leading-5 text-muted-foreground">
                      Your prompt is kept in the panel so the chat surface feels usable while backend AI wiring comes next.
                    </p>
                    <Button disabled={!taskInput.trim()} size="sm" type="submit">
                      <Send aria-hidden="true" />
                      Send
                    </Button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </aside>
      </main>

      <ProjectDialogs {...actions} />
    </div>
  )
}
