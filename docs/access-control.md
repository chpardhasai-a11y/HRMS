# Organization Access Control

Open **Org Admin → Access Control**. Permissions Management is a code-managed,
read-only catalog. Levels Management defines L1/L2/L3 hierarchy (L1 highest),
without permission inheritance. Teams Management reuses the department team
records and workflow memberships. Roles Management assigns a level and explicit
organization permissions to each role. User Management creates sign-in accounts,
links employees, assigns multiple roles, activates/deactivates accounts, shows
effective access, and resets passwords.

## Deployment

Run `npm --prefix backend run prisma:generate`, `npm --prefix backend run prisma:deploy`,
then build and restart the API. Migration `20261021000000_access_control_levels`
adds only AccessLevel and its indexes/constraints. Migration
`20261022000000_access_roles_users` adds custom roles, tenant-constrained user role
assignments, and a session version on existing accounts. It assigns no roles or
permissions automatically and preserves existing account types. No default
levels or custom roles are created. Restart both API and workflow worker after
building so scheduled assignments use the updated role resolver.
The legacy team page redirects to Access Control; existing `/org-masters/teams`
API contracts remain available.

## Interfaces and security

New `/access-control` endpoints require an active organization administrator and
active company. Tenant comes from the authenticated account, never request data.

- `GET /permissions`: paginated catalog, `search` and `module` filters. No writes.
- `GET/POST /levels`, `PATCH /levels/:id`, `PATCH /levels/:id/status`.
- `GET/POST /teams`, `PATCH/DELETE /teams/:id`, `PATCH /teams/:id/status`.
- `GET/POST /teams/:id/members`, `DELETE /teams/:id/members/:userId`.
- `GET /users/options`: active users in this company; identification fields only.

Lists use `page` and `pageSize` (maximum 100), returning `items`, `total`, `page`,
and `pageSize`. Levels and teams also support `status=active|inactive`.
Mutations are audited transactionally through SecurityAuditLog. Duplicate level
numbers return 409. Repeated member additions/removals are idempotent.
Teams referenced by members or any saved workflow version/draft cannot be deleted.
Inactive teams retain members and existing task candidate snapshots; future
team-based assignments resolve only active teams, then use configured fallbacks.
Workflow draft saves and team deletion share a tenant lock to prevent dangling
team references. Legacy workflow membership writes use the same team service.

The permission catalog remains read-only and code-managed. Each available entry
maps to a real endpoint. Platform-only operations are labeled separately. Role
configuration exposes only delegable organization capabilities; platform actions,
Access Control administration, authentication and public reference operations
cannot be assigned as custom role grants. The legacy Teams APIs are also excluded
because Teams Management is part of administrator-only Access Control.
Maintain stable catalog keys when changing labels. A coverage test fails when
business endpoints are added or removed without updating the catalog.

## Verification

Use the dedicated disposable PostgreSQL database on `127.0.0.1:5544/flowtest`.
Do not point test commands at the HRMS database. Apply the migrations first.

```sh
npm --prefix backend test -- --runInBand
cd backend
DATABASE_URL=postgresql://flowtest:flowtest@127.0.0.1:5544/flowtest \
DIRECT_URL=postgresql://flowtest:flowtest@127.0.0.1:5544/flowtest \
JWT_SECRET=workflow-local-qa-secret \
node -r ts-node/register test/access-control.integration.ts
```

The integration test creates synthetic tenants and writes only synthetic login
fixture details to `/tmp/hrms-access-qa-fixture.json`. It verifies isolation,
read-only permissions, hierarchy validation, concurrent duplicates, audits,
legacy team compatibility, membership validation and real workflow assignments.
Start the QA API on 4100 using the same database and JWT secret, and a QA frontend
on 3010 with `NEXT_PUBLIC_HRMS_API_URL=http://localhost:4100`.
Run `npx playwright test tests/access-control.spec.js` from the repository root.
The existing workflow browser suite needs its own `WORKFLOW_QA_EMAIL` fixture.

## Roles and accounts

- `GET/POST /roles`, `GET/PATCH /roles/:id`, `PATCH /roles/:id/status`.
- `GET /roles/options` supplies levels and the code-managed permission catalog
  with an `assignable` marker. Permission definitions are never editable.
- `GET/POST /users`, `GET /users/:id/detail`, `PATCH /users/:id`,
  `PATCH /users/:id/status`, `POST /users/:id/password`.
- `GET /employees/options` is a tenant-scoped, paginated employee link picker.
- Role updates/status changes require a `revision`. User changes/password resets
  require the current `updatedAt`. Stale submissions return 409.

