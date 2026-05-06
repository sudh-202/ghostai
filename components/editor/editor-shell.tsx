"use client"

import { UserButton } from "@clerk/nextjs"
import { useState } from "react"

import { EditorNavbar } from "@/components/editor/editor-navbar"
import { ProjectSidebar } from "@/components/editor/project-sidebar"
import { clerkAppearance } from "@/lib/clerk-appearance"

export function EditorShell() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)

  return (
    <div className="flex min-h-screen flex-col">
      <EditorNavbar
        isSidebarOpen={isSidebarOpen}
        onSidebarToggle={() => setIsSidebarOpen((open) => !open)}
        rightSlot={
          <UserButton appearance={clerkAppearance} />
        }
      />

      <main className="relative flex-1 overflow-hidden">
        <ProjectSidebar
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
        />

        <section className="flex h-full min-h-[calc(100vh-3.5rem)] items-center justify-center px-6 py-10">
          <div className="flex h-full w-full max-w-6xl items-center justify-center rounded-[calc(var(--radius)*1.5)] border border-border/70 bg-card/70 text-center shadow-[0_30px_120px_-60px_rgba(0,0,0,0.8)] backdrop-blur-sm">
            <div className="max-w-md space-y-3 px-6">
              <p className="text-xs font-medium tracking-[0.24em] text-muted-foreground uppercase">
                Ghost AI Editor
              </p>
              <h1 className="font-heading text-3xl font-semibold text-foreground">
                Base editor chrome is ready
              </h1>
              <p className="text-sm leading-6 text-muted-foreground">
                The navbar and floating project sidebar now frame the editor
                experience and can be extended in the next chapters.
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
