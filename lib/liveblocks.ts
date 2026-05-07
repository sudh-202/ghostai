import { Liveblocks } from "@liveblocks/node"

const CURSOR_COLORS = [
  "#22d3ee",
  "#60a5fa",
  "#a78bfa",
  "#f472b6",
  "#f59e0b",
  "#34d399",
] as const

let liveblocksClient: Liveblocks | null = null

function getLiveblocksSecret() {
  const secret = process.env.LIVEBLOCKS_SECRET_KEY

  if (!secret) {
    throw new Error(
      "LIVEBLOCKS_SECRET_KEY is required to authorize realtime collaboration."
    )
  }

  return secret
}

export function getCursorColorForUser(userId: string) {
  let hash = 0

  for (let index = 0; index < userId.length; index += 1) {
    hash = (hash << 5) - hash + userId.charCodeAt(index)
    hash |= 0
  }

  return CURSOR_COLORS[Math.abs(hash) % CURSOR_COLORS.length]
}

export function getLiveblocks() {
  if (!liveblocksClient) {
    liveblocksClient = new Liveblocks({
      secret: getLiveblocksSecret(),
    })
  }

  return liveblocksClient
}
