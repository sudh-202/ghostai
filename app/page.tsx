import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"

import { EDITOR_PATH } from "@/lib/auth-routes"

export default async function Home() {
  const { userId, redirectToSignIn } = await auth()

  if (!userId) {
    redirectToSignIn()
  }

  redirect(EDITOR_PATH)
}
