import { calculate, evaluate, validateFields, valueAt } from "./flow.rules";
import { validateDocument } from "./flow.validation";
import { workflowDate } from "./flow.time";
import { blankDocument, templates } from "./flow.templates";
describe("Generic workflow rules and publication", () => {
  it("evaluates typed nested conditions without coercion", () => {
    const rule: any = {
      op: "and",
      rules: [
        { op: "gt", field: "amount", value: 10 },
        {
          op: "or",
          rules: [
            { op: "eq", field: "type", value: "purchase" },
            { op: "exists", field: "override" },
          ],
        },
      ],
    };
    expect(evaluate(rule, { amount: 11, type: "purchase" })).toBe(true);
    expect(evaluate(rule, { amount: "11", type: "purchase" })).toBe(false);
  });
  it("blocks prototype access and invalid calculations", () => {
    expect(valueAt({}, "constructor.prototype")).toBeUndefined();
    expect(
      calculate(
        { op: "multiply", values: [{ field: "amount" }, 1.18] },
        { amount: 100 },
      ),
    ).toBe(118);
    expect(() => calculate({ op: "divide", values: [4, 0] }, {})).toThrow();
  });
  it("enforces required fields even when hidden, field permissions, and nested rows", () => {
    expect(() =>
      validateFields(
        [
          {
            id: "a",
            label: "Secret",
            type: "text",
            required: true,
            visibleWhen: { op: "eq", field: "show", value: true },
          },
        ],
        {},
        "employee",
      ),
    ).toThrow("required");
    expect(() =>
      validateFields(
        [
          {
            id: "a",
            label: "Protected",
            type: "text",
            writeRoles: ["org_admin"],
          },
        ],
        { a: "new" },
        "employee",
        { a: "old" },
      ),
    ).toThrow("read-only");
    expect(() =>
      validateFields(
        [
          {
            id: "rows",
            label: "Rows",
            type: "section",
            fields: [
              { id: "amount", label: "Amount", type: "number", required: true },
            ],
          },
        ],
        { rows: [{ amount: "bad" }] },
        "employee",
      ),
    ).toThrow("invalid type");
  });
  it("interprets local dates in the configured timezone and rejects nonexistent times", () => {
    expect(workflowDate("2030-01-01", "Asia/Kolkata")?.toISOString()).toBe(
      "2029-12-31T18:30:00.000Z",
    );
    expect(workflowDate("2026-03-08T02:30", "America/New_York")).toBeNull();
  });
  it("validates all supplied templates", () => {
    for (const t of templates())
      expect(validateDocument(t.document)).toEqual([]);
  });
  it("rejects missing decision defaults, unreachable nodes and automatic loops", () => {
    const d = blankDocument();
    d.nodes.push({
      id: "decision",
      label: "Route",
      type: "decision",
      position: { x: 0, y: 0 },
      config: {},
    });
    d.edges.push({
      id: "loop",
      source: "decision",
      target: "decision",
      port: "condition",
      rule: { op: "exists", field: "summary" },
    });
    expect(
      validateDocument(d)
        .map((i) => i.message)
        .join(" "),
    ).toMatch(/default/);
    expect(
      validateDocument(d)
        .map((i) => i.message)
        .join(" "),
    ).toMatch(/unreachable/);
    expect(
      validateDocument(d)
        .map((i) => i.message)
        .join(" "),
    ).toMatch(/cycle/);
  });
});
