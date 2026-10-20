# Workflow platform

The workflow workspace is at `/org-admin/workflows`. Its four destinations are Workflows, Task Inbox, Templates, and Monitoring. The former execution-list URL redirects to Monitoring.

## Run locally

```sh
npm install
npm --prefix backend install
npm --prefix backend run prisma:generate
npm --prefix backend run prisma:deploy
npm --prefix backend run build
npm run dev:backend
# A separate terminal is required for durable background work:
npm run dev:workflow-worker
# Frontend:
npm run dev
```

For deployment, supervise the backend API and `npm --prefix backend run workflow:worker` as separate long-running processes. Build the backend before starting the compiled worker. More than one worker may run; Postgres leases and instance locks coordinate them. A heartbeat older than 60 seconds is shown as offline in Monitoring. API-only deployments can accept human actions, but delays, schedules, integrations, and escalation require a worker.

Configure these in `backend/.env`:

| Variable                                                                       | Purpose                                                                                                        |
| ------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`, `DIRECT_URL`                                                   | Existing PostgreSQL connection configuration                                                                   |
| `WORKFLOW_ENCRYPTION_KEY`                                                      | 64 hexadecimal characters, used for AES-256-GCM connection credentials                                         |
| `WORKFLOW_WEBHOOK_SECRET`                                                      | Strong random secret used for incoming webhook HMAC authentication                                             |
| `WORKFLOW_UPLOAD_DIR`                                                          | Absolute path on a persistent private volume; default `private-workflow-files` under the API working directory |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`, `SMTP_SECURE` | Existing SMTP configuration; workflow email jobs fail visibly if SMTP is unavailable                           |

Generate secrets with `openssl rand -hex 32`. Preserve the encryption key across deployments and backups: replacing it makes existing connection credentials unreadable. Keep uploads outside any public directory. Back up the database, upload volume, and encryption key together. Uploaded files are served as authenticated attachments, with a 20 MB limit and a PDF/image/Office MIME allowlist.

## Author and operate

1. Create a workflow or install a template. Templates always create drafts.
2. Add blocks, connect action ports, and configure the inspector. Use Lifecycle for states and transitions; Data & Forms for fields; People for explicit memberships and workflow roles; Governance for access policies.
3. Validate and save. Publication rejects missing routes, automatic cycles, unreachable blocks, invalid fields/rules, unpaired parallel paths, and invalid terminal states.
4. Test the saved draft. Tests create private version snapshots without publishing. HTTP/email and record writes are simulated; human tasks and timers still run. Test executions are labeled in Monitoring.
5. Publish an immutable version. Active executions remain pinned to their original version.
6. Start a published workflow, submit its form, or let its configured trigger start it. Complete assigned tasks in Task Inbox. Operators can pause, resume, cancel, retry failed work, or invoke permitted lifecycle actions in Monitoring.

Human actions follow configured routes. Any-one/all/quorum approval policies operate on a resolved candidate snapshot. Rejection and return leave the active parallel scope and cancel sibling work. All-branch joins wait for all branches; first-completed joins cancel outstanding siblings. Use explicit manager/user/group relationships; employee display-name strings never resolve authorization.

Business state and technical execution status are independent. State blocks and terminal blocks use configured lifecycle transitions. Terminal transitions close outstanding work. Rule comparisons are typed, calculations use a restricted operator set, and server validation applies even when a field is hidden. File and relationship references are tenant-checked. Restricted fields are redacted from task/execution data and checked again on writes.

Schedules accept ISO timestamps with an offset or local ISO dates/times interpreted in the workflow IANA timezone, default Asia/Kolkata. Repeating schedules use elapsed seconds, at least 60. Date triggers evaluate the configured field when a generic record is created or updated; stale record revisions suppress obsolete scheduled jobs. SLAs use elapsed hours. Pause shifts deadlines that were still in the future when paused; overdue deadlines stay overdue.

## HR cutover

The replacement migration intentionally **deletes all legacy workflow tables and their data**. It preserves HR approval requests, employee profiles, employees, and unrelated audit records. Pending requests become Awaiting Configuration. There is no automatic seeding or fallback workflow.

Publish an HR-compatible workflow, then use its card's Bind action to bind `profile_change`. Configure terminal states with Approved/Rejected outcomes. Existing queued requests start explicitly from the HR approvals screen; future requests start transactionally when submitted. Both the existing approval buttons and Task Inbox use the same task authorization and execution path. Profile updates and business audit records commit once when the terminal outcome is reached; notifications are queued after the transaction. Changing a binding's outcomes does not change already-running HR executions.

