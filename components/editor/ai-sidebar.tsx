"use client"

import {
  type ComponentProps,
  type FormEvent,
  type KeyboardEvent,
  startTransition,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import { useCreateFeedMessage, useFeedMessages, useSelf, useStorage } from "@liveblocks/react"
import { useRealtimeRun } from "@trigger.dev/react-hooks"
import {
  Bot,
  Download,
  FileText,
  Loader2,
  Send,
  Sparkles,
  X,
} from "lucide-react"
import ReactMarkdown from "react-markdown"

import {
  AI_CHAT_FEED_ID,
  AI_STATUS_FEED_ID,
  isChatFeedMessage,
  isAiStatusFeedMessage,
  type ChatFeedMessage,
} from "@/types/tasks"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"

const TERMINAL_RUN_STATUSES = new Set([
  "COMPLETED",
  "FAILED",
  "SYSTEM_FAILURE",
  "CRASHED",
  "EXPIRED",
  "TIMED_OUT",
  "CANCELED",
  "INTERRUPTED",
])

type ActiveRun = { runId: string; publicToken: string }

type SpecItem = {
  id: string
  filename: string
  createdAt: string
}

type AiSidebarProps = {
  isOpen: boolean
  onClose: () => void
  roomId: string
}

type FeedChatMessage = {
  id: string
  data: ChatFeedMessage
  feedCreatedAt: number
}

type SpecCanvasNodeSnapshot = {
  id: string
  data?: {
    label?: string
    shape?: string
  }
}

type SpecCanvasEdgeSnapshot = {
  id: string
  source: string
  target: string
  data?: {
    label?: string
  }
}

function formatTime(ts: number) {
  return new Intl.DateTimeFormat("en", { hour: "numeric", minute: "2-digit" }).format(
    new Date(ts)
  )
}

function formatSpecDate(iso: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso))
}

const STARTER_PROMPTS = [
  "Design an e-commerce backend",
  "Create a chat app architecture",
  "Build a CI/CD pipeline",
] as const

function getCollectionValues<T>(value: Map<string, T> | Record<string, T> | undefined) {
  if (!value) {
    return []
  }

  if (value instanceof Map) {
    return [...value.values()]
  }

  return Object.values(value)
}

const MARKDOWN_COMPONENTS = {
  h1: ({ className, ...props }: ComponentProps<"h1">) => (
    <h1 className={cn("text-xl font-semibold text-foreground", className)} {...props} />
  ),
  h2: ({ className, ...props }: ComponentProps<"h2">) => (
    <h2
      className={cn("mt-6 text-lg font-semibold text-foreground first:mt-0", className)}
      {...props}
    />
  ),
  h3: ({ className, ...props }: ComponentProps<"h3">) => (
    <h3 className={cn("mt-5 text-base font-semibold text-foreground", className)} {...props} />
  ),
  p: ({ className, ...props }: ComponentProps<"p">) => (
    <p className={cn("mt-3 text-sm leading-7 text-foreground/90 first:mt-0", className)} {...props} />
  ),
  ul: ({ className, ...props }: ComponentProps<"ul">) => (
    <ul className={cn("mt-3 list-disc space-y-2 pl-5 text-sm text-foreground/90", className)} {...props} />
  ),
  ol: ({ className, ...props }: ComponentProps<"ol">) => (
    <ol className={cn("mt-3 list-decimal space-y-2 pl-5 text-sm text-foreground/90", className)} {...props} />
  ),
  li: ({ className, ...props }: ComponentProps<"li">) => (
    <li className={cn("leading-7", className)} {...props} />
  ),
  strong: ({ className, ...props }: ComponentProps<"strong">) => (
    <strong className={cn("font-semibold text-foreground", className)} {...props} />
  ),
  pre: ({ className, ...props }: ComponentProps<"pre">) => (
    <pre
      className={cn(
        "mt-4 overflow-x-auto rounded-xl border border-border/70 bg-background/80 p-4 text-xs text-foreground",
        className
      )}
      {...props}
    />
  ),
  code: ({ className, ...props }: ComponentProps<"code">) => (
    <code
      className={cn(
        "rounded bg-background/70 px-1.5 py-0.5 text-[0.85em] text-foreground",
        className
      )}
      {...props}
    />
  ),
}

