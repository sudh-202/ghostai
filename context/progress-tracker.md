# Progress Tracker

Update this file after every meaningful implementation
change.

## Current Phase

- Complete: All feature specs 01–10 implemented and integrated

## Current Goal

- Final feature-spec implementation pass complete.

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
- Implemented feature spec 05: multi-file Prisma schema at `prisma/models/` with `Project` and `ProjectCollaborator` models, indexes, cascade delete, and Status enum; `prisma.config.ts` updated to point at new schema folder; `lib/prisma.ts` exports a cached singleton using `PrismaPg` adapter with URL branching for future Accelerate support; first migration applied (`20260506101516_init`).
- Implemented feature spec 06: `GET /api/projects` (list by owner), `POST /api/projects` (create, defaults name to "Untitled Project"), `PATCH /api/projects/[projectId]` (rename, owner-only), `DELETE /api/projects/[projectId]` (delete, owner-only, 204); 401 for unauthenticated requests, 403 for non-owner mutations, 404 for missing projects.
- Implemented feature spec 07: `app/editor/page.tsx` is now a server component that fetches owned and shared projects via `lib/projects.ts` helpers and passes them to `EditorShell` as props; replaced `useProjectDialogs` with `useProjectActions` hook that calls the real API, generates a slug+suffix room ID preview, navigates to `/editor/[id]` on create, and calls `router.refresh()` or `router.push("/editor")` after rename/delete; `POST /api/projects` accepts optional custom `id` so the client-generated room ID becomes the project ID.
- Implemented feature spec 08: `app/editor/[roomId]/page.tsx` is a server component that checks Clerk auth (redirect to `/sign-in` if unauthenticated) and project access via `lib/project-access.ts` helpers (renders `AccessDenied` for missing or unauthorized projects); created `components/editor/access-denied.tsx` with a centered lock-icon layout and a back link; created `components/editor/workspace-shell.tsx` as the full-viewport workspace client component — navbar shows project name in center with Share button + AI toggle + UserButton on the right, `ProjectSidebar` on the left with active-project highlight and clickable navigation links, canvas placeholder (dark bg, compass icon, "Workspace Shell" eyebrow, heading, description), right AI Copilot sidebar (open by default, header with Sparkles icon, "Chat surface pending" card, "Future Hooks" card); extended `EditorNavbar` with a `centerSlot` prop; extended `ProjectSidebar` with `activeProjectId` prop and `Link`-based navigation on each item.
- Implemented feature spec 09: added owner/collaborator-aware share dialog in `components/editor/share-dialog.tsx` and mounted it in the workspace navbar; owners can invite by email, remove collaborators, and copy the project URL with temporary `Copied!` feedback, while collaborators get a read-only collaborator list; added `GET`/`POST /api/projects/[projectId]/collaborators` plus `DELETE /api/projects/[projectId]/collaborators/[collaboratorId]` with authenticated access checks and owner-only mutations; added `lib/project-collaborators.ts` to load collaborator rows and enrich them with Clerk display names and avatar URLs by email without introducing a local user table; normalized collaborator email handling in project access and shared-project queries.
- Follow-up workspace UI fix: the share dialog now shows a `People with access` section that includes the owner plus collaborator rows with role badges, so access is visible even before anyone is invited; the AI sidebar now includes a real task composer and local prompt history shell so users can type and submit tasks into the panel instead of seeing a placeholder-only surface.
- Follow-up workspace layout polish: on desktop, the center canvas now reflows between the left project sidebar and right AI panel instead of being visually covered by them, and the AI panel now uses the same floating rounded-2xl border, shadow, and blur treatment as the project sidebar.
- Implemented feature spec 10: updated `liveblocks.config.ts` with typed Presence (`cursor`, `isThinking`) and UserMeta (`displayName`, `avatarUrl`, `cursorColor`); installed `@liveblocks/node`; added `lib/liveblocks.ts` with a lazy cached Liveblocks node client plus deterministic cursor-color mapping from user ID to a fixed palette; added `POST /api/liveblocks-auth` that requires Clerk auth, verifies project access via the existing helper, provisions the Liveblocks room using the project ID, and returns a signed Liveblocks session token carrying the user display name, avatar, and cursor color; updated architecture context for the new realtime boundary; verified with `npm run lint` and `npm run build`.

## In Progress

- None.

## Next Up

- None.

## Open Questions

- Project-level context files are still placeholders, so feature-spec files remain the effective source of truth for implementation units.

## Architecture Decisions

- Kept all theme customization in app-level files and left generated `components/ui/*` files untouched after installation, matching the feature spec.
- Used local/system font stacks instead of remote Google font fetching so the Next.js production build can succeed reliably in this environment.
- Clerk is the active authentication provider, mounted globally in `app/layout.tsx`, themed with the bundled `@clerk/ui` package, and enforced through `proxy.ts`.
- Clerk public route paths are normalized from `NEXT_PUBLIC_CLERK_SIGN_IN_URL` and `NEXT_PUBLIC_CLERK_SIGN_UP_URL` so redirects and route protection use one source of truth.
- Collaborator access remains email-based in Prisma, and Clerk Backend API lookups are used only to enrich collaborator presentation data with display names and avatar URLs at read time.
- Liveblocks server access is created lazily from `LIVEBLOCKS_SECRET_KEY` to keep Next.js builds safe when the secret is missing at import time, and room authorization is always scoped to project IDs.

## Session Notes

- Source context files are still template placeholders, so the active implementation scope for this session was driven by `context/feature-specs/03-auth.md`.
- `components.json` was generated with the current shadcn CLI defaults and the required primitives now exist under `components/ui/`.
- The editor shell uses a client boundary only where stateful sidebar interactions are needed, keeping the page entrypoint simple.
- `npm run build` required elevated execution in this environment because Turbopack attempted a sandbox-disallowed port bind while processing CSS; the elevated rerun completed successfully.
- The shared tabs primitive now forwards `orientation` to Base UI instead of only mirroring it in a data attribute, preserving accessible arrow-key behavior for future vertical tabs.
- The auth feature now follows the local spec in `context/feature-specs/03-auth.md`: dedicated auth pages, root redirect logic, and default route protection through `proxy.ts`.
- `.env.local` must expose Clerk's standard sign-in and sign-up URL variables alongside the existing publishable and secret keys for redirect-aware auth flows.
- The share dialog follows `context/feature-specs/09-share-dialog.md`: owners can manage collaborator rows and copy the room link, collaborators stay read-only, and Clerk enrichment is best-effort so missing Clerk users still render as plain emails.
- The share dialog now surfaces the owner as part of the access list, and the AI sidebar includes a client-side task composer/history shell for immediate usability while backend AI execution remains a later step.
- The desktop workspace shell now treats both side panels as peer floating columns, letting the center canvas shrink and expand cleanly between them while preserving overlay behavior on smaller screens.
- `.env.local` now also needs `LIVEBLOCKS_SECRET_KEY` for the realtime auth route; the server client is lazy-initialized in `lib/liveblocks.ts` so missing env values do not break the build until the auth route is actually used.
