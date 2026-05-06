# Progress Tracker

Update this file after every meaningful implementation
change.

## Current Phase

- Complete: All feature specs 01–04 implemented and integrated

## Current Goal

- Verify end-to-end sign-up/sign-in flow; prepare for feature spec 05 (canvas workspace)

## Completed

- Installed and configured `shadcn/ui`.
- Added the required generated primitives: Button, Card, Dialog, Input, Tabs, Textarea, and ScrollArea.
- Installed `lucide-react`.
- Added `lib/utils.ts` with the reusable `cn()` helper.
- Applied app-level dark-theme tokens in `app/globals.css` and added a design-system showcase page that imports the required primitives.
- Verified with `npm run lint` and `npm run build`.
- Added the reusable editor chrome components under `components/editor/`: navbar, floating project sidebar, editor shell, and a dialog composition pattern for future editor dialogs.
- Replaced the landing page with the editor shell so the new chrome renders end to end at `/`.
- Verified the editor unit with `npm run lint` and `npm run build`.
- Forwarded `orientation` through the shared `Tabs` wrapper so Base UI keyboard navigation matches visual layout.
- Finalized `context/ui-context.md` with concrete tokens, typography, radius rules, layout patterns, component-library guidance, and icon sizing.
- Installed `@clerk/nextjs` using the existing `npm` workflow.
- Installed `@clerk/ui` so Clerk's bundled UI can be themed locally inside the app.
- Added a shared Clerk appearance configuration using the `dark` base theme from `@clerk/ui/themes`, with colors and typography mapped to existing CSS variables.
- Reworked `proxy.ts` to keep only the Clerk auth routes public and protect every other route by default.
- Split the app entrypoints so `/` redirects by auth state and `/editor` hosts the editor shell.
- Added dedicated sign-in and sign-up pages with a minimal two-panel layout on large screens and a form-only layout on small screens.
- Moved Clerk's `UserButton` into the editor navbar right section and removed the temporary global header auth controls.
- Updated architecture context to reflect the protected-route model, root redirect behavior, and Clerk UI theming.
- Verified the auth feature with `npm run lint` and `npm run build`.
- Refined the auth page presentation so the layout is left-anchored, product-led, and free of the misleading `Welcome Back` framing on the initial sign-in screen.
- Implemented feature spec 04: editor home screen with heading/description/New Project button; Create/Rename/Delete project dialogs with live slug preview, prefilled inputs, and destructive confirmation; sidebar project items with hover-revealed rename/delete actions (owned only); mobile backdrop scrim with tap-to-close; dedicated `useProjectDialogs` hook for all dialog, form, and loading state.

## In Progress

- None.

## Next Up

- Verify the first end-to-end sign-up and sign-in flow in the browser with the local Clerk environment values.
- Implement feature spec 05 (canvas workspace with React Flow or equivalent).

## Open Questions

- Project-level context files are still placeholders, so feature-spec files remain the effective source of truth for implementation units.

## Architecture Decisions

- Kept all theme customization in app-level files and left generated `components/ui/*` files untouched after installation, matching the feature spec.
- Used local/system font stacks instead of remote Google font fetching so the Next.js production build can succeed reliably in this environment.
- Clerk is the active authentication provider, mounted globally in `app/layout.tsx`, themed with the bundled `@clerk/ui` package, and enforced through `proxy.ts`.
- Clerk public route paths are normalized from `NEXT_PUBLIC_CLERK_SIGN_IN_URL` and `NEXT_PUBLIC_CLERK_SIGN_UP_URL` so redirects and route protection use one source of truth.

## Session Notes

- Source context files are still template placeholders, so the active implementation scope for this session was driven by `context/feature-specs/03-auth.md`.
- `components.json` was generated with the current shadcn CLI defaults and the required primitives now exist under `components/ui/`.
- The editor shell uses a client boundary only where stateful sidebar interactions are needed, keeping the page entrypoint simple.
- `npm run build` required elevated execution in this environment because Turbopack attempted a sandbox-disallowed port bind while processing CSS; the elevated rerun completed successfully.
- The shared tabs primitive now forwards `orientation` to Base UI instead of only mirroring it in a data attribute, preserving accessible arrow-key behavior for future vertical tabs.
- The auth feature now follows the local spec in `context/feature-specs/03-auth.md`: dedicated auth pages, root redirect logic, and default route protection through `proxy.ts`.
- `.env.local` must expose Clerk's standard sign-in and sign-up URL variables alongside the existing publishable and secret keys for redirect-aware auth flows.
