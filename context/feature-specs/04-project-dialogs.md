## Goal

Build the `/editor` home screen and add project dialogs/sidebar actions. No API calls or persistence yet.

## Editor Home

Reuse the existing editor layout. Do not modify core navbar or sidebar navigation behavior (layout, positioning, collapsing). Minor UI additions like action controls or status indicators may be added to these areas as features expand.
In the center of the page, add:
- heading: `Create a project or open an existing one`
- description: `Start a new architecture workspace, or choose a project from the sidebar.`
- "New Project button with a `Plus` icon
Keep the layout minimal. Do not wrap this content in cards.
Clicking. `New Project` should open the Create Project dialog.

## Dialogs

### Create Project

- project name input
- live slug preview based on the name
- preview updates as the user types

#### Slug Generation Rules

The live slug preview transforms the project name using these rules:
- Convert to lowercase
- Trim whitespace from start and end
- Replace spaces and most punctuation with hyphens
- Allow only letters, numbers, and hyphens
- Strip or collapse consecutive hyphens to single hyphens
- Maximum length: 50 characters; truncate and trim trailing hyphens if longer
- Empty input shows placeholder "untitled-project"
- Input containing only disallowed characters falls back to "untitled-project"
- Backend handles duplicate slugs with a uniqueness check and suffix appending (e.g., `-2`, `-3`)

### Project Name Validation

For both "Create Project" and "Rename Project" dialogs:
- Minimum length: 1 character
- Maximum length: 64 characters
- Allowed characters: alphanumeric, spaces, hyphens, underscores, parentheses, and common punctuation
- No leading or trailing whitespace
- UI behavior: show inline error message below the input if invalid; disable submit button until valid
- Duplicate name handling: instant check against mock projects; if duplicate detected, show error "A project with this name already exists" and disable submit until the name is unique
- Enter key behavior: submits if validation passes; ignored if validation fails

#### Post-Action Behavior

**Create Project:**
- Dialog closes on successful submission
- User navigates to the new project's page (or editor view focused on the new project)
- Toast notification displays "Project created successfully"
- New project appears in sidebar under "My Projects" tab with focus/highlight
- Input clears and slug resets to placeholder

**Rename Project:**
- Dialog closes on successful submission
- Sidebar project name updates in-place with optional fade-in transition
- Toast notification displays "Project renamed"
- If the renamed project is currently active/open in the editor, the editor title/breadcrumb updates
- Input clears after submission

**Delete Project:**
- Dialog closes on successful submission
- Sidebar removes the deleted project entry with optional fade-out transition
- Toast notification displays "Project deleted"
- If the deleted project was the active/open project, app navigates back to the editor home (or to the first project in the list)
- Destructive button styling (red background) is used for the confirm button

### Rename Project

- prefilled project name input
- current project name shown in the description
- input auto-focuses
- Enter submits
### Delete Project

- destructive confirmation only
- no input
- confirm button uses destructive styling

## Sidebar

Add project item actions:
- rename
- delete

Show actions only for owned projects.
Hide actions for shared/collaborator projects.

#### Mock Project Data

Each project object must include an `isOwner` (or `isOwned`) boolean flag:

```typescript
type Project = {
  id: string
  name: string
  slug: string
  isOwner: boolean // or isOwned — true if user owns, false if user is collaborator/shared-only
}
```

UI actions (rename/delete buttons) render only when `isOwner === true`. When `isOwner === false`, actions are hidden.

For testing, toggle the `isOwner` flag on sample projects to simulate owned vs. shared/collaborator access and verify that the UI correctly shows or hides actions.

On mobile:
- tapping outside the sidebar closes it
- add a backdrop scrim

## Implementation
Create a dedicated hook to manage:
- dialog state
- form state
- loading state

Wire:
- editor home `New Project` → Create dialog
- sidebar create → Create dialog
- sidebar rename → Rename dialog
- sidebar delete → Delete dialog
Use mock project data only. Do not add API calls or persistence.

## Check When Done

- sidebar action are wired
- slug preview works
- no Typescript errors
- no lint errors