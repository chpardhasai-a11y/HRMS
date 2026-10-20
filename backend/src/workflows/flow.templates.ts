import { FlowDocument, FlowNode } from "./flow.types";
const node = (
  id: string,
  type: FlowNode["type"],
  label: string,
  x: number,
  y: number,
  config: any = {},
): FlowNode => ({ id, type, label, position: { x, y }, config });
const edge = (source: string, target: string, port = "next", rule?: any) => ({
  id: `${source}-${target}-${port}`,
  source,
  target,
  port,
  label: port,
  ...(rule ? { rule } : {}),
});
export function blankDocument(): FlowDocument {
  return {
    schemaVersion: 1,
    nodes: [
      node("start", "trigger", "Manual start", 100, 140, { event: "manual" }),
      node("review", "task", "Review request", 400, 140, {
        assignment: { kind: "role", values: ["org_admin"] },
        actions: ["approve", "reject", "return"],
        approvalPolicy: "any",
        slaHours: 24,
      }),
      node("approved", "end", "Approved", 740, 40, {
        state: "approved",
        action: "approve",
      }),
      node("rejected", "end", "Rejected", 740, 240, {
        state: "rejected",
        action: "reject",
      }),
      node("changes", "form", "Request changes", 400, 400, {
        assignment: { kind: "field", values: ["requesterId"] },
        actions: ["complete"],
      }),
    ],
    edges: [
      edge("start", "review"),
      edge("review", "approved", "approve"),
      edge("review", "rejected", "reject"),
      edge("review", "changes", "return"),
      edge("changes", "review", "complete"),
    ],
    states: [
      { id: "draft", name: "Draft", initial: true },
      { id: "review", name: "In Review" },
      { id: "approved", name: "Approved", terminal: true, outcome: "Approved" },
      { id: "rejected", name: "Rejected", terminal: true, outcome: "Rejected" },
      { id: "hold", name: "On Hold" },
      { id: "dropped", name: "Dropped", terminal: true },
      { id: "lost", name: "Lost", terminal: true },
    ],
    transitions: [
      { id: "approve", from: "draft", to: "approved", action: "approve" },
      { id: "reject", from: "draft", to: "rejected", action: "reject" },
      { id: "lose", from: "draft", to: "lost", action: "reject" },
    ],
    fields: [{ id: "summary", label: "Summary", type: "text", required: true }],
    policies: {
      allowSelfApproval: false,
      timezone: "Asia/Kolkata",
      maxSteps: 1000,
    },
    monitoring: { slaHours: 48 },
  };
}
export function templates() {
  const hr = blankDocument();
  hr.nodes[0].config.event = "record.created";
  hr.nodes[0].config.recordType = "profile_change";
  const purchase = blankDocument();
  purchase.fields.push({
    id: "amount",
    label: "Amount",
    type: "number",
    required: true,
    min: 0,
  });
  purchase.nodes = [
    node("start", "trigger", "Purchase submitted", 80, 180, { event: "form" }),
    node("route", "decision", "Check purchase value", 330, 180),
    node("fork", "fork", "Parallel reviews", 580, 80, { joinId: "join" }),
    node("finance", "task", "Finance review", 850, 0, {
      assignment: { kind: "workflowRole", values: ["finance"] },
      actions: ["approve", "reject", "return"],
      approvalPolicy: "all",
    }),
    node("procurement", "task", "Procurement review", 850, 220, {
      assignment: { kind: "role", values: ["org_admin"] },
      actions: ["approve", "reject", "return"],
      approvalPolicy: "any",
    }),
    node("join", "join", "Reviews complete", 1140, 80, { mode: "all" }),
    node("approved", "end", "Purchase approved", 1400, 80, {
      state: "approved",
      action: "approve",
    }),
    node("rejected", "end", "Purchase rejected", 1140, 450, {
      state: "rejected",
      action: "reject",
    }),
    node("changes", "form", "Revise purchase", 580, 530, {
      assignment: { kind: "field", values: ["requesterId"] },
      actions: ["complete"],
    }),
  ];
  purchase.edges = [
    edge("start", "route"),
    edge("route", "fork", "high", { op: "gt", field: "amount", value: 10000 }),
    edge("route", "approved", "default"),
    edge("fork", "finance", "finance"),
    edge("fork", "procurement", "procurement"),
    edge("finance", "join", "approve"),
    edge("procurement", "join", "approve"),
    edge("finance", "rejected", "reject"),
    edge("procurement", "rejected", "reject"),
    edge("finance", "changes", "return"),
    edge("procurement", "changes", "return"),
    edge("changes", "route", "complete"),
    edge("join", "approved"),
  ];
  const service = blankDocument();
  service.nodes[1].label = "Resolve service request";
  service.nodes[1].config.slaHours = 4;
  service.nodes[1].config.escalationUsers = [];
  service.fields.push({
    id: "priority",
    label: "Priority",
    type: "select",
    options: ["Low", "Normal", "Urgent"],
    required: true,
  });
  const sales = blankDocument();
  sales.nodes[1].label = "Qualify opportunity";
  sales.nodes[2].label = "Won";
  sales.states.find((s) => s.id === "approved")!.name = "Won";
  sales.nodes[3].config.state = "lost";
  sales.nodes[3].label = "Lost";
  sales.fields.push({
    id: "value",
    label: "Opportunity value",
    type: "number",
    min: 0,
  });
  return [
    {
      id: "hr-approval",
      name: "HR profile approval",
      category: "People operations",
      description:
        "Review profile changes with explicit approve, reject, and return paths.",
      document: hr,
    },
    {
      id: "purchase",
      name: "Purchase approval",
      category: "Finance",
      description:
        "Value-based routing with parallel finance and procurement reviews.",
      document: purchase,
    },
    {
      id: "service",
      name: "Service request",
      category: "Operations",
      description:
        "Route service work with a four-hour SLA and overdue handling.",
      document: service,
    },
    {
      id: "sales",
      name: "Sales opportunity",
      category: "Sales",
      description:
        "Qualify opportunities, request updates, and track won or lost outcomes.",
      document: sales,
    },
  ];
}
