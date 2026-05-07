"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Copy, LoaderCircle, MailPlus, Share2, Trash2, UsersRound } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

type AccessMember = {
  id: string
  email: string | null
  displayName: string | null
  avatarUrl: string | null
  role: "owner" | "collaborator"
}

type ShareDialogProps = {
  projectId: string
  canManage: boolean
}

function getInitials(value: string): string {
  return value
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("")
}

async function getErrorMessage(response: Response, fallback: string) {
  const data = await response.json().catch(() => null)
  return typeof data?.error === "string" ? data.error : fallback
}

export function ShareDialog({ projectId, canManage }: ShareDialogProps) {
  const [open, setOpen] = useState(false)
  const [members, setMembers] = useState<AccessMember[]>([])
  const [inviteEmail, setInviteEmail] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isInviting, setIsInviting] = useState(false)
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [didCopy, setDidCopy] = useState(false)

  const peopleCountLabel = useMemo(() => {
    if (members.length === 1) return "1 person with access"
    return `${members.length} people with access`
  }, [members.length])

  const loadCollaborators = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/projects/${projectId}/collaborators`, {
        cache: "no-store",
      })

      if (!response.ok) {
        throw new Error(
          await getErrorMessage(response, "Unable to load collaborators right now.")
        )
      }

      const data = (await response.json()) as { members: AccessMember[] }
      setMembers(data.members)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load collaborators right now.")
    } finally {
      setIsLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    if (!didCopy) return

    const timeoutId = window.setTimeout(() => setDidCopy(false), 1400)
    return () => window.clearTimeout(timeoutId)
  }, [didCopy])

  const handleInvite = useCallback(async () => {
    if (!inviteEmail.trim()) return

    setIsInviting(true)
    setError(null)

    try {
      const response = await fetch(`/api/projects/${projectId}/collaborators`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail }),
      })

      if (!response.ok) {
        throw new Error(
          await getErrorMessage(response, "Unable to invite this collaborator.")
        )
      }

      setInviteEmail("")
      await loadCollaborators()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to invite this collaborator.")
    } finally {
      setIsInviting(false)
    }
  }, [inviteEmail, loadCollaborators, projectId])

  const handleRemove = useCallback(
    async (collaboratorId: string) => {
      setRemovingId(collaboratorId)
      setError(null)

      try {
        const response = await fetch(
          `/api/projects/${projectId}/collaborators/${collaboratorId}`,
          {
            method: "DELETE",
          }
        )

        if (!response.ok) {
          throw new Error(
            await getErrorMessage(response, "Unable to remove this collaborator.")
          )
        }

        await loadCollaborators()
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to remove this collaborator.")
      } finally {
        setRemovingId(null)
      }
    },
    [loadCollaborators, projectId]
  )

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setDidCopy(true)
      setError(null)
    } catch {
      setError("Unable to copy the project link right now.")
    }
  }, [])

  return (
    <>
      <Button
        onClick={() => {
          setOpen(true)
          void loadCollaborators()
        }}
        size="sm"
        variant="ghost"
      >
        <Share2 />
        Share
      </Button>

      <Dialog
        open={open}
        onOpenChange={(nextOpen) => {
          setOpen(nextOpen)
          if (!nextOpen) {
            setInviteEmail("")
            setError(null)
            setDidCopy(false)
            setMembers([])
          }
        }}
      >
        <DialogContent className="sm:max-w-lg" showCloseButton>
          <DialogHeader>
            <DialogTitle>Share Project</DialogTitle>
            <DialogDescription>
              {canManage
                ? "Invite teammates, review current collaborators, and manage access from here."
                : "You can review who currently has access to this project."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {canManage && (
              <>
                <div className="space-y-2">
                  <label
                    className="text-sm font-medium text-foreground"
                    htmlFor="share-email"
                  >
                    Invite by email
                  </label>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Input
                      id="share-email"
                      autoFocus
                      placeholder="teammate@company.com"
                      value={inviteEmail}
                      onChange={(event) => setInviteEmail(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" && inviteEmail.trim() && !isInviting) {
                          void handleInvite()
                        }
                      }}
                    />
                    <Button
                      className="sm:self-start"
                      disabled={!inviteEmail.trim() || isInviting}
                      onClick={() => void handleInvite()}
                    >
                      {isInviting ? (
                        <LoaderCircle className="animate-spin" />
                      ) : (
                        <MailPlus />
                      )}
                      {isInviting ? "Inviting…" : "Invite"}
                    </Button>
                  </div>
                </div>

                <div className="rounded-xl border border-border/70 bg-card/50 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-foreground">Project link</p>
                      <p className="text-xs leading-5 text-muted-foreground">
                        Copy the current workspace URL to share direct access.
                      </p>
                    </div>
                    <Button onClick={() => void handleCopy()} size="sm" variant="outline">
                      <Copy />
                      {didCopy ? "Copied!" : "Copy link"}
                    </Button>
                  </div>
                </div>
              </>
            )}

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">People with access</p>
                  <p className="text-xs text-muted-foreground">
                    {peopleCountLabel}
                  </p>
                </div>
                <UsersRound className="h-4 w-4 text-muted-foreground/60" />
              </div>

              {error ? (
                <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {error}
                </div>
              ) : null}

              <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
                {isLoading ? (
                  <div className="flex items-center gap-2 rounded-xl border border-border/70 bg-card/40 px-3 py-4 text-sm text-muted-foreground">
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                    Loading collaborators…
                  </div>
                ) : members.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-border/70 bg-card/30 px-4 py-6 text-center text-sm text-muted-foreground">
                    No access members could be loaded yet.
                  </div>
                ) : (
                  members.map((member) => {
                    const label =
                      member.displayName ||
                      member.email ||
                      (member.role === "owner" ? "Project owner" : "Unknown user")
                    const secondaryLine = member.email ?? "No email available"
                    const isOwner = member.role === "owner"

                    return (
                      <div
                        key={member.id}
                        className="flex items-center gap-3 rounded-xl border border-border/70 bg-card/40 px-3 py-3"
                      >
                        <div
                          className={cn(
                            "flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border/70 bg-muted/40 text-xs font-semibold text-foreground"
                          )}
                          style={
                            member.avatarUrl
                              ? {
                                  backgroundImage: `url("${member.avatarUrl.replace(/"/g, '\\"')}")`,
                                  backgroundPosition: "center",
                                  backgroundSize: "cover",
                                }
                              : undefined
                          }
                        >
                          {member.avatarUrl ? (
                            <span className="sr-only">{label}</span>
                          ) : (
                            getInitials(label)
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="truncate text-sm font-medium text-foreground">
                              {label}
                            </p>
                            <span className="rounded-full border border-border/70 bg-muted/35 px-2 py-0.5 text-[0.65rem] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                              {isOwner ? "Owner" : "Collaborator"}
                            </span>
                          </div>
                          <p className="truncate text-xs text-muted-foreground">
                            {secondaryLine}
                          </p>
                        </div>

                        {canManage && !isOwner ? (
                          <Button
                            aria-label={`Remove ${label}`}
                            disabled={removingId === member.id}
                            onClick={() => void handleRemove(member.id)}
                            size="icon-sm"
                            variant="ghost"
                          >
                            {removingId === member.id ? (
                              <LoaderCircle className="animate-spin" />
                            ) : (
                              <Trash2 />
                            )}
                          </Button>
                        ) : null}
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          </div>

          <DialogFooter showCloseButton />
        </DialogContent>
      </Dialog>
    </>
  )
}
