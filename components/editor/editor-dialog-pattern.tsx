import type { ReactNode } from "react"

import {
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

type EditorDialogPatternProps = {
  title: string
  description?: string
  actions?: ReactNode
  children?: ReactNode
}

export function EditorDialogPattern({
  title,
  description,
  actions,
  children,
}: EditorDialogPatternProps) {
  return (
    <DialogContent className="border border-border/70 bg-popover text-popover-foreground shadow-2xl shadow-black/40">
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
        {description ? <DialogDescription>{description}</DialogDescription> : null}
      </DialogHeader>
      {children}
      {actions ? <DialogFooter>{actions}</DialogFooter> : null}
    </DialogContent>
  )
}
