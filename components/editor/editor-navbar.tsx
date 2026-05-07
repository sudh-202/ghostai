"use client"

import type { ReactNode } from "react"

import { PanelLeftClose, PanelLeftOpen } from "lucide-react"

import { Button } from "@/components/ui/button"

type EditorNavbarProps = {
  isSidebarOpen: boolean
  onSidebarToggle: () => void
  centerSlot?: ReactNode
  rightSlot?: ReactNode
}

export function EditorNavbar({
  isSidebarOpen,
  onSidebarToggle,
  centerSlot,
  rightSlot,
}: EditorNavbarProps) {
  const ToggleIcon = isSidebarOpen ? PanelLeftClose : PanelLeftOpen

  return (
    <header className="flex h-14 items-center justify-between border-b border-border/70 bg-background/90 px-4 backdrop-blur-sm">
      <div className="flex min-w-0 flex-1 items-center">
        <Button
          aria-label={isSidebarOpen ? "Close project sidebar" : "Open project sidebar"}
          onClick={onSidebarToggle}
          size="icon-sm"
          variant="ghost"
        >
          <ToggleIcon />
        </Button>
      </div>
      <div className="flex flex-1 items-center justify-center">{centerSlot}</div>
      <div className="flex flex-1 items-center justify-end">{rightSlot}</div>
    </header>
  )
}
