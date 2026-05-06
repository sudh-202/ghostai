import type { Appearance } from "@clerk/ui"
import { dark } from "@clerk/ui/themes"

export const clerkAppearance: Appearance = {
  theme: dark,
  variables: {
    colorPrimary: "var(--primary)",
    colorPrimaryForeground: "var(--primary-foreground)",
    colorDanger: "var(--destructive)",
    colorSuccess: "var(--state-success, var(--chart-2))",
    colorWarning: "var(--chart-5)",
    colorNeutral: "var(--foreground)",
    colorForeground: "var(--foreground)",
    colorMuted: "var(--muted)",
    colorMutedForeground: "var(--muted-foreground)",
    colorBackground: "var(--card)",
    colorInput: "var(--input)",
    colorInputForeground: "var(--foreground)",
    colorBorder: "var(--border)",
    colorRing: "var(--ring)",
    colorShadow: "rgba(0, 0, 0, 0.7)",
    colorModalBackdrop: "rgba(8, 10, 14, 0.76)",
    fontFamily: "var(--font-sans)",
    fontFamilyButtons: "var(--font-sans)",
    borderRadius: "var(--radius)",
  },
  elements: {
    card: {
      backgroundColor: "color-mix(in oklab, var(--card) 88%, transparent)",
      borderColor: "var(--border)",
      boxShadow: "0 30px 80px -48px rgba(0, 0, 0, 0.9)",
      backdropFilter: "blur(18px)",
    },
    headerTitle: {
      color: "var(--foreground)",
    },
    headerSubtitle: {
      color: "var(--muted-foreground)",
    },
    formFieldLabel: {
      color: "var(--foreground)",
    },
    formFieldInput: {
      backgroundColor: "var(--input)",
      color: "var(--foreground)",
      borderColor: "var(--border)",
      boxShadow: "none",
    },
    footerActionText: {
      color: "var(--muted-foreground)",
    },
    footerActionLink: {
      color: "var(--foreground)",
    },
    socialButtonsBlockButton: {
      backgroundColor: "var(--muted)",
      borderColor: "var(--border)",
      color: "var(--foreground)",
    },
    socialButtonsBlockButtonText: {
      color: "var(--foreground)",
    },
    dividerText: {
      color: "var(--muted-foreground)",
    },
    dividerLine: {
      backgroundColor: "var(--border)",
    },
    userButtonPopoverCard: {
      backgroundColor: "var(--card)",
      borderColor: "var(--border)",
      boxShadow: "0 24px 64px -40px rgba(0, 0, 0, 0.9)",
    },
    userButtonPopoverActionButton: {
      color: "var(--foreground)",
    },
    userButtonPopoverActionButtonText: {
      color: "var(--foreground)",
    },
    userButtonPopoverFooter: {
      borderTopColor: "var(--border)",
    },
  },
}
