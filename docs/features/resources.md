# Resources library

Route: `/dashboard/resources`.

## Schema

- `resources (id, organization_id, title, url, tags text[], notes, created_at)`.
- `session_resources (session_id, resource_id)` — M-N link.

## Dialogs

- [`resource-dialog.tsx`](../../src/components/resources/resource-dialog.tsx)
  — create / edit a library entry. URL is validated; tags are comma-separated.
- [`link-resource-dialog.tsx`](../../src/components/sessions/link-resource-dialog.tsx)
  — attach an existing resource to a session from the session-detail page.

## UX

Resources list supports tag filtering and fuzzy search via
`@tanstack/react-table` + a global filter. Clicking a row opens the URL in a
new tab (`rel="noreferrer noopener"`).
