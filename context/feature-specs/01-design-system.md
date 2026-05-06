Read `AGENTS.md` before starting.

Read `context/ui-context.md` for the theme, colors, typography, and component conventions before implementing UI components — all styling must follow these standards.

We're adding the design system and UI primitive components.
Install and configure `shadcn/ui`.
Add these shadcn components:
- Button
- Card
- Dialog
- Input
- Tabs
- Textarea
- ScrollArea

Do not modify the generated `components/ui/*` files after installation.
Also Install `lucide-react`
Create `lib/utils.ts` with a reusable `cn()` helper for merging Tailwind classes.
Ensure all components match the existing dark theme in `app/globals.css`.

### Check when done
- All components import without errors
- `cn()` works properly
- No default light styling appears
- Update `context/progress-tracker.md` to reflect this implementation