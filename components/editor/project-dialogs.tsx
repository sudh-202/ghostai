"use client"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { useProjectActions } from "@/hooks/use-project-actions"

type ProjectDialogsProps = ReturnType<typeof useProjectActions>

export function ProjectDialogs({
  dialog,
  nameInput,
  setNameInput,
  isLoading,
  roomId,
  closeDialog,
  handleCreate,
  handleRename,
  handleDelete,
}: ProjectDialogsProps) {
  return (
    <>
      <Dialog
        open={dialog.type === "create"}
        onOpenChange={(open) => !open && closeDialog()}
      >
        <DialogContent showCloseButton>
          <DialogHeader>
            <DialogTitle>Create Project</DialogTitle>
            <DialogDescription>
              Give your new architecture workspace a name.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <label
                className="text-sm font-medium text-foreground"
                htmlFor="create-name"
              >
                Project name
              </label>
              <Input
                id="create-name"
                autoFocus
                placeholder="My Architecture"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && nameInput.trim() && !isLoading && handleCreate()}
              />
            </div>
            {nameInput.trim() && (
              <p className="text-xs text-muted-foreground">
                Room ID:{" "}
                <span className="font-mono text-foreground/70">{roomId}</span>
              </p>
            )}
          </div>

          <DialogFooter showCloseButton>
            <Button
              onClick={handleCreate}
              disabled={!nameInput.trim() || isLoading}
            >
              {isLoading ? "Creating…" : "Create Project"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={dialog.type === "rename"}
        onOpenChange={(open) => !open && closeDialog()}
      >
        <DialogContent showCloseButton>
          <DialogHeader>
            <DialogTitle>Rename Project</DialogTitle>
            {dialog.type === "rename" && (
              <DialogDescription>
                Renaming{" "}
                <span className="text-foreground">{dialog.project.name}</span>.
              </DialogDescription>
            )}
          </DialogHeader>

          <div className="space-y-1.5">
            <label
              className="text-sm font-medium text-foreground"
              htmlFor="rename-name"
            >
              Project name
            </label>
            <Input
              id="rename-name"
              autoFocus
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && nameInput.trim() && !isLoading && handleRename()}
            />
          </div>

          <DialogFooter showCloseButton>
            <Button
              onClick={handleRename}
              disabled={!nameInput.trim() || isLoading}
            >
              {isLoading ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={dialog.type === "delete"}
        onOpenChange={(open) => !open && closeDialog()}
      >
        <DialogContent showCloseButton>
          <DialogHeader>
            <DialogTitle>Delete Project</DialogTitle>
            {dialog.type === "delete" && (
              <DialogDescription>
                This will permanently delete{" "}
                <span className="text-foreground">{dialog.project.name}</span>.
                This cannot be undone.
              </DialogDescription>
            )}
          </DialogHeader>

          <DialogFooter showCloseButton>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isLoading}
            >
              {isLoading ? "Deleting…" : "Delete Project"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
