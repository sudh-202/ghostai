"use client"

import { PanelLeftClose, Pencil, Plus, Trash2 } from "lucide-react"

import type { ProjectListItem } from "@/lib/projects"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"

type ProjectSidebarProps = {
  isOpen: boolean
  onClose: () => void
  ownedProjects: ProjectListItem[]
  sharedProjects: ProjectListItem[]
  onCreateProject: () => void
  onRenameProject: (project: ProjectListItem) => void
  onDeleteProject: (project: ProjectListItem) => void
}

type ProjectItemProps = {
  project: ProjectListItem
  isOwned: boolean
  onRename: () => void
  onDelete: () => void
}

function ProjectItem({ project, isOwned, onRename, onDelete }: ProjectItemProps) {
  return (
    <div className="group flex items-center gap-1 rounded-lg px-2 py-1.5 hover:bg-sidebar-accent/60">
      <span className="flex-1 truncate text-sm text-sidebar-foreground">
        {project.name}
      </span>
      {isOwned && (
        <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
          <Button
            aria-label={`Rename ${project.name}`}
            className="text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground"
            onClick={(e) => {
              e.stopPropagation()
              onRename()
            }}
            size="icon-xs"
            variant="ghost"
          >
            <Pencil />
          </Button>
          <Button
            aria-label={`Delete ${project.name}`}
            className="text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-destructive"
            onClick={(e) => {
              e.stopPropagation()
              onDelete()
            }}
            size="icon-xs"
            variant="ghost"
          >
            <Trash2 />
          </Button>
        </div>
      )}
    </div>
  )
}

type EmptyStateProps = {
  title: string
  description: string
}

function EmptyState({ title, description }: EmptyStateProps) {
  return (
    <div className="flex min-h-full items-center justify-center rounded-xl border border-dashed border-sidebar-border/80 bg-sidebar-accent/35 p-6 text-center">
      <div className="space-y-2">
        <p className="font-medium text-sidebar-foreground">{title}</p>
        <p className="text-sm leading-6 text-sidebar-foreground/70">
          {description}
        </p>
      </div>
    </div>
  )
}

export function ProjectSidebar({
  isOpen,
  onClose,
  ownedProjects,
  sharedProjects,
  onCreateProject,
  onRenameProject,
  onDeleteProject,
}: ProjectSidebarProps) {
  return (
    <>
      {isOpen && (
        <div
          aria-hidden
          className="fixed inset-0 z-[19] bg-black/50 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        aria-hidden={!isOpen}
        className={cn(
          "absolute inset-y-0 left-0 z-20 w-full max-w-sm px-3 pb-3 pt-2 transition-all duration-300 ease-out sm:w-[22rem]",
          isOpen
            ? "pointer-events-auto translate-x-0 opacity-100"
            : "pointer-events-none -translate-x-[calc(100%+1rem)] opacity-0"
        )}
      >
        <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-border/70 bg-sidebar/95 shadow-2xl shadow-black/30 backdrop-blur-xl">
          <div className="flex items-center justify-between border-b border-sidebar-border px-4 py-3">
            <h2 className="font-heading text-sm font-semibold text-sidebar-foreground">
              Projects
            </h2>
            <Button
              aria-label="Close project sidebar"
              className="text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              onClick={onClose}
              size="icon-sm"
              variant="ghost"
            >
              <PanelLeftClose />
            </Button>
          </div>

          <Tabs
            defaultValue="my-projects"
            className="min-h-0 flex-1 gap-0 px-4 py-4"
          >
            <TabsList className="grid w-full grid-cols-2 bg-sidebar-accent/80">
              <TabsTrigger
                value="my-projects"
                className="data-active:bg-sidebar data-active:text-sidebar-foreground"
              >
                My Projects
              </TabsTrigger>
              <TabsTrigger
                value="shared"
                className="data-active:bg-sidebar data-active:text-sidebar-foreground"
              >
                Shared
              </TabsTrigger>
            </TabsList>

            <TabsContent
              value="my-projects"
              className="min-h-0 flex-1 pt-4"
            >
              <ScrollArea className="h-full">
                {ownedProjects.length === 0 ? (
                  <EmptyState
                    title="No projects yet"
                    description="Your personal projects will appear here once you create them."
                  />
                ) : (
                  <div className="space-y-0.5">
                    {ownedProjects.map((project) => (
                      <ProjectItem
                        key={project.id}
                        project={project}
                        isOwned
                        onRename={() => onRenameProject(project)}
                        onDelete={() => onDeleteProject(project)}
                      />
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>

            <TabsContent
              value="shared"
              className="min-h-0 flex-1 pt-4"
            >
              <ScrollArea className="h-full">
                {sharedProjects.length === 0 ? (
                  <EmptyState
                    title="Nothing shared yet"
                    description="Projects shared with you will show up in this tab."
                  />
                ) : (
                  <div className="space-y-0.5">
                    {sharedProjects.map((project) => (
                      <ProjectItem
                        key={project.id}
                        project={project}
                        isOwned={false}
                        onRename={() => onRenameProject(project)}
                        onDelete={() => onDeleteProject(project)}
                      />
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
          </Tabs>

          <div className="border-t border-sidebar-border px-4 py-4">
            <Button
              className="w-full justify-center"
              onClick={onCreateProject}
              size="lg"
            >
              <Plus />
              New Project
            </Button>
          </div>
        </div>
      </aside>
    </>
  )
}