Organization administrator accounts retain full organization access. Employee
accounts retain baseline self-service/workflow participant access and receive the
union of active custom role grants. Levels rank roles (L1 highest) and do not
inherit or grant permissions. Active roles can retain a deactivated level as
hierarchy metadata; new roles must choose an active level. A disabled role grants
nothing. Existing role assignments are preserved when roles are disabled.

Custom grants are checked against the exact API operation on each request. They
do not change the account type or grant platform/Access Control administration.
Ownership checks expand to organization scope only for an explicitly granted
operation. Workflow policies, field visibility and task eligibility continue to
apply. Workflows can assign tasks to a custom role as well as built-in roles.

JWT validation reloads the active account, company, roles and permissions; role
changes therefore affect existing sessions immediately. Account updates and
administrator password resets increment the session version. A deactivated
account cannot authenticate. Existing pre-migration tokens remain compatible
with session version zero until an account change revokes them.

New accounts receive an administrator-entered initial password (12 characters
minimum, at most 72 UTF-8 bytes). Passwords are hashed and never returned or
audited. Share initial/reset passwords securely outside this module; no email is
sent by these operations. Platform accounts are excluded. Administrators cannot
disable/demote themselves or remove the last active organization administrator.
Employee links are tenant-scoped and cannot be shared by multiple accounts.

Run `npm --prefix backend run test:roles-users` with the same disposable database
and JWT environment used above. It writes synthetic browser fixture details to
`/tmp/hrms-roles-users-qa-fixture.json`. With QA frontend/API running, use
`WORKFLOW_UI_URL=http://localhost:3011 WORKFLOW_TEST_API=http://localhost:4111 npm run test:roles-users:browser`.

Employee provisioning preserves an existing sign-in account with the same email;
it never replaces that account's password or employee link. Resending invitations
can rotate credentials only for active, unconfigured employee accounts. Configured
or administrator accounts use User Management/password recovery. Employee account
setup no longer accepts a fixed fallback verification code. Accounts without an
employee link show an explicit empty state in self-service instead of a demo profile.

## CRUD permissions

Roles and Permissions use the same module definitions: Create, Read, Update,
Delete, plus Approve/Reject for HR Approvals and Publish/Start/Act on task for
Workflows. All workflow operations appear under one Workflows module. Employee
history and onboarding views are included in Read; transfer, status changes and
invitations are included in Update. Master-data activation is included in Update.
Every module and permission has a description of its purpose and allowed actions.
The Permissions page shows Permission Name, Code, Section, Module, Action and Description (without Resource), with section/module/action
filters and search across descriptions. It has no separate technical catalog.

`GET /access-control/roles/options` and `GET /access-control/permissions` retain
`businessGroups` for API compatibility: groups have `id`, `label`, `description`
and `actions`; actions have `id`, `label`, `description`, `kind`
(`create|read|edit|delete|special`) and `permissionKeys`. The internal `edit` kind
is displayed as Update. Existing endpoint catalog fields remain unchanged for
older API clients. Role lists retain `businessActionCount` per role and
`summary.assignedBusinessActions`, which the UI labels Permissions.

Stored grants remain individual API permission keys. Partial access means an
existing role holds only some keys in a CRUD permission. Opening or saving an
unrelated edit preserves the exact original grants. Selecting a partial permission
grants its entire bundle; clearing it removes that bundle. Filters never change
hidden selections. No migration or automatic permission expansion is performed.
Coverage tests reject missing, duplicate or restricted API mappings. Ownership,
workflow policies, task eligibility and approval checks remain enforced.

The frontend also supports API responses from before `businessGroups` and grouped
role counts were added. CRUD definitions are shared in `permission-groups.json`;
when groups are absent, the UI maps only keys explicitly marked assignable by
`/roles/options`. It never offers unsupported keys or expands saved grants.
Overview counts are calculated from those groups and existing role keys. Missing
organization-wide grouped summary counts display as unavailable until the API is
updated, rather than using raw endpoint counts or displaying NaN.


The Permissions catalog includes the Access Control section: Users, Roles, Levels,
Teams and Permissions. These CRUD entries (plus Reset password) document existing
administrator-only operations and cannot be assigned to custom roles. API responses
expose the combined display catalog as `catalogGroups`; `businessGroups` remains the
assignable role catalog. Older responses use shared definitions filtered to known
API operations. Overview totals include the display catalog. Descriptions wrap in
their table cells and remain fully visible without expanding or horizontal text overflow.
