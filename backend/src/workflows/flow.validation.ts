import { workflowDate } from "./flow.time";
import { FlowDocument, ValidationIssue } from "./flow.types";
export function validateDocument(doc: FlowDocument): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const add = (path: string, message: string) => issues.push({ path, message });
  if (
    !doc ||
    doc.schemaVersion !== 1 ||
    !Array.isArray(doc.nodes) ||
    !Array.isArray(doc.edges) ||
    !Array.isArray(doc.states) ||
    !Array.isArray(doc.transitions) ||
    !Array.isArray(doc.fields) ||
    !doc.policies
  )
    return [{ path: "document", message: "Invalid workflow document" }];
  if (
    doc.nodes.length > 500 ||
    doc.edges.length > 2000 ||
    doc.states.length > 100
  )
    return [
      { path: "nodes", message: "Maximum 500 nodes and 2000 connections" },
    ];
  if (
    doc.nodes.some(
      (n) => !n || typeof n.id !== "string" || !n.config || !n.position,
    ) ||
    doc.states.some((s) => !s || typeof s.id !== "string")
  )
    return [{ path: "document", message: "Malformed block or state" }];
  const ids = new Set(doc.nodes.map((n) => n.id));
  if (ids.size !== doc.nodes.length) add("nodes", "Node IDs must be unique");
  const validateRule = (r: any, path: string, depth = 0): void => {
    if (
      !r ||
      depth > 20 ||
      ![
        "and",
        "or",
        "not",
        "eq",
        "ne",
        "gt",
        "gte",
        "lt",
        "lte",
        "contains",
        "in",
        "exists",
      ].includes(r.op)
    ) {
      add(path, "Invalid or excessively nested rule");
      return;
    }
    if (["and", "or", "not"].includes(r.op)) {
      if (
        !Array.isArray(r.rules) ||
        !r.rules.length ||
        (r.op === "not" && r.rules.length !== 1)
      ) {
        add(path, "Rule group requires conditions");
        return;
      }
      r.rules.forEach((v: any, i: number) =>
        validateRule(v, `${path}.${i}`, depth + 1),
      );
    } else if (
      typeof r.field !== "string" ||
      !r.field ||
      r.field
        .split(".")
        .some((k: string) =>
          ["__proto__", "constructor", "prototype"].includes(k),
        )
    )
      add(path, "Rule needs a safe field key");
  };
  const checkFields = (fields: any[], path: string, depth = 0): void => {
    if (!Array.isArray(fields) || depth > 8) {
      add(path, "Invalid form fields");
      return;
    }
    const keys = new Set();
    for (const f of fields) {
      if (
        !f ||
        !/^[_a-zA-Z][_a-zA-Z0-9]*$/.test(f.id) ||
        f.id.startsWith("__") ||
        ["constructor", "prototype"].includes(f.id) ||
        keys.has(f.id)
      ) {
        add(path, "Field keys must be safe and unique");
        continue;
      }
      keys.add(f.id);
      if (
        ![
          "text",
          "number",
          "date",
          "boolean",
          "select",
          "file",
          "relationship",
          "section",
        ].includes(f.type) ||
        !f.label
      )
        add(path, "Invalid field type or label");
      if (
        f.type === "select" &&
        (!Array.isArray(f.options) || !f.options.length)
      )
        add(path, "Select field needs options");
      if (f.visibleWhen) validateRule(f.visibleWhen, path);
      if (f.type === "relationship" && !f.referenceType)
        add(path, "Relationship field requires a reference type");
      if (f.type === "section")
        checkFields(f.fields, `${path}.${f.id}`, depth + 1);
    }
  };
  checkFields(doc.fields, "fields");
  doc.edges.forEach((e) => {
    if (e.rule) validateRule(e.rule, `edges.${e.id}.rule`);
  });
  doc.transitions.forEach((t) => {
    if (t.guard) validateRule(t.guard, `transitions.${t.id}.guard`);
  });
  const triggers = doc.nodes.filter((n) => n.type === "trigger");
  if (triggers.length !== 1) add("nodes", "Exactly one trigger is required");
  if (doc.states.filter((s) => s.initial).length !== 1)
    add("states", "Exactly one initial state is required");
  if (!doc.states.some((s) => s.terminal))
    add("states", "At least one terminal state is required");
  if (new Set(doc.states.map((s) => s.id)).size !== doc.states.length)
    add("states", "State IDs must be unique");
  try {
    new Intl.DateTimeFormat("en", {
      timeZone: doc.policies.timezone || "Asia/Kolkata",
    });
  } catch {
    return [{ path: "policies.timezone", message: "Invalid IANA timezone" }];
  }
  for (const t of doc.transitions)
    if (
      !doc.states.some((s) => s.id === t.from) ||
      !doc.states.some((s) => s.id === t.to) ||
      !t.action
    )
      add(
        `transitions.${t.id}`,
        "Transition requires existing states and an action",
      );
  for (const e of doc.edges)
    if (!ids.has(e.source) || !ids.has(e.target))
      add(`edges.${e.id}`, "Connection references a missing node");
  const outgoing = (id: string) => doc.edges.filter((e) => e.source === id);
  const types = [
    "trigger",
    "state",
    "task",
    "decision",
    "form",
    "automation",
    "wait",
    "fork",
    "join",
    "end",
  ];
  for (const n of doc.nodes) {
    const edges = outgoing(n.id),
      c = n.config || {};
    if (!types.includes(n.type)) add(`nodes.${n.id}`, "Unknown block type");
    if (!n.label?.trim()) add(`nodes.${n.id}`, "Block needs a name");
    if (n.type !== "end" && !edges.length)
      add(`nodes.${n.id}`, "Block needs an outgoing connection");
    if (n.type === "end" && !c.action)
      add(`nodes.${n.id}`, "Choose a lifecycle transition action");
    if (
      n.type === "end" &&
      (!doc.states.find((s) => s.id === c.state)?.terminal || edges.length)
    )
      add(
        `nodes.${n.id}`,
        "End block requires a terminal state and no outgoing connections",
      );
    if (n.type === "state" && !doc.states.some((s) => s.id === c.state))
      add(`nodes.${n.id}`, "Select an existing state");
    if (
      n.type === "decision" &&
      edges.filter((e) => e.port === "default").length !== 1
    )
      add(`nodes.${n.id}`, "Decision requires exactly one default route");
    if (
      n.type === "decision" &&
      edges.some((e) => e.port !== "default" && !e.rule)
    )
      add(`nodes.${n.id}`, "Decision branches require a rule");
    if (["task", "form"].includes(n.type)) {
      if (
        c.assignment &&
        ![
          "user",
          "role",
          "department",
          "team",
          "manager",
          "field",
          "workflowRole",
        ].includes(c.assignment.kind)
      )
        add(`nodes.${n.id}`, "Invalid assignment type");
      if (!c.assignment?.kind) add(`nodes.${n.id}`, "Configure assignment");
      for (const action of c.actions || ["complete"])
        if (!edges.some((e) => e.port === action))
          add(`nodes.${n.id}`, `Missing ${action} route`);
      if (!["any", "all", "quorum"].includes(c.approvalPolicy || "any"))
        add(`nodes.${n.id}`, "Invalid approval policy");
      if (
        c.approvalPolicy === "quorum" &&
        (!Number.isInteger(c.quorum) || c.quorum < 1)
      )
        add(`nodes.${n.id}`, "Quorum must be a positive integer");
    }
    if (
      n.type === "fork" &&
      (edges.length < 2 ||
        !doc.nodes.some((j) => j.id === c.joinId && j.type === "join"))
    )
      add(`nodes.${n.id}`, "Fork needs multiple branches and a matching join");
    if (n.type === "join" && !["all", "first"].includes(c.mode))
      add(`nodes.${n.id}`, "Choose all-branches or first-completed join");
    if (
      n.type === "trigger" &&
      ![
        "manual",
        "form",
        "record.created",
        "record.updated",
        "schedule",
        "date",
        "webhook",
      ].includes(c.event)
    )
      add(`nodes.${n.id}`, "Choose a supported trigger");
    if (
      n.type === "trigger" &&
      ["record.created", "record.updated", "date"].includes(c.event) &&
      !c.recordType
    )
      add(`nodes.${n.id}`, "Record trigger requires a record type");
    if (n.type === "trigger" && c.event === "date" && !c.dateField)
      add(`nodes.${n.id}`, "Date trigger requires a date field");
    if (
      n.type === "trigger" &&
      c.event === "schedule" &&
      (!c.at || !workflowDate(c.at, doc.policies.timezone || "Asia/Kolkata"))
    )
      add(
        `nodes.${n.id}`,
        "Schedule requires a valid date and timezone offset",
      );
    if (
      n.type === "trigger" &&
      c.intervalSeconds != null &&
      (!Number.isFinite(c.intervalSeconds) || c.intervalSeconds < 60)
    )
      add(`nodes.${n.id}`, "Schedule interval must be at least 60 seconds");
    if (
      n.type === "automation" &&
      c.action === "calculate" &&
      (!c.field ||
        c.field.startsWith("__") ||
        !c.expression ||
        ![
          "add",
          "subtract",
          "multiply",
          "divide",
          "concat",
          "coalesce",
        ].includes(c.expression.op) ||
        !Array.isArray(c.expression.values))
    )
      add(
        `nodes.${n.id}`,
        "Calculation requires an output key and a supported expression",
      );
    if (
      n.type === "automation" &&
      ["http", "webhook"].includes(c.action) &&
      !c.connectionId
    )
      add(`nodes.${n.id}`, "Select an integration connection");
    if (n.type === "wait" && (!Number.isFinite(c.seconds) || c.seconds < 1))
      add(`nodes.${n.id}`, "Delay must be at least one second");
    if (
      n.type === "automation" &&
      ![
        "notification",
        "email",
        "updateRecord",
        "http",
        "webhook",
        "calculate",
      ].includes(c.action)
    )
      add(`nodes.${n.id}`, "Choose an automation action");
    if (
      c.slaHours !== undefined &&
      (!Number.isFinite(c.slaHours) || c.slaHours <= 0)
    )
      add(`nodes.${n.id}`, "SLA must be positive");
  }
  for (const fork of doc.nodes.filter((n) => n.type === "fork")) {
    const joinId = fork.config.joinId;
    const branchWalk = (id: string, seen: Set<string>): boolean => {
      if (id === joinId) return true;
      if (seen.has(id)) return true;
      const n = doc.nodes.find((n) => n.id === id);
      if (!n || n.type === "end") return false;
      seen.add(id);
      const paths = outgoing(id).filter(
        (e) => !["reject", "return", "timeout", "error"].includes(e.port || ""),
      );
      return (
        paths.length > 0 &&
        paths.every((e) => branchWalk(e.target, new Set(seen)))
      );
    };
    if (outgoing(fork.id).some((e) => !branchWalk(e.target, new Set())))
      add(
        `nodes.${fork.id}`,
        "Every normal parallel branch must reach its matching join",
      );
  }
  // Check the business lifecycle independently of technical execution status.
  const initialState = doc.states.find((s) => s.initial)?.id;
  if (initialState && triggers[0]) {
    const pending: [string, string][] = [[triggers[0].id, initialState]],
      seen = new Set<string>();
    while (pending.length) {
      const [nodeId, currentState] = pending.shift()!;
      const key = `${nodeId}:${currentState}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const node = doc.nodes.find((n) => n.id === nodeId);
      if (!node) continue;
      let nextState = currentState;
      if (
        ["state", "end"].includes(node.type) &&
        node.config.state !== currentState
      ) {
        nextState = node.config.state;
        const action =
          node.config.action || (node.type === "state" ? "enter" : "complete");
        if (
          !doc.transitions.some(
            (t) =>
              t.from === currentState &&
              t.to === nextState &&
              t.action === action,
          )
        )
          add(
            `nodes.${node.id}`,
            `Missing lifecycle transition from ${currentState} using ${action}`,
          );
      }
      for (const e of outgoing(nodeId)) pending.push([e.target, nextState]);
    }
  }
  const reachable = new Set<string>();
  const walk = (id: string) => {
    if (reachable.has(id)) return;
    reachable.add(id);
    outgoing(id).forEach((e) => walk(e.target));
  };
  if (triggers[0]) walk(triggers[0].id);
  doc.nodes.forEach((n) => {
    if (!reachable.has(n.id)) add(`nodes.${n.id}`, "Block is unreachable");
  });
  const canEnd = new Set(
    doc.nodes.filter((n) => n.type === "end").map((n) => n.id),
  );
  for (let i = 0; i < doc.nodes.length; i++)
    doc.edges.forEach((e) => {
      if (canEnd.has(e.target)) canEnd.add(e.source);
    });
  doc.nodes.forEach((n) => {
    if (!canEnd.has(n.id)) add(`nodes.${n.id}`, "No terminal path from block");
  });
  const visiting = new Set<string>(),
    visited = new Set<string>();
  const cycle = (id: string) => {
    const n = doc.nodes.find((n) => n.id === id);
    if (!n || ["task", "form", "wait"].includes(n.type) || visited.has(id))
      return;
    if (visiting.has(id)) {
      add(`nodes.${id}`, "Automatic cycle requires a human or timed wait");
      return;
    }
    visiting.add(id);
    outgoing(id).forEach((e) => cycle(e.target));
    visiting.delete(id);
    visited.add(id);
  };
  doc.nodes.forEach((n) => cycle(n.id));
  return issues;
}
