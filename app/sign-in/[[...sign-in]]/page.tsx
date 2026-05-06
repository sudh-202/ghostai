import { SignIn } from "@clerk/nextjs"
import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"

import { AuthShell } from "@/components/auth/auth-shell"
import { SIGN_UP_PATH, EDITOR_PATH } from "@/lib/auth-routes"
import { clerkAppearance } from "@/lib/clerk-appearance"

export default async function SignInPage() {
  const { userId } = await auth()

  if (userId) {
    redirect(EDITOR_PATH)
  }

  return (
    <AuthShell
      title="Design systems at the speed of thought."
      description="Describe your architecture in plain English. Ghost AI maps it to a shared canvas your whole team can refine in real time."
    >
      <SignIn
        appearance={clerkAppearance}
        fallbackRedirectUrl={EDITOR_PATH}
        path="/sign-in"
        routing="path"
        signUpUrl={SIGN_UP_PATH}
      />
    </AuthShell>
  )
}
