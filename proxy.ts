import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server"

import { SIGN_IN_PATH, SIGN_UP_PATH, getCatchAllRoute } from "@/lib/auth-routes"

const isPublicRoute = createRouteMatcher([
  getCatchAllRoute(SIGN_IN_PATH),
  getCatchAllRoute(SIGN_UP_PATH),
])

export default clerkMiddleware(async (auth, request) => {
  if (isPublicRoute(request)) {
    return
  }

  await auth.protect()
})

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
}
