export type Rule = {
  op:
    | "and"
    | "or"
    | "not"
    | "eq"
    | "ne"
    | "gt"
    | "gte"
    | "lt"
    | "lte"
    | "contains"
    | "in"
    | "exists";
  rules?: Rule[];
  field?: string;
  value?: unknown;
};
export type Expression = {
  op: "add" | "subtract" | "multiply" | "divide" | "concat" | "coalesce";
  values: (number | string | { field: string })[];
};
export type Assignment = {
  kind:
    | "user"
    | "role"
    | "department"
    | "team"
    | "manager"
    | "field"
    | "workflowRole";
  values: string[];
  fallback?: string[];
};
export type Field = {
  id: string;
  label: string;
  type:
    | "text"
    | "number"
    | "date"
    | "boolean"
    | "select"
    | "file"
    | "relationship"
    | "section";
  required?: boolean;
  options?: string[];
  visibleWhen?: Rule;
  fields?: Field[];
  min?: number;
  max?: number;
  readRoles?: string[];
  writeRoles?: string[];
  referenceType?: string;
};
export type FlowNode = {
  id: string;
  type:
    | "trigger"
    | "state"
    | "task"
    | "decision"
    | "form"
    | "automation"
    | "wait"
    | "fork"
    | "join"
    | "end";
  position: { x: number; y: number };
  label: string;
  config: Record<string, any>;
};
export type FlowEdge = {
  id: string;
  source: string;
  target: string;
  port?: string;
  label?: string;
  rule?: Rule;
};
export type FlowDocument = {
  schemaVersion: 1;
  nodes: FlowNode[];
  edges: FlowEdge[];
  states: {
    id: string;
    name: string;
    initial?: boolean;
    terminal?: boolean;
    outcome?: "Approved" | "Rejected";
  }[];
  transitions: {
    id: string;
    from: string;
    to: string;
    action: string;
    roles?: string[];
    guard?: Rule;
  }[];
  fields: Field[];
  policies: {
    authors?: string[];
    publishers?: string[];
    operators?: string[];
    starters?: string[];
    viewers?: string[];
    allowSelfApproval?: boolean;
    timezone?: string;
    workflowRoles?: Record<string, string[]>;
    maxSteps?: number;
  };
  monitoring: { slaHours?: number; reportFields?: string[] };
};
export type ValidationIssue = { path: string; message: string };
export type TaskAction = {
  action: string;
  revision: number;
  key: string;
  comment?: string;
  data?: Record<string, unknown>;
  attachments?: string[];
  targetUserId?: string;
};
export type ExecutionEvent = {
  type: string;
  nodeId?: string;
  actorId?: string;
  detail: Record<string, unknown>;
};
