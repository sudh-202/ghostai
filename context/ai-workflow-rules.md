# AI Workflow Rules

## Approach

Build GhostAI incrementally using a spec-driven workflow. Context files
(project-overview.md, architecture.md, ui-context.md, code-standards.md,
feature-specs/) define product scope, system boundaries, UI standards, and
implementation requirements. Always implement against these specs — do not
infer or invent behavior from scratch. Update progress-tracker.md after each
meaningful implementation change. If a requirement is missing or ambiguous,
resolve it in the context files before implementing.

## Scoping Rules

- Work on one feature unit at a time
- Prefer small, verifiable increments over large
  speculative changes
- Do not combine unrelated system boundaries in a
  single implementation step

## When to Split Work

Split an implementation step if it combines:

- Frontend UI changes and authentication/backend changes — keep UI logic isolated from backend integration
- Multiple unrelated feature areas (e.g., project CRUD and editor workspaces) — implement one feature boundary per step
- Behavior not clearly defined in the context files — resolve ambiguities in context files before combining with implementation
  the context files]

If a change cannot be verified end to end quickly,
the scope is too broad — split it.

## Handling Missing Requirements

- Do not invent product behavior not defined in the
  context files
- If a requirement is ambiguous, resolve it in the
  relevant context file before implementing
- If a requirement is missing, add it as an open question
  in `progress-tracker.md` before continuing

## Protected Files

Do not modify the following unless explicitly instructed:

- `components/ui/*` — generated shadcn/ui library components
- `node_modules/` and all third-party library internals

## Keeping Docs in Sync

Update the relevant context file whenever implementation
changes:

- System architecture or boundaries
- Storage model decisions
- Code conventions or standards
- Feature scope

## Before Moving to the Next Unit

1. The current unit works end to end within its defined scope
2. No invariant defined in `architecture.md` was violated
3. `progress-tracker.md` reflects the completed work
4. `npm run build` passes
