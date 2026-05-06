import type { ReactNode } from "react"
import { FileText, Sparkles, Users } from "lucide-react"

type AuthShellProps = {
  children: ReactNode
  title: string
  description: string
}

const AUTH_FEATURES = [
  {
    icon: Sparkles,
    title: "AI Architecture Generation",
    description:
      "Describe your system, AI maps it to nodes and edges on a live canvas.",
  },
  {
    icon: Users,
    title: "Real-time Collaboration",
    description:
      "Live cursors, presence indicators, and shared node editing across your team.",
  },
  {
    icon: FileText,
    title: "Instant Spec Generation",
    description:
      "Export a complete Markdown technical spec directly from the canvas graph.",
  },
]

export function AuthShell({ children, title, description }: AuthShellProps) {
  return (
    <main className="min-h-screen bg-background">
      <div className="grid min-h-screen lg:grid-cols-2">
        <section className="flex px-6 py-10 sm:px-10 lg:min-h-screen lg:px-14 xl:px-18">
          <div className="flex w-full max-w-3xl flex-col justify-between">
            <div className="space-y-16">
              <div className="flex items-center gap-4">
                <div className="h-11 w-11 rounded-xl bg-[linear-gradient(135deg,var(--primary),color-mix(in_oklab,var(--primary)_65%,white))] shadow-[0_12px_40px_-18px_color-mix(in_oklab,var(--primary)_55%,transparent)]" />
                <span className="text-2xl font-semibold tracking-[-0.02em] text-foreground">
                  Ghost AI
                </span>
              </div>

              <div className="space-y-6 pt-4 sm:pt-8 lg:pt-14">
                <h1 className="max-w-2xl text-balance font-heading text-3xl font-semibold tracking-[-0.045em] text-foreground sm:text-4xl lg:text-4xl">
                  {title}
                </h1>
                <p className="max-w-2xl text-lg leading-9 text-muted-foreground sm:text-xl">
                  {description}
                </p>
              </div>

              <div className="space-y-8">
                {AUTH_FEATURES.map((feature) => {
                  const Icon = feature.icon

                  return (
                    <div key={feature.title} className="flex items-start gap-5">
                      <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border/70 bg-card/80 text-primary shadow-[0_12px_30px_-20px_rgba(0,0,0,0.85)]">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="space-y-1.5">
                        <h2 className="text-2xl font-medium tracking-[-0.03em] text-foreground">
                          {feature.title}
                        </h2>
                        <p className="max-w-xl text-lg leading-8 text-muted-foreground">
                          {feature.description}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            <p className="hidden text-base text-muted-foreground lg:block">
              © 2026 Ghost AI. All rights reserved.
            </p>
          </div>
        </section>

        <section className="flex items-center justify-center px-6 py-10 sm:px-10 lg:min-h-screen lg:border-l lg:border-border/70 lg:px-12">
          <div className="w-full max-w-sm">
            <div className="pb-8 lg:hidden">
              <div className="space-y-5">
                <div className="flex items-center justify-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-[linear-gradient(135deg,var(--primary),color-mix(in_oklab,var(--primary)_65%,white))]" />
                  <span className="text-xl font-semibold text-foreground">Ghost AI</span>
                </div>
                <h1 className="text-center text-3xl font-semibold tracking-[-0.04em] text-foreground">
                  {title}
                </h1>
                <p className="text-center text-base leading-7 text-muted-foreground">{description}</p>
              </div>
            </div>

            <div className="flex justify-center">{children}</div>
          </div>
        </section>
      </div>
    </main>
  )
}
