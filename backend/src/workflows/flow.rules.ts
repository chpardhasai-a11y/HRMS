import { BadRequestException } from "@nestjs/common";
import { Expression, Field, Rule } from "./flow.types";
export function valueAt(data: any, path = ""): any {
  if (
    path
      .split(".")
      .some((k) => ["__proto__", "constructor", "prototype"].includes(k))
  )
    return undefined;
  return path
    .split(".")
    .reduce(
      (v, key) =>
        v != null && Object.prototype.hasOwnProperty.call(v, key)
          ? v[key]
          : undefined,
      data,
    );
}
export function evaluate(
  rule: Rule | undefined,
  data: any,
  depth = 0,
): boolean {
  if (!rule) return true;
  if (depth > 20)
    throw new BadRequestException("Rule nesting exceeds 20 levels");
  const children = rule.rules || [];
  if (rule.op === "and")
    return children.every((r) => evaluate(r, data, depth + 1));
  if (rule.op === "or")
    return children.some((r) => evaluate(r, data, depth + 1));
  if (rule.op === "not") return !evaluate(children[0], data, depth + 1);
  const left = valueAt(data, rule.field),
    right = rule.value;
  switch (rule.op) {
    case "eq":
      return left === right;
    case "ne":
      return left !== right;
    case "exists":
      return left !== undefined && left !== null && left !== "";
    case "contains":
      return (
        (typeof left === "string" &&
          typeof right === "string" &&
          left.includes(right)) ||
        (Array.isArray(left) && left.includes(right))
      );
    case "in":
      return Array.isArray(right) && right.includes(left);
    case "gt":
    case "gte":
    case "lt":
    case "lte":
      if (typeof left !== "number" || typeof right !== "number") return false;
      return rule.op === "gt"
        ? left > right
        : rule.op === "gte"
          ? left >= right
          : rule.op === "lt"
            ? left < right
            : left <= right;
    default:
      throw new BadRequestException("Unsupported rule operator");
  }
}
export function calculate(expr: Expression, data: any): any {
  const values = expr.values.map((v) =>
    typeof v === "object" ? valueAt(data, v.field) : v,
  );
  if (expr.op === "concat") return values.join("");
  if (expr.op === "coalesce") return values.find((v) => v != null && v !== "");
  if (
    !values.length ||
    values.some((v) => typeof v !== "number" || !Number.isFinite(v))
  )
    throw new BadRequestException("Calculation requires finite numbers");
  const result = values
    .slice(1)
    .reduce(
      (a, b) =>
        expr.op === "add"
          ? a + b
          : expr.op === "subtract"
            ? a - b
            : expr.op === "multiply"
              ? a * b
              : a / b,
      values[0],
    );
  if (!Number.isFinite(result))
    throw new BadRequestException("Calculation produced an invalid number");
  return result;
}
export function validateFields(
  fields: Field[],
  data: any,
  role: string,
  previous: any = {},
  depth = 0,
): void {
  if (depth > 8)
    throw new BadRequestException("Form sections exceed nesting limit");
  for (const field of fields) {
    const v = data[field.id];
    if (
      field.writeRoles?.length &&
      !field.writeRoles.includes(role) &&
      JSON.stringify(v) !== JSON.stringify(previous[field.id])
    )
      throw new BadRequestException(`Field ${field.label} is read-only`);
    // Mandatory validation is independent of presentation visibility.
    if (
      field.required &&
      (v == null || v === "" || (Array.isArray(v) && !v.length))
    )
      throw new BadRequestException(`${field.label} is required`);
    if (v == null || v === "") continue;
    const valid =
      field.type === "number"
        ? typeof v === "number" && Number.isFinite(v)
        : field.type === "boolean"
          ? typeof v === "boolean"
          : field.type === "section"
            ? Array.isArray(v)
            : field.type === "file"
              ? Array.isArray(v) && v.every((id) => typeof id === "string")
              : typeof v === "string";
    if (!valid)
      throw new BadRequestException(`${field.label} has an invalid type`);
    if (field.type === "select" && !field.options?.includes(v))
      throw new BadRequestException(`${field.label} has an invalid option`);
    if (field.type === "date" && !Number.isFinite(Date.parse(v)))
      throw new BadRequestException(`${field.label} has an invalid date`);
    const size = typeof v === "number" ? v : v.length;
    if (
      (field.min !== undefined && size < field.min) ||
      (field.max !== undefined && size > field.max)
    )
      throw new BadRequestException(`${field.label} is outside its limits`);
    if (field.type === "section")
      for (const row of v)
        validateFields(field.fields || [], row, role, {}, depth + 1);
  }
}
export function readableData(fields: Field[], data: any, role: string): any {
  const result = { ...data };
  for (const key of Object.keys(result))
    if (key.startsWith("__")) delete result[key];
  for (const f of fields) {
    if (f.readRoles?.length && !f.readRoles.includes(role)) {
      delete result[f.id];
      continue;
    }
    if (f.type === "section" && Array.isArray(result[f.id]))
      result[f.id] = result[f.id].map((row: any) =>
        readableData(f.fields || [], row, role),
      );
  }
  return result;
}
export function attachmentReadable(
  fields: Field[],
  data: any,
  id: string,
  role: string,
): boolean {
  for (const f of fields) {
    if (
      f.type === "file" &&
      Array.isArray(data[f.id]) &&
      data[f.id].includes(id) &&
      f.readRoles?.length &&
      !f.readRoles.includes(role)
    )
      return false;
    if (f.type === "section" && Array.isArray(data[f.id]))
      for (const row of data[f.id])
        if (!attachmentReadable(f.fields || [], row, id, role)) return false;
  }
  return true;
}
