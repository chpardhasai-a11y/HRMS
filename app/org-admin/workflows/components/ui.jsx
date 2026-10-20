"use client";
import { X, AlertCircle, Workflow, Loader2 } from "lucide-react";
export function Badge({ children }) {
  const text = String(children || "Draft");
  const status = text.toUpperCase().replaceAll(" ", "_");
  const tone = ["PUBLISHED", "COMPLETED", "ONLINE", "APPROVED"].includes(status)
    ? "success"
    : ["FAILED", "OFFLINE", "REJECTED", "TIMED_OUT"].includes(status)
      ? "error"
      : ["PAUSED", "WAITING", "UNASSIGNED"].includes(status)
        ? "warning"
        : ["OPEN", "RUNNING"].includes(status)
          ? "info"
          : "neutral";
  return (
    <span
      className={`badge badge-${tone} flow-badge flow-badge-${text.toLowerCase().replaceAll(" ", "-")}`}
    >
      <i />
      {text.replaceAll("_", " ")}
    </span>
  );
}
export function ErrorBox({ error }) {
  return error ? (
    <div className="flow-error" role="alert">
      <AlertCircle size={17} />
      {error}
    </div>
  ) : null;
}
export function Empty({ title = "Nothing here yet", children, action }) {
  return (
    <div className="flow-empty">
      <span>
        <Workflow size={28} />
      </span>
      <h3>{title}</h3>
      <p>{children}</p>
      {action}
    </div>
  );
}
export function Loading() {
  return (
    <div className="flow-loading">
      <Loader2 className="flow-spin" size={22} /> Loading workspace…
    </div>
  );
}
export function Modal({ title, children, onClose, wide = false }) {
  return (
    <div
      className="flow-modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`flow-modal ${wide ? "wide" : ""}`}
      >
        <header>
          <h2>{title}</h2>
          <button
            className="flow-icon-button"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </header>
        {children}
      </section>
    </div>
  );
}
export function Field({ label, children, hint }) {
  return (
    <label className="flow-field">
      <span>{label}</span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  );
}
export function JsonEditor({ label, value, onChange, hint }) {
  return (
    <Field label={label} hint={hint}>
      <textarea
        className="flow-code"
        rows={8}
        defaultValue={JSON.stringify(value, null, 2)}
        key={label}
        onBlur={(e) => {
          try {
            onChange(JSON.parse(e.target.value));
            e.target.setCustomValidity("");
          } catch {
            e.target.setCustomValidity("Enter valid JSON");
            e.target.reportValidity();
          }
        }}
      />
    </Field>
  );
}
