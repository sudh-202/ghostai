# Architecture Context

## Stack

| Layer     | Technology                  | Role   |
| --------- | --------------------------- | ------ |
| Framework | Next.js 16 App Router + TypeScript | Application shell, routing, and server/client rendering |
| UI        | Tailwind CSS v4 + shadcn/ui + Base UI | Shared primitives and product interface styling |
| Auth      | Clerk Next.js SDK | Authentication state, session UI, and middleware integration |
| Realtime  | Liveblocks React + Liveblocks Node | Room presence types, room provisioning, and signed realtime session access |
| Icons     | lucide-react | Stroke-based interface icons |
| Utilities | clsx + tailwind-merge + class-variance-authority | Class composition and variant handling |

## System Boundaries

- `app/` — App Router entrypoints, global layout, and route-level UI.
- `components/ui/` — shared UI primitives generated or adapted from the design system layer.
- `components/editor/` — product-specific editor shell and composition components.
- `lib/liveblocks.ts` — lazy Liveblocks node client creation plus deterministic cursor-color helpers.
- `liveblocks.config.ts` — global Liveblocks Presence and UserMeta typing for the app.
- `app/api/liveblocks-auth/route.ts` — signed Liveblocks room-access endpoint gated by Clerk auth and project access checks.
- `proxy.ts` — app-wide Clerk middleware boundary for auth state availability and future route protection.
- `context/` — build context, implementation notes, and progress tracking.

## Storage Model

- **Clerk-hosted auth data**: user identity, session state, and auth-related account metadata.
- **Liveblocks room state**: realtime room identity, per-user presence metadata, and signed access tokens for project-aligned rooms.
- **Application storage**: not yet implemented in this repo.

## Auth and Access Model

- Authentication is provided by Clerk via `@clerk/nextjs`.
- `ClerkProvider` is mounted in `app/layout.tsx` so auth state and Clerk UI are available across the App Router tree.
- Clerk's bundled UI is provided through `@clerk/ui`, using the `dark` base theme with appearance variables mapped to the app's existing CSS tokens.
- `proxy.ts` uses `clerkMiddleware()` plus `createRouteMatcher()` to keep the auth routes public and protect every other route by default.
- Liveblocks room authorization happens server-side in `POST /api/liveblocks-auth`, which requires a signed-in Clerk user and verifies project access before issuing a room token.
- The root route redirects signed-in users to `/editor` and sends signed-out users to the configured Clerk sign-in path.
- The editor shell exposes Clerk's built-in `UserButton` in the navbar and keeps Clerk's default profile and sign-out flows intact.

## Invariants

1. App Router is the only routing model used in this codebase.
2. Clerk imports must come from `@clerk/nextjs` or `@clerk/nextjs/server`.
3. Authentication middleware must use `clerkMiddleware()` in `proxy.ts`.
4. Shared auth context must be mounted inside `<body>` via `<ClerkProvider>`.
5. Public auth route paths come from Clerk's standard sign-in and sign-up environment variables.
6. Liveblocks room IDs must stay aligned with project IDs.
7. Liveblocks session tokens must only be issued after server-side project-access checks.
