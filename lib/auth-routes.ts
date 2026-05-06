const DEFAULT_SIGN_IN_PATH = "/sign-in"
const DEFAULT_SIGN_UP_PATH = "/sign-up"

function normalizeClerkPath(value: string | undefined, fallback: string) {
  if (!value) {
    return fallback
  }

  const trimmedValue = value.trim()

  if (!trimmedValue) {
    return fallback
  }

  try {
    const normalizedUrl = new URL(trimmedValue, "http://localhost")
    const pathname = normalizedUrl.pathname.replace(/\/+$/, "") || "/"

    return pathname === "/" ? fallback : pathname
  } catch {
    return fallback
  }
}

export const SIGN_IN_PATH = normalizeClerkPath(
  process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL,
  DEFAULT_SIGN_IN_PATH
)

export const SIGN_UP_PATH = normalizeClerkPath(
  process.env.NEXT_PUBLIC_CLERK_SIGN_UP_URL,
  DEFAULT_SIGN_UP_PATH
)

export const EDITOR_PATH = "/editor"

export function getCatchAllRoute(pathname: string) {
  return pathname === "/" ? "/(.*)" : `${pathname}(.*)`
}
