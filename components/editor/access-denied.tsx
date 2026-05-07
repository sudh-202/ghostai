import Link from "next/link"
import { Lock } from "lucide-react"

import { buttonVariants } from "@/components/ui/button"

export function AccessDenied() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="flex flex-col items-center gap-6 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
          <Lock aria-hidden="true" className="h-6 w-6 text-muted-foreground" />
        </div>
        <div className="space-y-2">
          <h1 className="font-heading text-xl font-semibold text-foreground">
            Access Denied
          </h1>
          <p className="max-w-xs text-sm leading-6 text-muted-foreground">
            This project doesn&apos;t exist or you don&apos;t have permission to view it.
          </p>
        </div>
        <Link href="/editor" className={buttonVariants({ variant: "secondary" })}>
          Back to Editor
        </Link>
      </div>
    </div>
  )
}
