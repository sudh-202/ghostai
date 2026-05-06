import { SignUp } from "@clerk/nextjs"
import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"

import { AuthShell } from "@/components/auth/auth-shell"
import { SIGN_IN_PATH, EDITOR_PATH } from "@/lib/auth-routes"
import { clerkAppearance } from "@/lib/clerk-appearance"

export default async function SignUpPage() {
  const { userId } = await auth()

  if (userId) {
    redirect(EDITOR_PATH)
  }

  return (
    <AuthShell
      title="Design systems at the speed of thought."
      description="Create your workspace and start mapping architecture ideas into a shared live canvas in minutes."
    >
      <SignUp
        appearance={clerkAppearance}
        fallbackRedirectUrl={EDITOR_PATH}
        path="/sign-up"
        routing="path"
        signInUrl={SIGN_IN_PATH}
      />
    </AuthShell>
  )
}
