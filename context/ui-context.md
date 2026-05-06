# UI Context

## Theme

Dark only. No light mode. The product should feel like a focused AI workspace:
near-black backgrounds, slightly lifted panels, soft steel-blue accents, and
high-contrast text. Surfaces should feel layered through subtle borders, blur,
and restrained shadow rather than loud color shifts.

## Colors

All product UI must use app-level design tokens. Prefer semantic Tailwind tokens
already mapped in `app/globals.css`, and do not introduce one-off hardcoded
colors inside feature components.

| Role            | CSS Variable       | Value    |
| --------------- | ------------------ | -------- |
| Page background | `--background`     | `oklch(0.145 0.01 260)` |
| Surface         | `--card`           | `oklch(0.205 0.01 260)` |
| Primary text    | `--foreground`     | `oklch(0.985 0.01 260)` |
| Muted text      | `--muted-foreground` | `oklch(0.74 0.015 255)` |
| Primary accent  | `--primary`        | `oklch(0.87 0.03 250)` |
| Border          | `--border`         | `oklch(1 0 0 / 12%)` |
| Error           | `--destructive`    | `oklch(0.64 0.2 25)` |
| Success         | `--state-success`  | `oklch(0.68 0.11 165)` |

## Typography

| Role      | Font              | Variable      |
| --------- | ----------------- | ------------- |
| UI text   | `Segoe UI`, `Inter`, `ui-sans-serif`, `system-ui`, `sans-serif` | `--font-sans` |
| Code/mono | `SFMono-Regular`, `SF Mono`, `ui-monospace`, `monospace` | `--font-mono` |

## Border Radius

| Context           | Class            |
| ----------------- | ---------------- |
| Inline / small UI | `rounded-md` |
| Cards / panels    | `rounded-xl` |
| Modals / overlays | `rounded-2xl` |

## Component Library

Use `shadcn/ui` primitives backed by Base UI and Tailwind CSS v4. Shared,
reusable primitives live in `components/ui/` and should be added via the CLI
whenever possible. Product-specific composition belongs outside that folder
under feature namespaces such as `components/editor/`.

## Layout Patterns

- Editor screens use a full-height workspace with a fixed top navbar and a
  central canvas area below it.
- Project sidebars float above the canvas instead of pushing layout width; they
  slide in from the left with a bordered, elevated surface.
- Panels and cards use subtle borders and soft blur/shadow to separate layers
  without abandoning the dark theme.
- Modals are centered overlays with backdrop blur, compact spacing, and clear
  title, description, and footer action regions.
- Navbars use a restrained bottom border, translucent background treatment, and
  three alignment zones: left controls, centered status/title, and right-side
  actions.

## Icons

Use `lucide-react` only. Keep icons stroke-based and visually lightweight.
Default sizes:
- Inline text/icon pairings: `h-4 w-4`
- Small icon buttons: `h-4 w-4`
- Standard action buttons: `h-4 w-4`
- Larger feature callouts or empty states: `h-5 w-5` to `h-6 w-6`
