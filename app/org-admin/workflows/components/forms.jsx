"use client";
import { useState } from "react";
import { Plus, Trash2, Upload, ChevronDown } from "lucide-react";
import { Field, JsonEditor } from "./ui";
import { upload, currentUser, flow } from "./api";
function get(data, path = "") {
  return path.split(".").reduce((v, k) => v?.[k], data);
}
function matches(rule, data) {
  if (!rule) return true;
  const a = get(data, rule.field),
    b = rule.value;
  return rule.op === "and"
    ? (rule.rules || []).every((r) => matches(r, data))
    : rule.op === "or"
      ? (rule.rules || []).some((r) => matches(r, data))
      : rule.op === "not"
        ? !matches(rule.rules?.[0], data)
        : rule.op === "eq"
          ? a === b
          : rule.op === "ne"
            ? a !== b
            : rule.op === "exists"
              ? a != null && a !== ""
              : rule.op === "contains"
                ? a?.includes?.(b)
                : rule.op === "gt"
                  ? a > b
                  : rule.op === "gte"
                    ? a >= b
                    : rule.op === "lt"
                      ? a < b
                      : rule.op === "lte"
                        ? a <= b
                        : rule.op === "in"
                          ? b?.includes(a)
                          : false;
}
export function RuntimeForm({
  fields = [],
  data,
  onChange,
  instanceId,
  definitionId,
}) {
  const [error, setError] = useState(""),
    [references, setReferences] = useState({});
  const user = currentUser();
  return (
    <div className="flow-runtime-form">
      {error && <div className="flow-error">{error}</div>}
      {fields
        .filter(
          (f) =>
            (!f.readRoles?.length || f.readRoles.includes(user?.role)) &&
            matches(f.visibleWhen, data),
        )
        .map((f) => {
          const change = (v) => onChange({ ...data, [f.id]: v }),
            disabled =
              f.writeRoles?.length && !f.writeRoles.includes(user?.role);
          if (f.type === "section")
            return (
              <fieldset key={f.id} className="flow-repeat">
                <legend>{f.label}</legend>
                {(data[f.id] || []).map((row, i) => (
                  <div key={i}>
                    <RuntimeForm
                      fields={f.fields}
                      data={row}
                      instanceId={instanceId}
                      definitionId={definitionId}
                      onChange={(value) =>
                        change(data[f.id].map((r, j) => (i === j ? value : r)))
                      }
                    />
                    <button
                      type="button"
                      className="flow-button small"
                      onClick={() =>
                        change(data[f.id].filter((_, j) => i !== j))
                      }
                    >
                      Remove section
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  className="flow-button small"
                  onClick={() => change([...(data[f.id] || []), {}])}
                >
                  <Plus size={14} /> Add section
                </button>
              </fieldset>
            );
          return (
            <Field key={f.id} label={`${f.label}${f.required ? " *" : ""}`}>
              {f.type === "file" ? (
                <div>
                  <input
                    aria-label={f.label}
                    type="file"
                    disabled={disabled}
                    accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
                    onChange={async (e) => {
                      try {
                        const attachment = await upload(
                          instanceId,
                          e.target.files[0],
                        );
                        change([...(data[f.id] || []), attachment.id]);
                      } catch (err) {
                        setError(err.message);
                      }
                    }}
                  />
                  <small>{`${(data[f.id] || []).length} file(s) attached · max 20 MB each`}</small>
                </div>
              ) : f.type === "select" ? (
                <select
                  disabled={disabled}
                  value={data[f.id] || ""}
                  required={f.required}
                  onChange={(e) => change(e.target.value)}
                >
                  <option value="">Choose…</option>
                  {(f.options || []).map((o) => (
                    <option key={o}>{o}</option>
                  ))}
                </select>
              ) : f.type === "relationship" ? (
                <select
                  disabled={disabled}
                  value={data[f.id] || ""}
                  required={f.required}
                  onFocus={() => {
                    if (!references[f.id])
                      flow(
                        `/records?type=${encodeURIComponent(f.referenceType || "")}${instanceId ? `&instanceId=${instanceId}` : definitionId ? `&definitionId=${definitionId}` : ""}`,
                      )
                        .then((rows) =>
                          setReferences((p) => ({ ...p, [f.id]: rows })),
                        )
                        .catch((e) => setError(e.message));
                  }}
                  onChange={(e) => change(e.target.value)}
                >
                  <option value="">Select a record…</option>
                  {(references[f.id] || []).map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.data.name || r.data.summary || r.id}
                    </option>
                  ))}
                </select>
              ) : f.type === "boolean" ? (
                <input
                  disabled={disabled}
                  type="checkbox"
                  checked={!!data[f.id]}
                  onChange={(e) => change(e.target.checked)}
                />
              ) : (
                <input
                  disabled={disabled}
                  type={
                    f.type === "number"
                      ? "number"
                      : f.type === "date"
                        ? "date"
                        : "text"
                  }
                  value={data[f.id] ?? ""}
                  required={f.required}
                  min={f.min}
                  max={f.max}
                  onChange={(e) =>
                    change(
                      f.type === "number"
                        ? e.target.value === ""
                          ? ""
                          : Number(e.target.value)
                        : e.target.value,
                    )
                  }
                />
              )}
            </Field>
          );
        })}
    </div>
  );
}
export function RuleEditor({ value, onChange, fields = [] }) {
  const rule = value || { op: "eq", field: fields[0]?.id || "", value: "" };
  return (
    <div className="flow-rule">
      <div className="flow-rule-row">
        <select
          aria-label="Rule operator"
          value={rule.op}
          onChange={(e) =>
            onChange(
              ["and", "or", "not"].includes(e.target.value)
                ? {
                    op: e.target.value,
                    rules: [
                      { op: "eq", field: fields[0]?.id || "", value: "" },
                    ],
                  }
                : {
                    op: e.target.value,
                    field: rule.field || fields[0]?.id || "",
                    value: rule.value ?? "",
                  },
            )
          }
        >
          {[
            "eq",
            "ne",
            "gt",
            "gte",
            "lt",
            "lte",
            "contains",
            "in",
            "exists",
            "and",
            "or",
            "not",
          ].map((op) => (
            <option key={op} value={op}>
              {
                {
                  eq: "Equals",
                  ne: "Does not equal",
                  gt: "Greater than",
                  gte: "At least",
                  lt: "Less than",
                  lte: "At most",
                  contains: "Contains",
                  in: "In list",
                  exists: "Has a value",
                  and: "All conditions (AND)",
                  or: "Any condition (OR)",
                  not: "Not",
                }[op]
              }
            </option>
          ))}
        </select>
      </div>
      {["and", "or", "not"].includes(rule.op) ? (
        <div>
          {(rule.rules || []).map((r, i) => (
            <div className="flow-rule-child" key={i}>
              <RuleEditor
                value={r}
                fields={fields}
                onChange={(v) =>
                  onChange({
                    ...rule,
                    rules: rule.rules.map((r, j) => (i === j ? v : r)),
                  })
                }
              />
              <button
                className="flow-icon-button"
                title="Remove condition"
                onClick={() =>
                  onChange({
                    ...rule,
                    rules: rule.rules.filter((_, j) => j !== i),
                  })
                }
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}
          {rule.op !== "not" && (
            <button
              className="flow-button small"
              onClick={() =>
                onChange({
                  ...rule,
                  rules: [
                    ...(rule.rules || []),
                    { op: "eq", field: fields[0]?.id || "", value: "" },
                  ],
                })
              }
            >
              <Plus size={13} /> Condition
            </button>
          )}
        </div>
      ) : (
        <>
          <input
            aria-label="Rule field"
            list="flow-field-list"
            placeholder="Field key"
            value={rule.field || ""}
            onChange={(e) => onChange({ ...rule, field: e.target.value })}
          />
          <datalist id="flow-field-list">
            {fields.map((f) => (
              <option key={f.id} value={f.id}>
                {f.label}
              </option>
            ))}
          </datalist>
          {rule.op !== "exists" && (
            <input
              aria-label="Rule comparison value"
              placeholder={
                rule.op === "in" ? "Comma-separated values" : "Comparison value"
              }
              value={
                Array.isArray(rule.value)
                  ? rule.value.join(", ")
                  : String(rule.value ?? "")
              }
              onChange={(e) => {
                const field = fields.find((f) => f.id === rule.field),
                  raw = e.target.value;
                onChange({
                  ...rule,
                  value:
                    rule.op === "in"
                      ? raw.split(",").map((s) => s.trim())
                      : field?.type === "number"
                        ? Number(raw)
                        : field?.type === "boolean"
                          ? raw === "true"
                          : raw,
                });
              }}
            />
          )}
        </>
      )}
    </div>
  );
}
export function AssignmentEditor({
  value,
  onChange,
  lookups = { users: [], departments: [], teams: [] },
}) {
  const v = value || { kind: "role", values: ["org_admin"] },
    [kind, setKind] = useState(v.kind);
  const source =
    v.kind === "role" ? [
      {id:"employee",name:"Employee"}, {id:"org_admin",name:"Organization administrator"}, {id:"platform_admin",name:"Platform administrator"}, ...(lookups.roles || []),
    ] : v.kind === "user" || v.kind === "manager"
      ? lookups.users
      : v.kind === "department"
        ? lookups.departments
        : v.kind === "team"
          ? lookups.teams
          : null;
  return (
    <>
      <Field label="Assign using">
        <select
          value={v.kind}
          onChange={(e) => onChange({ kind: e.target.value, values: [] })}
        >
          {[
            ["user", "Specific users"],
            ["role", "Application or custom role"],
            ["department", "Department"],
            ["team", "Team"],
            ["manager", "Reporting manager"],
            ["field", "Value from a field"],
            ["workflowRole", "Workflow role"],
          ].map(([k, l]) => (
            <option value={k} key={k}>
              {l}
            </option>
          ))}
        </select>
      </Field>
      {v.kind !== "manager" &&
        (source ? (
          <Field label="Eligible people / groups">
            <select
              multiple
              value={v.values || []}
              onChange={(e) =>
                onChange({
                  ...v,
                  values: Array.from(e.target.selectedOptions).map(
                    (o) => o.value,
                  ),
                })
              }
            >
              {source.map((r) => (
                <option value={r.id} key={r.id}>
                  {r.email || r.name}
                </option>
              ))}
            </select>
          </Field>
        ) : (
          <Field
            label={v.kind === "field" ? "Field keys" : "Role identifiers"}
            hint={
              v.kind === "role"
                ? "employee, org_admin, platform_admin"
                : "Separate multiple values with commas."
            }
          >
            <input
              value={(v.values || []).join(", ")}
              onChange={(e) =>
                onChange({
                  ...v,
                  values: e.target.value
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean),
                })
              }
            />
          </Field>
        ))}
      <Field label="Fallback assignees">
        <select
          multiple
          value={v.fallback || []}
          onChange={(e) =>
            onChange({
              ...v,
              fallback: Array.from(e.target.selectedOptions).map(
                (o) => o.value,
              ),
            })
          }
        >
          {lookups.users.map((r) => (
            <option value={r.id} key={r.id}>
              {r.email}
            </option>
          ))}
        </select>
      </Field>
    </>
  );
}
export function FormDesigner({ fields, onChange }) {
  const update = (i, patch) =>
    onChange(fields.map((f, j) => (j === i ? { ...f, ...patch } : f)));
  return (
    <>
      {fields.map((f, i) => (
        <details className="flow-config-card" key={i} open>
          <summary>
            {f.label || "New field"} <span>{f.type}</span>
          </summary>
          <div className="flow-two-cols">
            <Field label="Label">
              <input
                value={f.label}
                onChange={(e) => update(i, { label: e.target.value })}
              />
            </Field>
            <Field label="Key">
              <input
                value={f.id}
                onChange={(e) => update(i, { id: e.target.value })}
              />
            </Field>
          </div>
          <Field label="Field type">
            <select
              value={f.type}
              onChange={(e) => update(i, { type: e.target.value })}
            >
              {[
                "text",
                "number",
                "date",
                "boolean",
                "select",
                "file",
                "relationship",
                "section",
              ].map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </Field>
          <label className="flow-check">
            <input
              type="checkbox"
              checked={!!f.required}
              onChange={(e) => update(i, { required: e.target.checked })}
            />{" "}
            Required
          </label>
          {f.type === "select" && (
            <Field label="Options (comma separated)">
              <input
                value={(f.options || []).join(", ")}
                onChange={(e) =>
                  update(i, {
                    options: e.target.value.split(",").map((v) => v.trim()),
                  })
                }
              />
            </Field>
          )}
          {f.type === "relationship" && (
            <Field label="Reference record type">
              <input
                value={f.referenceType || ""}
                onChange={(e) => update(i, { referenceType: e.target.value })}
              />
            </Field>
          )}
          {f.type === "section" && (
            <FormDesigner
              fields={f.fields || []}
              onChange={(v) => update(i, { fields: v })}
            />
          )}
          <div className="flow-two-cols">
            {["min", "max"].map((k) => (
              <Field label={k === "min" ? "Minimum" : "Maximum"} key={k}>
                <input
                  type="number"
                  value={f[k] ?? ""}
                  onChange={(e) =>
                    update(i, {
                      [k]:
                        e.target.value === ""
                          ? undefined
                          : Number(e.target.value),
                    })
                  }
                />
              </Field>
            ))}
          </div>
          <details>
            <summary>Visibility and permissions</summary>
            <label className="flow-check">
              <input
                type="checkbox"
                checked={!!f.visibleWhen}
                onChange={(e) =>
                  update(i, {
                    visibleWhen: e.target.checked
                      ? { op: "exists", field: "" }
                      : undefined,
                  })
                }
              />{" "}
              Conditional visibility
            </label>
            {f.visibleWhen && (
              <RuleEditor
                value={f.visibleWhen}
                fields={fields}
                onChange={(v) => update(i, { visibleWhen: v })}
              />
            )}
            <Field label="Read roles (blank = all)">
              <input
                value={(f.readRoles || []).join(", ")}
                onChange={(e) =>
                  update(i, {
                    readRoles: e.target.value
                      .split(",")
                      .map((v) => v.trim())
                      .filter(Boolean),
                  })
                }
              />
            </Field>
            <Field label="Write roles (blank = all)">
              <input
                value={(f.writeRoles || []).join(", ")}
                onChange={(e) =>
                  update(i, {
                    writeRoles: e.target.value
                      .split(",")
                      .map((v) => v.trim())
                      .filter(Boolean),
                  })
                }
              />
            </Field>
          </details>
          <button
            className="flow-button danger small"
            onClick={() => onChange(fields.filter((_, j) => j !== i))}
          >
            <Trash2 size={13} /> Remove field
          </button>
        </details>
      ))}
      <button
        className="flow-button"
        onClick={() =>
          onChange([
            ...fields,
            {
              id: `field_${fields.length + 1}`,
              label: "New field",
              type: "text",
            },
          ])
        }
      >
        <Plus size={14} /> Add field
      </button>
    </>
  );
}
