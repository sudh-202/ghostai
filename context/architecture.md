# Architecture Context

## Stack

| Layer     | Technology                  | Role   |
| --------- | --------------------------- | ------ |
| Framework | Next.js 16 App Router + TypeScript | Application shell, routing, and server/client rendering |
| UI        | Tailwind CSS v4 + shadcn/ui + Base UI | Shared primitives and product interface styling |
| Canvas    | React Flow + Liveblocks React Flow | Collaborative node/edge canvas state, minimap, and graph interactions |
| Auth      | Clerk Next.js SDK | Authentication state, session UI, and middleware integration |
| Realtime  | Liveblocks React + Liveblocks Node | Room presence types, room provisioning, and signed realtime session access |
| Jobs      | Trigger.dev SDK v4 | Background design-task execution, run tracking, and run-scoped public token issuance |
| Icons     | lucide-react | Stroke-based interface icons |
| Utilities | clsx + tailwind-merge + class-variance-authority | Class composition and variant handling |

## System Boundaries

- `app/` — App Router entrypoints, global layout, and route-level UI.
- `components/ui/` — shared UI primitives generated or adapted from the design system layer.
- `components/editor/` — product-specific editor shell and composition components.
- `components/editor/ai-sidebar.tsx` — floating right-side AI workspace shell with architect/chat/spec tabs, realtime design chat state, project spec listing, markdown preview modal, and parent-controlled open/close behavior.
- `components/editor/liveblocks-canvas.tsx` — client-side room wrapper that binds Liveblocks auth, room presence, suspense loading, canvas-only participant avatars/cursors, custom node and edge rendering, drag-preview behavior, drag-to-create React Flow state, and starter-template replacement imports together.
- `components/editor/starter-templates.ts` — predefined canvas template definitions built from the shared node and edge types.
- `components/editor/starter-templates-modal.tsx` — starter-template picker dialog with lightweight static previews and import actions.
- `app/api/ai/design/route.ts` — authenticated design-task trigger endpoint that validates project access, dispatches the Trigger.dev task, and stores the returned run ID.
- `app/api/ai/design/token/route.ts` — authenticated run-token endpoint that verifies `TaskRun` ownership before minting a run-scoped Trigger.dev public token.
- `app/api/projects/[projectId]/specs/route.ts` — authenticated ProjectSpec metadata list endpoint for the sidebar Specs tab.
- `app/api/projects/[projectId]/specs/[specId]/route.ts` — authenticated spec content endpoint that resolves private Blob-backed Markdown through the server for modal preview.
- `lib/design-agent.ts` — shared design-agent constants for task identity, Gemini model selection, allowed canvas shapes/color themes, AI collaborator metadata, and default node sizing rules.
- `lib/project-specs.ts` — shared ProjectSpec filename helper so list, preview, and download routes present consistent names without exposing Blob internals.
- `lib/liveblocks.ts` — lazy Liveblocks node client creation plus deterministic cursor-color helpers.
- `liveblocks.config.ts` — global Liveblocks Presence and UserMeta typing for the app.
- `types/canvas.ts` — shared canvas node and edge data/type definitions plus the predefined collaborative node color palette and edge label model.
- `types/tasks.ts` — shared AI task/feed payload types plus runtime validation helpers for design action plans and room-scoped status messages.
- `trigger/design-agent.ts` — Trigger.dev design agent that uses Gemini to turn prompts into validated canvas actions, mutates Liveblocks `flow` storage, and publishes AI presence/status updates back into the room.
- `app/api/liveblocks-auth/route.ts` — signed Liveblocks room-access endpoint gated by Clerk auth and project access checks.
- `proxy.ts` — app-wide Clerk middleware boundary for auth state availability and future route protection.
- `context/` — build context, implementation notes, and progress tracking.

## Storage Model

- **Clerk-hosted auth data**: user identity, session state, and auth-related account metadata.
- **Liveblocks room state**: realtime room identity, per-user presence metadata (including cursor position and transient thinking state), signed access tokens for project-aligned rooms, and room-scoped feeds such as the shared `ai-status-feed`.
- **Liveblocks storage state**: collaborative React Flow nodes and edges stored under the `flow` key in each project room.
- **Canvas interaction state**: shape-drag payloads are previewed client-side, then converted into React Flow node additions and synchronized into Liveblocks storage through the shared node-change pipeline; selected-node resizing also flows through that same pipeline, while inline node and edge label edits plus node color-toolbar changes write to shared `data` fields in Liveblocks storage (`node.data.label`, `node.data.color`, `node.data.textColor`, and `edge.data.label`). Predefined starter-template imports replace the full `flow` graph in collaborative storage before fitting the canvas view to the imported diagram.
- **Application storage**: Prisma stores project rows plus `TaskRun` ownership records that bind Trigger.dev run IDs to the requesting Clerk user and project.
- **Background run state**: Trigger.dev executes the design-agent task outside the request lifecycle; the Next.js API layer stores run IDs locally and later issues run-scoped public tokens for client subscriptions, while the task itself uses Gemini plus Liveblocks server APIs to mutate the collaborative canvas and surface AI presence/status to connected participants.

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
8. Design-agent run tokens must only be issued after verifying the stored `TaskRun` record belongs to the current Clerk user.
