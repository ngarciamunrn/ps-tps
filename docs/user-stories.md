# TP Selection User Stories

This document captures the agreed first release of the TP selection portal. It describes behavior only; it does not define a database schema or implement the workflows.

## Decisions

| Topic | Agreed behavior |
| --- | --- |
| Sign-in | Google OAuth accepts any Google account. |
| Administrator | `ngarciam@unrn.edu.ar` is the only administrator. |
| Project capacity | One team selection consumes one project slot, independent of team size. |
| Team size | One to three participants, including the selecting user. |
| Additional participants | Only their first and last names are required; they do not need accounts. |
| Change selection | Release the current selection first, then select another project with capacity. |
| Edit team names | Only the selecting user may edit participant names, at any time. |
| Project removal | Archive projects; do not permanently delete them. |
| Capacity reduction | Admin cannot set capacity below the number of teams already assigned. |

## Stories

### US-01: Sign in with Google

As a visitor, I want to sign in with my Google account so that I can access the project catalog and select a project.

Acceptance criteria:
- Any Google account can authenticate; access is not restricted to a particular email domain.
- A successful first sign-in creates the user's application access without a separate password-registration flow.
- The authenticated identity is used to enforce one active project selection per user.
- Only the account whose email is `ngarciam@unrn.edu.ar` receives administrator permissions; other authenticated accounts remain regular users.
- Role checks are enforced by Supabase policies, not only by hiding controls in the UI.

### US-02: Manage projects

As the administrator, I want to create and edit projects with a title, description, and capacity so that users can choose among current proposals.

Acceptance criteria:
- Admin can create and edit a project's title, description, and capacity.
- Non-admin users cannot create, edit, archive, or change project capacity, including through direct API requests.
- Admin can archive a project instead of permanently deleting it.
- Archived projects are unavailable for new selections, while existing selections and their history are retained.
- Whether archived projects can later be reactivated is not defined by this release.

### US-03: Maintain project capacity

As the administrator, I want capacity to represent the number of teams a project can accept so that project availability is predictable.

Acceptance criteria:
- Each active team selection consumes exactly one slot; participant count does not affect slot usage.
- A project has available capacity while its assigned team count is lower than its configured capacity.
- Admin cannot reduce capacity below the number of teams already assigned to the project.
- Capacity changes are checked against current assignments by the authoritative database operation, not only against a possibly stale UI count.

### US-04: Select a project and register a team

As an authenticated user without an active selection, I want to choose an available project and enter my team's names so that the team is recorded for that project.

Acceptance criteria:
- A user can have at most one active project selection at a time.
- Only active projects with an available team slot can be selected.
- The team contains one to three participants, including the selecting user.
- First and last names are recorded for every participant, including the selecting user.
- Additional participants do not need Google accounts.
- The database records the selection timestamp; the client cannot choose or backdate it.
- The database atomically rechecks availability and records the selection and team. If the project becomes full before submission, the request is rejected without exceeding capacity.
- The selector cannot submit a second project selection until the current selection is released.

### US-05: Change the selected project

As a user with an active selection, I want to release it before choosing another available project so that I can move to a different proposal.

Acceptance criteria:
- Releasing a selection frees its project slot and removes the user's active selection.
- A new project must then be selected as a separate action and must have capacity at submission time.
- If the chosen project becomes full before the new selection is submitted, the new selection is rejected; the previously released selection is not restored automatically.
- Selection release and new selection are authorized for the selecting user; another regular user cannot release someone else's selection.

### US-06: Edit team participant names

As the user who selected a project, I want to edit my team's participant names at any time so that the roster can stay accurate.

Acceptance criteria:
- Only the selecting user can edit the names in that selection.
- Name edits are allowed independently of project selection or release and do not consume or free a slot.
- A name-edit request cannot change the selected project, selector identity, capacity, or selection timestamp.
- Other regular users cannot edit the roster, including through direct API requests.

## Cross-Cutting Scenarios

- Concurrent submissions for the last available team slot cannot both succeed.
- Two simultaneous selections by the same user cannot create two active project selections.
- A capacity reduction racing with a new selection cannot leave assigned teams above the configured capacity.
- Archived projects cannot receive new selections, and archiving does not erase existing team records.
- RLS denies non-admin project mutations and denies roster updates by anyone other than the selecting user.

## Implementation Slices

1. Configure Google OAuth, session handling, and server-enforced administrator authorization.
2. Add project management, archive state, and capacity invariants.
3. Add atomic selection, release, server timestamp, and team participant persistence.
4. Add selector-only roster editing and focused permission, capacity, concurrency, and history tests.

## Deferred Decisions

- Whether an archived project can be reactivated.
- Whether Admin has a UI to browse individual teams and selection timestamps; persistence for capacity and history is required, but this visibility was not specified.
- Whether released selections and their previous team rosters remain in history or are removed.
- Any additional constraints on participant names.