function AutoResizingTextarea({
  onEnterSubmit,
  value,
  className,
  onKeyDown,
  ...props
}: Omit<ComponentProps<"textarea">, "value"> & {
  onEnterSubmit: () => void
  value: string
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const textarea = textareaRef.current

    if (!textarea) {
      return
    }

    textarea.style.height = "0px"
    textarea.style.height = `${Math.min(Math.max(textarea.scrollHeight, 72), 160)}px`
  }, [value])

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== "Enter" || event.shiftKey) {
      onKeyDown?.(event)
      return
    }

    event.preventDefault()
    onEnterSubmit()
    onKeyDown?.(event)
  }

  return (
    <textarea
      {...props}
      ref={textareaRef}
      className={cn(
        "flex w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-base transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
        "max-h-40 min-h-[72px] resize-none overflow-y-auto border-border/70 bg-background/60",
        className
      )}
      onKeyDown={handleKeyDown}
      value={value}
    />
  )
}

export function AiSidebar({ isOpen, onClose, roomId }: AiSidebarProps) {
  const [activeTab, setActiveTab] = useState("architect")
  const [taskInput, setTaskInput] = useState("")
  const [isSending, setIsSending] = useState(false)
  const [activeRun, setActiveRun] = useState<ActiveRun | null>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)

  // Specs tab state
  const [specs, setSpecs] = useState<SpecItem[]>([])
  const [isLoadingSpecs, setIsLoadingSpecs] = useState(false)
  const [specRun, setSpecRun] = useState<ActiveRun | null>(null)
  const [isGeneratingSpec, setIsGeneratingSpec] = useState(false)
  const [previewSpec, setPreviewSpec] = useState<SpecItem | null>(null)
  const [previewContent, setPreviewContent] = useState("")
  const [isLoadingPreview, setIsLoadingPreview] = useState(false)
  const [previewError, setPreviewError] = useState<string | null>(null)

  // Read canvas snapshot for spec generation payload
  const canvasFlow = useStorage((root) => root.flow)
  const specCanvasPayload = useMemo(() => {
    const nodesMap = canvasFlow?.nodes
    const edgesMap = canvasFlow?.edges
    return {
      nodes: getCollectionValues(nodesMap as Map<string, SpecCanvasNodeSnapshot> | Record<string, SpecCanvasNodeSnapshot> | undefined).map((node) => ({
        id: node.id,
        label: node.data?.label ?? "",
        shape: node.data?.shape ?? "rectangle",
      })),
      edges: getCollectionValues(edgesMap as Map<string, SpecCanvasEdgeSnapshot> | Record<string, SpecCanvasEdgeSnapshot> | undefined).map((edge) => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        ...(edge.data?.label ? { label: edge.data.label } : {}),
      })),
    }
  }, [canvasFlow])

  const self = useSelf()
  const createFeedMessage = useCreateFeedMessage()

  const { messages: statusMessages } = useFeedMessages(AI_STATUS_FEED_ID)
  const { messages: rawChatMessages } = useFeedMessages(AI_CHAT_FEED_ID)

  const { run } = useRealtimeRun(activeRun?.runId, {
    accessToken: activeRun?.publicToken,
    enabled: !!activeRun,
  })

  const { run: specRunStatus } = useRealtimeRun(specRun?.runId, {
    accessToken: specRun?.publicToken,
    enabled: !!specRun,
  })

  const latestStatus = useMemo(() => {
    if (!statusMessages?.length) return null
    let latest = statusMessages[0]
    for (const msg of statusMessages) {
      if (msg.createdAt > latest.createdAt) latest = msg
    }
    return isAiStatusFeedMessage(latest.data) ? latest.data : null
  }, [statusMessages])

  // Shared across all room participants via the Liveblocks status feed (spec 24).
  // isRunActive is local-only (Trigger.dev token), so we combine both signals.
  const isGenerating =
    latestStatus?.phase === "start" || latestStatus?.phase === "processing"
  const isRunActive = !!activeRun && (!run || !TERMINAL_RUN_STATUSES.has(run.status))
  const isWorking = isSending || isRunActive || isGenerating

  const chatMessages = useMemo<FeedChatMessage[]>(() => {
    if (!rawChatMessages?.length) return []
    return rawChatMessages
      .filter((msg) => isChatFeedMessage(msg.data))
      .map((msg) => ({ id: msg.id, data: msg.data as ChatFeedMessage, feedCreatedAt: msg.createdAt }))
  }, [rawChatMessages])

  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight
    }
  }, [chatMessages, isWorking])

  const postAiReply = useCallback(
    async (content: string) => {
      await createFeedMessage(AI_CHAT_FEED_ID, {
        kind: "chat",
        userId: "ghost-ai",
        sender: "Ghost AI",
        role: "assistant",
        content,
        timestamp: new Date().toISOString(),
      })
    },
    [createFeedMessage]
  )

  const loadSpecs = useCallback(async () => {
    startTransition(() => setIsLoadingSpecs(true))

    try {
      const response = await fetch(`/api/projects/${roomId}/specs`)
      const data = response.ok
        ? ((await response.json()) as { specs: SpecItem[] })
        : { specs: [] }

      setSpecs(data.specs)
    } catch {
      setSpecs([])
    } finally {
      setIsLoadingSpecs(false)
    }
  }, [roomId])

  useEffect(() => {
    if (!run?.status || !TERMINAL_RUN_STATUSES.has(run.status)) return
    if (run.status === "COMPLETED") {
      startTransition(() => setActiveRun(null))
    } else {
      postAiReply(
        "There was an issue generating the design. Please try again."
      ).finally(() => {
        startTransition(() => setActiveRun(null))
      })
    }
  }, [run?.status, postAiReply])

  // Reload spec list when Specs tab becomes active
  useEffect(() => {
    if (activeTab !== "specs") return

    const timeoutId = window.setTimeout(() => {
      void loadSpecs()
    }, 0)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [activeTab, loadSpecs])

  // Reload specs when spec run completes
  useEffect(() => {
    if (!specRunStatus?.status || !TERMINAL_RUN_STATUSES.has(specRunStatus.status)) return
    startTransition(() => {
      setSpecRun(null)
      setIsGeneratingSpec(false)
    })

    const timeoutId = window.setTimeout(() => {
      void loadSpecs()
    }, 0)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [specRunStatus?.status, loadSpecs])

  async function generateSpec() {
    setIsGeneratingSpec(true)
    try {
      const specRes = await fetch("/api/ai/spec", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomId,
          chatHistory: chatMessages.map((m) => ({
            role: m.data.role,
            content: m.data.content,
          })),
          nodes: specCanvasPayload.nodes,
          edges: specCanvasPayload.edges,
        }),
      })

      if (!specRes.ok) throw new Error("Failed to start spec generation.")
      const { runId } = await specRes.json()

      const tokenRes = await fetch("/api/ai/spec/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ runId }),
      })

      if (!tokenRes.ok) throw new Error("Failed to obtain spec token.")
      const { token: publicToken } = await tokenRes.json()
      setSpecRun({ runId, publicToken })
    } catch {
      setIsGeneratingSpec(false)
    }
  }

  async function openSpecPreview(spec: SpecItem) {
    setPreviewSpec(spec)
    setPreviewContent("")
    setPreviewError(null)
    setIsLoadingPreview(true)
    try {
      const res = await fetch(`/api/projects/${roomId}/specs/${spec.id}`)

      if (!res.ok) {
        throw new Error("Failed to load spec preview.")
      }

      const data = (await res.json()) as {
        spec?: { content?: string }
      }

      setPreviewContent(data.spec?.content ?? "")
    } catch (error) {
      setPreviewError(
        error instanceof Error ? error.message : "Failed to load spec preview."
      )
    } finally {
      setIsLoadingPreview(false)
    }
  }

  function downloadSpec(spec: SpecItem) {
    const link = document.createElement("a")
    link.href = `/api/projects/${roomId}/specs/${spec.id}/download`
    link.download = spec.filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  function handlePreviewOpenChange(open: boolean) {
    if (open) {
      return
    }

    setPreviewSpec(null)
    setPreviewContent("")
    setPreviewError(null)
    setIsLoadingPreview(false)
  }

  async function submitMessage(nextValue?: string) {
    const value = (nextValue ?? taskInput).trim()
    if (!value) return

    setActiveTab("architect")
    setIsSending(true)
    setTaskInput("")

    let userMessagePosted = false

    try {
      await createFeedMessage(AI_CHAT_FEED_ID, {
        kind: "chat",
        userId: self?.id ?? "",
        sender: self?.info.displayName ?? "You",
        role: "user",
        content: value,
        timestamp: new Date().toISOString(),
      })

      userMessagePosted = true

      const designRes = await fetch("/api/ai/design", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: value, roomId, projectId: roomId }),
      })

      if (!designRes.ok) {
        const err = await designRes.json().catch(() => null)
        throw new Error(typeof err?.error === "string" ? err.error : "Failed to start design run.")
      }

      const { runId } = await designRes.json()

      const tokenRes = await fetch("/api/ai/design/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ runId }),
      })

      if (!tokenRes.ok) {
        throw new Error("Failed to obtain run token.")
      }

      const { token: publicToken } = await tokenRes.json()
      setActiveRun({ runId, publicToken })
    } catch (error) {
      if (userMessagePosted) {
        await postAiReply(
          error instanceof Error ? error.message : "Something went wrong. Please try again."
        ).catch(() => {})
      } else {
        setTaskInput(value)
      }
    } finally {
      setIsSending(false)
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    submitMessage()
  }

  return (
    <aside
      aria-hidden={!isOpen}
      className={cn(
        "absolute inset-y-0 right-0 z-20 w-full max-w-sm px-3 pb-3 pt-2 transition-all duration-300 ease-out sm:w-[22rem] lg:relative lg:inset-auto lg:h-full lg:max-w-none lg:overflow-hidden lg:px-0 lg:pb-0 lg:pt-0 lg:transition-[width,opacity,transform]",
        isOpen
          ? "pointer-events-auto translate-x-0 opacity-100 lg:w-[22rem]"
          : "pointer-events-none translate-x-[calc(100%+1rem)] opacity-0 lg:w-0 lg:translate-x-3"
      )}
    >
      <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-border/70 bg-sidebar/95 shadow-2xl shadow-black/30 backdrop-blur-xl">
        <div className="flex items-start justify-between border-b border-sidebar-border px-5 py-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Bot aria-hidden="true" className="h-4 w-4 text-primary" />
              <p className="font-heading text-sm font-semibold text-foreground">
                AI Workspace
              </p>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Collaborate with Ghost AI
            </p>
          </div>
          <Button
            aria-label="Close AI sidebar"
            onClick={onClose}
            size="icon-sm"
            variant="ghost"
          >
            <X aria-hidden="true" />
          </Button>
        </div>

        <Tabs
          className="min-h-0 flex-1 gap-0"
          onValueChange={setActiveTab}
          value={activeTab}
        >
          <div className="border-b border-sidebar-border px-4 py-3">
            <TabsList className="grid w-full grid-cols-3 rounded-xl bg-muted/80 p-1">
              <TabsTrigger
                className="rounded-lg text-muted-foreground data-active:bg-accent data-active:text-accent-foreground"
                value="architect"
              >
                AI Architect
              </TabsTrigger>
              <TabsTrigger
                className="rounded-lg text-muted-foreground data-active:bg-accent data-active:text-accent-foreground"
                value="chat"
              >
                Chat
              </TabsTrigger>
              <TabsTrigger
                className="rounded-lg text-muted-foreground data-active:bg-accent data-active:text-accent-foreground"
                value="specs"
              >
                Specs
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent className="min-h-0" value="architect">
            <div className="flex h-full min-h-0 flex-col">
              <ScrollArea className="min-h-0 flex-1">
                <div
                  ref={messagesContainerRef}
                  className="space-y-4 px-4 py-4"
                >
                  {chatMessages.length === 0 && !isWorking ? (
                    <div className="flex min-h-[18rem] flex-col items-center justify-center rounded-2xl border border-border/60 bg-card/45 px-5 py-8 text-center">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full border border-[#62C073]/30 bg-[#62C073]/10">
                        <Sparkles aria-hidden="true" className="h-5 w-5 text-[#62C073]" />
                      </div>
                      <p className="mt-4 font-heading text-sm font-semibold text-foreground">
                        Start an architecture conversation
                      </p>
                      <p className="mt-2 max-w-xs text-sm leading-6 text-muted-foreground">
                        Draft system ideas, explore tradeoffs, and build shared implementation plans with Ghost AI.
                      </p>
                      <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
                        {STARTER_PROMPTS.map((prompt) => (
                          <button
                            key={prompt}
                            className="rounded-full border border-border/60 bg-muted/65 px-3 py-1.5 text-xs font-medium text-accent-foreground transition-colors hover:border-[#62C073]/30 hover:bg-accent/85"
                            onClick={() => setTaskInput(prompt)}
                            type="button"
                          >
                            {prompt}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {chatMessages.map(({ id, data, feedCreatedAt }) => {
                    const isOwn = data.userId === self?.id
                    const isAi = data.role === "assistant"
                    return (
                      <div
                        key={id}
                        className={cn("flex", isOwn && !isAi ? "justify-end" : "justify-start")}
                      >
                        <div
                          className={cn(
                            "max-w-[85%] rounded-2xl px-4 py-3",
                            isAi
                              ? "rounded-bl-md border border-border/60 bg-card/80 text-foreground/90"
                              : "rounded-br-md bg-[#62C073] text-neutral-900"
                          )}
                        >
                          <div className="mb-1 flex items-baseline gap-2">
                            <span
                              className={cn(
                                "truncate text-[0.7rem] font-semibold",
                                isAi ? "text-[#62C073]/90" : "text-neutral-900/70"
                              )}
                            >
                              {data.sender}
                            </span>
                            <span
                              className={cn(
                                "flex-shrink-0 text-[0.62rem]",
                                isAi ? "text-muted-foreground/55" : "text-neutral-900/55"
                              )}
                            >
                              {formatTime(feedCreatedAt)}
                            </span>
                          </div>
                          <p className="text-sm leading-6">{data.content}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </ScrollArea>

              {/* Status strip — compact bar above input, dark base + green accent, visible only during active runs (spec 26 §4) */}
              {isWorking && (
                <div className="flex items-center gap-2 border-t border-[#62C073]/25 bg-[#0f1a14] px-4 py-2">
                  <span className="relative flex h-2 w-2 flex-shrink-0">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#62C073] opacity-60" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-[#62C073]" />
                  </span>
                  <p className="truncate text-xs font-medium text-[#62C073]/95">
                    {latestStatus?.text ?? "Ghost AI is working on the canvas…"}
                  </p>
                </div>
              )}

              <form
                className="border-t border-sidebar-border bg-sidebar/80 p-4"
                onSubmit={handleSubmit}
              >
                <div className="rounded-2xl border border-border/70 bg-card/55 p-3">
                  <AutoResizingTextarea
                    disabled={isWorking}
                    onChange={(event) => setTaskInput(event.target.value)}
                    onEnterSubmit={() => submitMessage()}
                    placeholder="Ask Ghost AI to sketch an architecture, review a system, or expand a feature plan..."
                    value={taskInput}
                  />
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <p className="text-xs leading-5 text-muted-foreground">
                      Enter to send · Shift+Enter for newline.
                    </p>
                    <Button
                      className="bg-[#62C073] text-neutral-900 hover:bg-[#62C073]/90 disabled:opacity-40"
                      disabled={!taskInput.trim() || isWorking}
                      size="sm"
                      type="submit"
                    >
                      {isWorking ? (
                        <Loader2 aria-hidden="true" className="animate-spin" />
                      ) : (
                        <Send aria-hidden="true" />
                      )}
                      {isRunActive ? "Generating…" : isSending ? "Sending…" : isGenerating ? "Working…" : "Send"}
                    </Button>
                  </div>
                </div>
              </form>
            </div>
          </TabsContent>

          <TabsContent className="min-h-0" value="chat">
            <ScrollArea className="h-full">
              <div className="flex flex-col gap-4 px-4 py-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-heading text-sm font-semibold text-foreground">
                      Previous Chats
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Your past conversations in this project.
                    </p>
                  </div>
                  <Button
                    className="bg-[#62C073] text-neutral-900 hover:bg-[#62C073]/90"
                    onClick={() => setActiveTab("architect")}
                    size="sm"
                    type="button"
                  >
                    + New Chat
                  </Button>
                </div>

                {chatMessages.length === 0 ? (
                  <div className="flex min-h-[12rem] flex-col items-center justify-center rounded-2xl border border-border/60 bg-card/45 px-5 py-7 text-center">
                    <p className="text-sm font-semibold text-foreground">No previous chats</p>
                    <p className="mt-1.5 text-xs text-muted-foreground">
                      Start a new chat to begin building with Ghost AI.
                    </p>
                  </div>
                ) : (
                  <button
                    className="flex w-full items-start gap-3 rounded-2xl border border-border/60 bg-card/55 px-4 py-3 text-left transition-colors hover:border-[#62C073]/30 hover:bg-accent/60"
                    onClick={() => setActiveTab("architect")}
                    type="button"
                  >
                    <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border border-[#62C073]/25 bg-[#62C073]/10">
                      <Bot aria-hidden="true" className="h-4 w-4 text-[#62C073]" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-foreground">
                        Current architecture session
                      </p>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        {chatMessages[chatMessages.length - 1]?.data.content ?? "—"}
                      </p>
                      <p className="mt-1 text-[0.65rem] text-muted-foreground/60">
                        {chatMessages.length} message{chatMessages.length === 1 ? "" : "s"}
                      </p>
                    </div>
                  </button>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent className="min-h-0 flex-1" value="specs">
            <div className="flex h-full min-h-0 flex-col">
              <div className="flex items-center justify-between gap-3 px-4 py-4">
                <div>
                  <p className="font-heading text-sm font-semibold text-foreground">
                    Spec Drafts
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Generate and review architecture specs.
                  </p>
                </div>
                <Button
                  className="bg-[#62C073] text-neutral-900 hover:bg-[#62C073]/90 disabled:opacity-40"
                  disabled={isGeneratingSpec || !!specRun}
                  onClick={generateSpec}
                  size="sm"
                  type="button"
                >
                  {isGeneratingSpec || specRun ? (
                    <>
                      <Loader2 aria-hidden="true" className="animate-spin" />
                      Generating…
                    </>
                  ) : (
                    "Generate Spec"
                  )}
                </Button>
              </div>

              <ScrollArea className="min-h-0 flex-1">
                <div className="space-y-2 px-4 pb-4">
                  {isLoadingSpecs ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 aria-hidden="true" className="h-5 w-5 animate-spin text-muted-foreground/60" />
                    </div>
                  ) : specs.length === 0 ? (
                    <div className="flex min-h-[12rem] flex-col items-center justify-center rounded-2xl border border-border/60 bg-card/45 px-5 py-8 text-center">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full border border-border/60 bg-muted/50">
                        <FileText aria-hidden="true" className="h-4 w-4 text-muted-foreground/60" />
                      </div>
                      <p className="mt-3 text-sm font-semibold text-foreground">
                        No specs yet
                      </p>
                      <p className="mt-1 text-xs leading-5 text-muted-foreground">
                        Generate a spec from your canvas and conversation history.
                      </p>
                    </div>
                  ) : (
                    specs.map((spec) => (
                      <div
                        key={spec.id}
                        className="group flex items-center gap-3 rounded-xl border border-border/60 bg-card/55 px-3 py-3 transition-colors hover:border-[#62C073]/25 hover:bg-accent/50"
                      >
                        <button
                          className="flex min-w-0 flex-1 items-center gap-3 text-left"
                          onClick={() => openSpecPreview(spec)}
                          type="button"
                        >
                          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border border-border/60 bg-background/55">
                            <FileText aria-hidden="true" className="h-3.5 w-3.5 text-[#62C073]" />
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-foreground">
                              {spec.filename}
                            </p>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              {formatSpecDate(spec.createdAt)}
                            </p>
                          </div>
                        </button>
                        <Button
                          aria-label="Download spec"
                          className="flex-shrink-0 text-muted-foreground hover:text-foreground"
                          onClick={() => downloadSpec(spec)}
                          size="icon-sm"
                          type="button"
                          variant="ghost"
                        >
                          <Download aria-hidden="true" className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog onOpenChange={handlePreviewOpenChange} open={!!previewSpec}>
        <DialogContent className="flex max-h-[80vh] max-w-3xl flex-col border-border/70 bg-card/95 p-0 text-foreground backdrop-blur-xl">
          <DialogHeader className="border-b border-border/60 px-6 py-4">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <DialogTitle className="truncate text-left font-heading text-base font-semibold">
                  {previewSpec?.filename ?? "Spec preview"}
                </DialogTitle>
                {previewSpec ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatSpecDate(previewSpec.createdAt)}
                  </p>
                ) : null}
              </div>
              {previewSpec ? (
                <Button
                  className="flex-shrink-0"
                  onClick={() => downloadSpec(previewSpec)}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  <Download aria-hidden="true" />
                  Download
                </Button>
              ) : null}
            </div>
          </DialogHeader>

          <ScrollArea className="min-h-0 flex-1">
            <div className="px-6 py-5">
              {isLoadingPreview ? (
                <div className="flex min-h-56 items-center justify-center">
                  <Loader2
                    aria-hidden="true"
                    className="h-5 w-5 animate-spin text-muted-foreground/60"
                  />
                </div>
              ) : previewError ? (
                <div className="flex min-h-56 items-center justify-center rounded-2xl border border-destructive/30 bg-destructive/10 px-5 text-center">
                  <p className="text-sm text-destructive">{previewError}</p>
                </div>
              ) : (
                <article className="max-w-none">
                  <ReactMarkdown components={MARKDOWN_COMPONENTS}>
                    {previewContent}
                  </ReactMarkdown>
                </article>
              )}
            </div>
          </ScrollArea>

          <div className="flex justify-end border-t border-border/60 px-6 py-4">
            <Button onClick={() => handlePreviewOpenChange(false)} type="button" variant="ghost">
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </aside>
  )
}
