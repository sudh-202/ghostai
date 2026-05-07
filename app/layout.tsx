import type { Metadata } from "next"
import { ClerkProvider } from "@clerk/nextjs"
import { ui } from "@clerk/ui"
import "@xyflow/react/dist/style.css"

import { clerkAppearance } from "@/lib/clerk-appearance"

import "./globals.css"

export const metadata: Metadata = {
  title: "Ghost AI",
  description: "Ghost AI design system foundation",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="dark h-full antialiased">
      <body className="min-h-full bg-background text-foreground flex flex-col">
        <ClerkProvider appearance={clerkAppearance} ui={ui}>
          {children}
        </ClerkProvider>
      </body>
    </html>
  )
}
