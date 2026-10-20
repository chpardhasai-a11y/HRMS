// Offset-bearing timestamps are absolute. Local dates/times use the workflow's IANA timezone.
export function workflowDate(
  value: string,
  timeZone = "Asia/Kolkata",
): Date | null {
  if (typeof value !== "string") return null;
  if (/(Z|[+-]\d{2}:\d{2})$/i.test(value)) {
    const d = new Date(value);
    return Number.isFinite(d.getTime()) ? d : null;
  }
  const match =
    /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2})(?::(\d{2}))?)?$/.exec(value);
  if (!match) return null;
  const [year, month, day, hour, minute, second] = match
    .slice(1)
    .map((v) => Number(v || 0));
  const utc = Date.UTC(year, month - 1, day, hour, minute, second);
  let candidate = utc;
  const format = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  for (let i = 0; i < 3; i++) {
    const p = Object.fromEntries(
      format.formatToParts(new Date(candidate)).map((p) => [p.type, p.value]),
    );
    const local = Date.UTC(
      +p.year,
      +p.month - 1,
      +p.day,
      +p.hour,
      +p.minute,
      +p.second,
    );
    candidate += utc - local;
  }
  const check = Object.fromEntries(
    format.formatToParts(new Date(candidate)).map((p) => [p.type, p.value]),
  );
  if (
    +check.year !== year ||
    +check.month !== month ||
    +check.day !== day ||
    +check.hour !== hour ||
    +check.minute !== minute
  )
    return null;
  return new Date(candidate);
}
