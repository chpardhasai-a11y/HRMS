"use client";
import { useEffect, useState } from "react";
import { Plus, Trash2, ArrowRight } from "lucide-react";
import { Field, JsonEditor } from "./ui";
import { AssignmentEditor, FormDesigner, RuleEditor } from "./forms";
import { flow } from "./api";
export const categories = [
  {
    id: "trigger",
    name: "Triggers",
    description: "Choose how work begins",
    color: "green",
  },
  {
    id: "lifecycle",
    name: "States, Actions & Transitions",
    description: "Define your lifecycle",
    color: "violet",
  },
  {
    id: "task",
    name: "Tasks & Human Actions",
    description: "Bring people into the process",
    color: "blue",
  },
  {
    id: "decision",
    name: "Rules & Decision Engine",
    description: "Choose the right path",
    color: "amber",
  },
  {
    id: "people",
    name: "People, Roles & Assignment",
    description: "Find the right owner",
    color: "rose",
  },
  {
    id: "data",
    name: "Data & Forms",
    description: "Capture what matters",
    color: "blue",
  },
  {
    id: "automation",
    name: "Automation & Integrations",
    description: "Connect and automate work",
    color: "violet",
  },
  {
    id: "governance",
    name: "Governance & Controls",
    description: "Set boundaries and policies",
    color: "green",
  },
  {
    id: "time",
    name: "Time, Events & Exceptions",
    description: "Handle delays and interruptions",
    color: "amber",
  },
  {
    id: "monitoring",
    name: "Monitoring & Observability",
    description: "Understand every execution",
    color: "rose",
  },
];
export function Lifecycle({ doc, onChange }) {
  const update = (patch) => onChange({ ...doc, ...patch });
  return (
    <>
      <p className="flow-muted">
        Business states describe the lifecycle. Runtime status tracks execution
        separately.
      </p>
      {doc.states.map((s, i) => (
        <div className="flow-config-card" key={s.id}>
          <div className="flow-two-cols">
            <Field label="State name">
              <input
                value={s.name}
                onChange={(e) =>
                  update({
                    states: doc.states.map((v, j) =>
                      i === j ? { ...v, name: e.target.value } : v,
                    ),
                  })
                }
              />
            </Field>
            <Field label="Key">
              <input value={s.id} readOnly />
            </Field>
          </div>
          <div className="flow-actions">
            <label className="flow-check">
              <input
                type="radio"
                name="initial-state"
                checked={!!s.initial}
                onChange={() =>
                  update({
                    states: doc.states.map((v, j) => ({
                      ...v,
                      initial: i === j,
                    })),
                  })
                }
              />
              Initial
            </label>
            <label className="flow-check">
              <input
                type="checkbox"
                checked={!!s.terminal}
                onChange={(e) =>
                  update({
                    states: doc.states.map((v, j) =>
                      i === j ? { ...v, terminal: e.target.checked } : v,
                    ),
                  })
                }
              />
              Terminal
            </label>
            <button
              className="flow-icon-button"
              title="Remove state"
              onClick={() =>
                update({ states: doc.states.filter((_, j) => j !== i) })
              }
            >
              <Trash2 size={14} />
            </button>
          </div>
          {s.terminal && (
            <Field label="HR approval outcome (optional)">
              <select
                value={s.outcome || ""}
                onChange={(e) =>
                  update({
                    states: doc.states.map((v, j) =>
                      i === j
                        ? { ...v, outcome: e.target.value || undefined }
                        : v,
                    ),
                  })
                }
              >
                <option value="">No HR outcome</option>
                <option>Approved</option>
                <option>Rejected</option>
              </select>
            </Field>
          )}
        </div>
      ))}
      <button
        className="flow-button"
        onClick={() =>
          update({
            states: [
              ...doc.states,
              { id: crypto.randomUUID(), name: "New state" },
            ],
          })
        }
      >
        <Plus size={14} /> Add state
      </button>
      <h3>Allowed transitions</h3>
      {doc.transitions.map((t, i) => {
        const patch = (p) =>
          update({
            transitions: doc.transitions.map((v, j) =>
              i === j ? { ...v, ...p } : v,
            ),
          });
        return (
          <div className="flow-config-card" key={t.id}>
            <Field label="Action name">
              <input
                value={t.action}
                onChange={(e) => patch({ action: e.target.value })}
              />
            </Field>
            <div className="flow-two-cols">
              {["from", "to"].map((k) => (
                <Field key={k} label={k}>
                  <select
                    value={t[k]}
                    onChange={(e) => patch({ [k]: e.target.value })}
                  >
                    {doc.states.map((s) => (
                      <option value={s.id} key={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </Field>
              ))}
            </div>
            <Field label="Allowed roles / users (blank = automatic and all actors)">
              <input
                value={(t.roles || []).join(", ")}
                onChange={(e) =>
                  patch({
                    roles: e.target.value
                      .split(",")
                      .map((s) => s.trim())
                      .filter(Boolean),
                  })
                }
              />
            </Field>
            <label className="flow-check">
              <input
                type="checkbox"
                checked={!!t.guard}
                onChange={(e) =>
                  patch({
                    guard: e.target.checked
                      ? { op: "exists", field: "" }
                      : undefined,
                  })
                }
              />{" "}
              Add guard
            </label>
            {t.guard && (
              <RuleEditor
                value={t.guard}
                fields={doc.fields}
                onChange={(guard) => patch({ guard })}
              />
            )}
            <button
              className="flow-button danger small"
              onClick={() =>
                update({
                  transitions: doc.transitions.filter((_, j) => j !== i),
                })
              }
            >
              Remove transition
            </button>
          </div>
        );
      })}
      <button
        className="flow-button"
        onClick={() =>
          update({
            transitions: [
              ...doc.transitions,
              {
                id: crypto.randomUUID(),
                from: doc.states[0]?.id,
                to: doc.states[1]?.id,
                action: "submit",
              },
            ],
          })
        }
      >
        <Plus size={14} /> Add transition
      </button>
    </>
  );
}
export function GlobalConfig({ section, doc, onChange, lookups, onError }) {
  const patch = (p) => onChange({ ...doc, ...p }),
    [connections, setConnections] = useState([]),
    [connection, setConnection] = useState({
      name: "",
      baseUrl: "",
      secret: "",
    }),
    [membership, setMembership] = useState({
      userId: "",
      kind: "manager",
      referenceId: "",
    }),
    [notice, setNotice] = useState("");
  useEffect(() => {
    if (section === "automation")
      flow("/connections")
        .then(setConnections)
        .catch((e) => onError(e.message));
  }, [section]);
  if (section === "lifecycle")
    return <Lifecycle doc={doc} onChange={onChange} />;
  if (section === "data")
    return (
      <FormDesigner
        fields={doc.fields}
        onChange={(fields) => patch({ fields })}
      />
    );
  if (section === "governance")
    return (
      <>
        <label className="flow-check">
          <input
            type="checkbox"
            checked={!!doc.policies.allowSelfApproval}
            onChange={(e) =>
              patch({
                policies: {
                  ...doc.policies,
                  allowSelfApproval: e.target.checked,
                },
              })
            }
          />{" "}
          Allow self approval
        </label>
        {["authors", "publishers", "operators", "starters", "viewers"].map(
          (k) => (
            <Field
              key={k}
              label={`${k[0].toUpperCase() + k.slice(1)} (roles or user IDs)`}
              hint={
                ["starters", "viewers"].includes(k)
                  ? "Blank uses participant visibility and allows authenticated starts."
                  : "Blank grants organization administrators."
              }
            >
              <input
                value={(doc.policies[k] || []).join(", ")}
                onChange={(e) =>
                  patch({
                    policies: {
                      ...doc.policies,
                      [k]: e.target.value
                        .split(",")
                        .map((s) => s.trim())
                        .filter(Boolean),
                    },
                  })
                }
              />
            </Field>
          ),
        )}
        <Field label="Maximum automatic steps">
          <input
            type="number"
            min="1"
            max="1000"
            value={doc.policies.maxSteps || 1000}
            onChange={(e) =>
              patch({
                policies: { ...doc.policies, maxSteps: Number(e.target.value) },
              })
            }
          />
        </Field>
        <p className="flow-muted">
          Published versions and execution audit events are retained. Editing
          this draft does not modify running executions.
        </p>
      </>
    );
  if (section === "monitoring")
    return (
      <>
        <Field label="Workflow SLA (hours)">
          <input
            type="number"
            min="1"
            value={doc.monitoring?.slaHours || ""}
            onChange={(e) =>
              patch({
                monitoring: {
                  ...doc.monitoring,
                  slaHours: Number(e.target.value),
                },
              })
            }
          />
        </Field>
        <Field label="Report field keys">
          <input
            value={(doc.monitoring?.reportFields || []).join(", ")}
            onChange={(e) =>
              patch({
                monitoring: {
                  ...doc.monitoring,
                  reportFields: e.target.value
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean),
                },
              })
            }
          />
        </Field>
        <p className="flow-muted">
          Execution timelines, bottlenecks, failed jobs, and overdue tasks
          appear in Monitoring.
        </p>
        <a className="flow-button" href="/org-admin/workflows/monitoring">
          Open monitoring <ArrowRight size={14} />
        </a>
      </>
    );
  if (section === "time")
    return (
      <>
        <Field label="Schedule timezone">
          <input
            value={doc.policies.timezone || "Asia/Kolkata"}
            onChange={(e) =>
              patch({ policies: { ...doc.policies, timezone: e.target.value } })
            }
          />
        </Field>
        <p className="flow-muted">
          Set task SLAs and timeout routes on human-action blocks. Use a Delay
          block for durable waits. Operators can pause, resume, cancel, and
          recover executions in Monitoring.
        </p>
      </>
    );
  if (section === "people")
    return (
      <>
        <h3>Workflow roles</h3>
        <JsonEditor
          label="Role members"
          value={doc.policies.workflowRoles || {}}
          hint="Map role names to user IDs from your organization."
          onChange={(v) =>
            patch({ policies: { ...doc.policies, workflowRoles: v } })
          }
        />
        <h3>Organization relationships</h3>
        <Field label="User">
          <select
            value={membership.userId}
            onChange={(e) =>
              setMembership({ ...membership, userId: e.target.value })
            }
          >
            <option value="">Select person</option>
            {lookups.users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.email}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Relationship">
          <select
            value={membership.kind}
            onChange={(e) =>
              setMembership({
                ...membership,
                kind: e.target.value,
                referenceId: "",
              })
            }
          >
            {["manager", "department", "team"].map((k) => (
              <option key={k}>{k}</option>
            ))}
          </select>
        </Field>
        <Field label="Manager or group">
          <select
            value={membership.referenceId}
            onChange={(e) =>
              setMembership({ ...membership, referenceId: e.target.value })
            }
          >
            <option value="">Select…</option>
            {(membership.kind === "manager"
              ? lookups.users
              : membership.kind === "department"
                ? lookups.departments
                : lookups.teams
            ).map((v) => (
              <option key={v.id} value={v.id}>
                {v.email || v.name}
              </option>
            ))}
          </select>
        </Field>
        <button
          className="flow-button"
          onClick={async () => {
            try {
              await flow("/memberships", "POST", membership);
              setNotice("Relationship saved");
            } catch (e) {
              onError(e.message);
            }
          }}
        >
          Save relationship
        </button>
        {notice && <p className="flow-success">{notice}</p>}
        <p className="flow-muted">
          Manager relationships use user IDs. Display names never grant approval
          access.
        </p>
      </>
    );
  if (section === "automation")
    return (
      <>
        <h3>Integration connections</h3>
        {connections.map((c) => (
          <div className="flow-config-card" key={c.id}>
            <strong>{c.name}</strong>
            <p className="flow-muted">{c.baseUrl}</p>
            <small>ID: {c.id}</small>
          </div>
        ))}
        {Object.keys(connection).map((k) => (
          <Field
            label={
              k === "baseUrl"
                ? "HTTPS base URL"
                : k === "secret"
                  ? "Bearer token"
                  : "Connection name"
            }
            key={k}
          >
            <input
              type={k === "secret" ? "password" : "text"}
              value={connection[k]}
              onChange={(e) =>
                setConnection({ ...connection, [k]: e.target.value })
              }
            />
          </Field>
        ))}
        <button
          className="flow-button"
          onClick={async () => {
            try {
              const c = await flow("/connections", "POST", connection);
              setConnections([...connections, c]);
              setConnection({ name: "", baseUrl: "", secret: "" });
            } catch (e) {
              onError(e.message);
            }
          }}
        >
          Save encrypted connection
        </button>
      </>
    );
  return null;
}
export function NodeConfig({ node, doc, onChange, lookups }) {
  const c = node.config,
    patch = (p) => onChange({ ...node, config: { ...c, ...p } }),
    field = (label, key, type = "text") => (
      <Field label={label}>
        <input
          type={type}
          value={c[key] ?? ""}
          onChange={(e) =>
            patch({
              [key]:
                type === "number" ? Number(e.target.value) : e.target.value,
            })
          }
        />
      </Field>
    );
  return (
    <>
      <Field label="Block name">
        <input
          value={node.label}
          onChange={(e) => onChange({ ...node, label: e.target.value })}
        />
      </Field>
      {node.type === "trigger" && (
        <>
          <Field label="Start when">
            <select
              value={c.event || "manual"}
              onChange={(e) => patch({ event: e.target.value })}
            >
              {[
                ["manual", "Started manually"],
                ["form", "Form submitted"],
                ["record.created", "Record created"],
                ["record.updated", "Record updated"],
                ["schedule", "Schedule reached"],
                ["date", "Record date reached"],
                ["webhook", "Webhook received"],
              ].map(([v, l]) => (
                <option value={v} key={v}>
                  {l}
                </option>
              ))}
            </select>
          </Field>
          {c.event?.startsWith("record.") && field("Record type", "recordType")}
          {c.event === "date" && (
            <>
              {field("Record type", "recordType")}
              {field("Date field key", "dateField")}
            </>
          )}
          {c.event === "schedule" && (
            <>
              {field("First run (with timezone offset)", "at")}
              {field(
                "Repeat every seconds (min 60; blank = once)",
                "intervalSeconds",
                "number",
              )}
              <JsonEditor
                label="Scheduled input data"
                value={c.data || {}}
                onChange={(data) => patch({ data })}
              />
            </>
          )}
          {c.event === "webhook" && (
            <p className="flow-muted">
              POST to /workflow-webhooks/WORKFLOW_ID. Sign timestamp, workflow
              ID, event ID, and JSON body using the server webhook secret.
            </p>
          )}
        </>
      )}
      {["task", "form"].includes(node.type) && (
        <>
          <AssignmentEditor
            value={c.assignment}
            onChange={(assignment) => patch({ assignment })}
            lookups={lookups}
          />
          <Field label="Available actions">
            <input
              value={(c.actions || ["complete"]).join(", ")}
              onChange={(e) =>
                patch({
                  actions: e.target.value
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean),
                })
              }
            />
          </Field>
          <Field label="Approval policy">
            <select
              value={c.approvalPolicy || "any"}
              onChange={(e) => patch({ approvalPolicy: e.target.value })}
            >
              <option value="any">Any one person</option>
              <option value="all">Everyone</option>
              <option value="quorum">Quorum</option>
            </select>
          </Field>
          {c.approvalPolicy === "quorum" &&
            field("Required votes", "quorum", "number")}
          {field("SLA (hours)", "slaHours", "number")}
          <Field label="Escalation assignees">
            <select
              multiple
              value={c.escalationUsers || []}
              onChange={(e) =>
                patch({
                  escalationUsers: Array.from(e.target.selectedOptions).map(
                    (o) => o.value,
                  ),
                })
              }
            >
              {lookups.users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.email}
                </option>
              ))}
            </select>
          </Field>
          <p className="flow-muted">
            Connect each action to its destination. An optional timeout route
            executes when the deadline passes.
          </p>
        </>
      )}
      {["state", "end"].includes(node.type) && (
        <>
          <Field
            label={node.type === "end" ? "Terminal state" : "Business state"}
          >
            <select
              value={c.state || ""}
              onChange={(e) => patch({ state: e.target.value })}
            >
              <option value="">Choose state</option>
              {doc.states
                .filter((s) => node.type !== "end" || s.terminal)
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
            </select>
          </Field>
          {field("Transition action", "action")}
        </>
      )}
      {node.type === "decision" && (
        <p className="flow-muted">
          Select an outgoing connection to configure its condition. Branches are
          evaluated in connection order. One default branch is required.
        </p>
      )}
      {node.type === "wait" && field("Delay in seconds", "seconds", "number")}
      {node.type === "fork" && (
        <Field label="Matching join">
          <select
            value={c.joinId || ""}
            onChange={(e) => patch({ joinId: e.target.value })}
          >
            <option value="">Choose join</option>
            {doc.nodes
              .filter((n) => n.type === "join")
              .map((n) => (
                <option value={n.id} key={n.id}>
                  {n.label}
                </option>
              ))}
          </select>
        </Field>
      )}
      {node.type === "join" && (
        <Field label="Continue when">
          <select
            value={c.mode || "all"}
            onChange={(e) => patch({ mode: e.target.value })}
          >
            <option value="all">All branches complete</option>
            <option value="first">First branch completes</option>
          </select>
        </Field>
      )}
      {node.type === "automation" && (
        <>
          <Field label="Automation action">
            <select
              value={c.action || "notification"}
              onChange={(e) => patch({ action: e.target.value })}
            >
              {[
                ["notification", "In-app notification"],
                ["email", "Send email"],
                ["http", "HTTP request"],
                ["webhook", "Outgoing webhook"],
                ["updateRecord", "Update workflow record"],
                ["calculate", "Calculate value"],
              ].map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </Field>
          {["notification", "email"].includes(c.action) && (
            <>
              {field("Message", "message")}
              {c.action === "email" ? (
                <>
                  {field("Recipient email", "to")}
                  {field("Recipient data field (optional)", "toField")}
                  {field("Subject", "subject")}
                </>
              ) : (
                <AssignmentEditor
                  value={c.assignment}
                  onChange={(assignment) => patch({ assignment })}
                  lookups={lookups}
                />
              )}
            </>
          )}
          {["http", "webhook"].includes(c.action) && (
            <>
              {field("Connection ID", "connectionId")}
              {field("Request path", "path")}
              <Field label="HTTP method">
                <select
                  value={c.method || "POST"}
                  onChange={(e) => patch({ method: e.target.value })}
                >
                  {["GET", "POST", "PUT", "PATCH", "DELETE"].map((m) => (
                    <option key={m}>{m}</option>
                  ))}
                </select>
              </Field>
              {field("Request body field (optional)", "bodyField")}
              <JsonEditor
                label="Request body"
                value={c.body || {}}
                onChange={(body) => patch({ body })}
              />
              {field("Save response to field", "responseField")}
              {field("Retry count (0–9)", "retries", "number")}
            </>
          )}
          {c.action === "updateRecord" && (
            <>
              {field("Record ID data field", "recordIdField")}
              <JsonEditor
                label="Values to update"
                value={c.values || {}}
                onChange={(values) => patch({ values })}
              />
            </>
          )}
          {c.action === "calculate" && (
            <>
              {field("Output field key", "field")}
              <JsonEditor
                label="Calculation expression"
                value={
                  c.expression || {
                    op: "multiply",
                    values: [{ field: "amount" }, 1.18],
                  }
                }
                onChange={(expression) => patch({ expression })}
              />
            </>
          )}
        </>
      )}
    </>
  );
}