## API and runtime contracts

Authenticated endpoints are under `/workflows`:

- Definitions: `GET/POST /`, `GET/PUT/DELETE /:id`, `POST /:id/duplicate`, `/:id/validate`, `/:id/publish`, `/:id/test`, `/:id/start`, `/:id/form`.
- Work queues: `GET /tasks`, `POST /tasks/:id/action`, `GET /notifications`, `POST /notifications/:id/read`.
- Execution: `GET /instances`, `GET /instances/:id`, `POST /instances/:id/actions`.
- Configuration: `/templates`, `/lookups`, `/memberships`, `/bindings`, `/connections`, and `/records`.
- Operations: `GET /monitoring`, `GET /reports.csv`, `POST /hr/:id/start`.
- Files: staged `POST /attachments`, execution `POST /instances/:id/attachments`, and `GET /attachments/:id`. File uploads use multipart field `file`.

`flow.types.ts` defines the versioned graph, rule, expression, form, assignment, and action contracts. Draft updates, task actions, and operator actions require the current `revision`; stale writes return 409. Starts and task actions require a unique `key` for deduplication. Instance lists accept `limit`/`offset`, up to 100 per request. Validation returns `{issues: [{path, message}]}`. Connections return metadata only, never credentials.

Incoming webhooks use `POST /workflow-webhooks/:definitionId`, configured only on published webhook triggers. Send `x-workflow-timestamp` (Unix milliseconds), `x-workflow-event` (unique delivery ID), and `x-workflow-signature` (hex HMAC-SHA256). Sign:

```text
TIMESTAMP.DEFINITION_ID.EVENT_ID.JSON_BODY
```

`JSON_BODY` is compact `JSON.stringify` serialization preserving property order. Timestamps expire after five minutes; event IDs deduplicate within the workflow and tenant. Use a distinct shared secret for each installation and rotate it through deployment configuration.

Generic record APIs emit `record.created`/`record.updated`. HR profile requests are the registered business adapter. Other HRMS modules must register their events and typed update adapters; arbitrary database table writes are not exposed. Record automations suppress recursive event chains. HTTP connections require HTTPS, public DNS/IP destinations, a pinned resolved address, and no redirects; paths must remain on the configured origin. Requests have a 15-second timeout and a 1 MB response limit.

Jobs use transactional insertion, `SKIP LOCKED` claims, 60-second leases, bounded exponential backoff, and persisted attempts/events. External effects are at least once: a stable Idempotency-Key is sent on every retry. Transport timeouts are treated as ambiguous failures requiring operator recovery. Cancellation prevents future work; an external request already in flight cannot be undone. Sensitive credentials and response bodies are excluded from execution events. Integration failures can follow a configured `error` route; task deadlines can follow `timeout` routes.

## Verification

```sh
npm --prefix backend test -- --runInBand
npm --prefix backend run build
npm run build
# Resets only hrms-flow-platform-test / flowtest, never DATABASE_URL:
bash backend/test/prepare-workflow-db.sh
DATABASE_URL=postgresql://flowtest:flowtest@127.0.0.1:5544/flowtest \
DIRECT_URL=postgresql://flowtest:flowtest@127.0.0.1:5544/flowtest \
npm --prefix backend run test:workflows
```

The integration suite prints a synthetic QA account. For browser tests, start the compiled API on port 4100 against that same isolated database with SMTP disabled, and start Next on 3010:

```sh
# Backend working directory, after build:
DATABASE_URL=postgresql://flowtest:flowtest@127.0.0.1:5544/flowtest \
DIRECT_URL=postgresql://flowtest:flowtest@127.0.0.1:5544/flowtest \
PORT=4100 SMTP_HOST='' SMTP_USER='' SMTP_PASS='' node dist/src/main.js
# Repository root, separate terminal:
NEXT_PUBLIC_HRMS_API_URL=http://localhost:4100 NEXT_DIST_DIR=.next-workflow-qa npx next dev -p 3010
WORKFLOW_QA_EMAIL=THE_PRINTED_QA_EMAIL npm run test:workflows:browser
```

Browser tests use local Google Chrome; override `CHROME_PATH` if necessary. They create/edit/publish/test through the canvas, complete work as a separate reviewer, and check desktop/tablet/mobile layouts. SMTP and live external integrations require deployment credentials and destination-specific verification before use.
