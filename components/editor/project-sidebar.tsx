"use client"

import { PanelLeftClose, Plus } from "lucide-react"

import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"

type ProjectSidebarProps = {
  isOpen: boolean
  onClose: () => void
}

const PROJECT_TABS = [
  {
    value: "my-projects",
    label: "My Projects",
    title: "No projects yet",
    description: "Your personal projects will appear here once you create them.",
  },
  {
    value: "shared",
    label: "Shared",
    title: "Nothing shared yet",
    description: "Projects shared with you will show up in this tab.",
  },
] as const

export function ProjectSidebar({ isOpen, onClose }: ProjectSidebarProps) {
  return (
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
          <div>
            <h2 className="font-heading text-sm font-semibold text-sidebar-foreground">
              Projects
            </h2>
          </div>
          <Button
            aria-label="Close project sidebar"
            onClick={onClose}
            size="icon-sm"
            variant="ghost"
            className="text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          >
            <PanelLeftClose />
          </Button>
        </div>

        <Tabs
          defaultValue={PROJECT_TABS[0].value}
          className="min-h-0 flex-1 gap-0 px-4 py-4"
        >
          <TabsList className="grid w-full grid-cols-2 bg-sidebar-accent/80">
            {PROJECT_TABS.map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="data-active:bg-sidebar data-active:text-sidebar-foreground"
              >
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {PROJECT_TABS.map((tab) => (
            <TabsContent
              key={tab.value}
              value={tab.value}
              className="min-h-0 flex-1 pt-4"
            >
              <ScrollArea className="h-full">
                <div className="flex min-h-full items-center justify-center rounded-xl border border-dashed border-sidebar-border/80 bg-sidebar-accent/35 p-6 text-center">
                  <div className="space-y-2">
                    <p className="font-medium text-sidebar-foreground">{tab.title}</p>
                    <p className="text-sm leading-6 text-sidebar-foreground/70">
                      {tab.description}
                    </p>
                  </div>
                </div>
              </ScrollArea>
            </TabsContent>
          ))}
        </Tabs>

        <div className="border-t border-sidebar-border px-4 py-4">
          <Button className="w-full justify-center" size="lg">
            <Plus />
            New Project
          </Button>
        </div>
      </div>
    </aside>
  )
}
