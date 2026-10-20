"use client";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Search,
  X,
  ShieldCheck,
  UsersRound,
  KeyRound,
  ListTree,
  Layers,
  ArrowUpRight,
  MoreHorizontal,
  CircleCheck,
  CircleAlert,
  ArrowLeft,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createPortal } from "react-dom";
import Breadcrumbs from "../../components/Breadcrumbs";
import { apiRequest } from "../../lib/hrmsApi";

export const accessApi = (path, method, data) =>
  apiRequest(`/access-control${path}`, {
    ...(method ? { method } : {}),
    ...(data ? { body: JSON.stringify(data) } : {}),
  });
export function useDebounced(value) {
  const [result, setResult] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setResult(value), 250);
    return () => clearTimeout(timer);
  }, [value]);
  return result;
}
export function useAccessList(path, filters = {}) {
  const [data, setData] = useState({ items: [], total: 0 }),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [tick, setTick] = useState(0);
  const query = new URLSearchParams(
    Object.entries(filters).filter(([, v]) => v !== "" && v !== undefined),
  ).toString();
  useEffect(() => {
    let current = true;
    setLoading(true);
    setError("");
    accessApi(`${path}?${query}`)
      .then((value) => {
        if (current) setData(value);
      })
      .catch((e) => {
        if (current) setError(e.message);
      })
      .finally(() => {
        if (current) setLoading(false);
      });
    return () => {
      current = false;
    };
  }, [path, query, tick]);
  return {
    data,
    loading,
    error,
    reload: useCallback(() => setTick((n) => n + 1), []),
  };
}
const sections = [
  { slug: "", label: "Overview", icon: ShieldCheck },
  { slug: "users", label: "Users", icon: UsersRound },
  { slug: "roles", label: "Roles", icon: ShieldCheck },
  { slug: "permissions", label: "Permissions", icon: KeyRound },
  { slug: "levels", label: "Levels", icon: ListTree },
  { slug: "teams", label: "Teams", icon: Layers },
];
export function AccessPage({
  title,
  description,
  actions,
  children,
  overview = false,
  detail = false,
}) {
  const pathname = usePathname();
  return (
    <main
      className={`access-page ${overview ? "access-overview" : ""} ${detail ? "access-detail" : ""}`}
    >
      <div className="access-shell">
        {detail ? (
          <nav aria-label="Breadcrumb" className="access-detail-breadcrumb">
            <Link href="/org-admin/access-control">
              <ArrowLeft size={16} /> Access Control
            </Link>
            <span>/</span>
            <span aria-current="page">{title}</span>
          </nav>
        ) : (
          !overview && (
            <Breadcrumbs
              items={[
                { label: "Organization Admin", href: "/org-admin" },
                { label: "Access Control", href: "/org-admin/access-control" },
                { label: title },
              ]}
            />
          )
        )}
        <header className="access-heading">
          <div>
            <h1>{title}</h1>
            <p>{description}</p>
          </div>
          {actions && (
            <div className="access-actions access-heading-actions">
              {actions}
            </div>
          )}
        </header>
        {!detail && (
          <nav
            className="access-section-nav"
            aria-label="Access Control sections"
          >
            {(overview ? sections.slice(0, 1) : sections).map(
              ({ slug, label, icon: Icon }) => {
                const href = `/org-admin/access-control${slug ? `/${slug}` : ""}`,
                  active = pathname === href;
                return (
                  <Link
                    key={label}
                    href={href}
                    className={active ? "active" : ""}
                    aria-current={active ? "page" : undefined}
                  >
                    <Icon size={17} />
                    {label}
                  </Link>
                );
              },
            )}
          </nav>
        )}
        <div
          className={
            overview
              ? "access-overview-content"
              : detail
                ? "access-detail-content"
                : "access-management-panel"
          }
        >
          {children}
        </div>
      </div>
    </main>
  );
}
// Overview shortcuts open the existing forms rather than creating a second flow.
export function useOverviewCreate(open) {
  const callback = useRef(open);
  callback.current = open;
  useEffect(() => {
    if (new URL(window.location.href).searchParams.get("create") === "1")
      callback.current();
  }, []);
  // Keep the shortcut in the URL until dismissal: route guards may remount pages.
  return useCallback(() => {
    const url = new URL(window.location.href);
    if (!url.searchParams.has("create")) return;
    url.searchParams.delete("create");
    window.history.replaceState(
      window.history.state,
      "",
      url.pathname + url.search + url.hash,
    );
  }, []);
}
export function RowMenu({ label, items }) {
  const [position, setPosition] = useState(null),
    trigger = useRef(null),
    menu = useRef(null),
    id = useId();
  useEffect(() => {
    if (!position) return;
    const outside = (e) => {
      if (
        !menu.current?.contains(e.target) &&
        !trigger.current?.contains(e.target)
      )
        setPosition(null);
    };
    const key = (e) => {
      const buttons = [
          ...menu.current.querySelectorAll("button:not(:disabled)"),
        ],
        i = buttons.indexOf(document.activeElement);
      if (e.key === "Escape") {
        e.preventDefault();
        setPosition(null);
        trigger.current?.focus({ preventScroll: true });
      }
      if (e.key === "Tab") setPosition(null);
      if (["ArrowDown", "ArrowUp", "Home", "End"].includes(e.key)) {
        e.preventDefault();
        const n =
          e.key === "Home"
            ? 0
            : e.key === "End"
              ? buttons.length - 1
              : (i + (e.key === "ArrowDown" ? 1 : -1) + buttons.length) %
                buttons.length;
        buttons[n]?.focus({ preventScroll: true });
      }
    };
    const resize = () => setPosition(null);
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", key);
    window.addEventListener("resize", resize);
    menu.current
      ?.querySelector("button:not(:disabled)")
      ?.focus({ preventScroll: true });
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", key);
      window.removeEventListener("resize", resize);
    };
  }, [position]);
  function toggle() {
    if (position) {
      setPosition(null);
      return;
    }
    const r = trigger.current.getBoundingClientRect(),
      height = items.length * 38 + 12;
    setPosition({
      left: Math.max(8, Math.min(window.innerWidth - 218, r.right - 210)),
      top: Math.max(
        8,
        r.bottom + height > window.innerHeight ? r.top - height : r.bottom + 6,
      ),
    });
  }
  return (
    <>
      <button
        ref={trigger}
        className="access-more-button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={!!position}
        aria-controls={position ? id : undefined}
        onClick={toggle}
      >
        <MoreHorizontal size={18} />
      </button>
      {position &&
        createPortal(
          <div
            ref={menu}
            id={id}
            className="access-row-menu"
            role="menu"
            aria-label={label}
            style={position}
          >
            {items.map(({ label, onClick, disabled, danger, icon: Icon }) => (
              <button
                key={label}
                role="menuitem"
                disabled={disabled}
                className={danger ? "danger" : ""}
                onClick={() => {
                  setPosition(null);
                  trigger.current?.focus({ preventScroll: true });
                  onClick();
                }}
              >
                {Icon && <Icon size={15} />}
                <span>{label}</span>
                <ArrowUpRight size={12} />
              </button>
            ))}
          </div>,
          document.body,
        )}
    </>
  );
}
export function Alert({ children, success = false }) {
  return children ? (
    <div
      role={success ? "status" : "alert"}
      className={`access-alert ${success ? "success" : ""}`}
    >
      {success ? (
        <CircleCheck size={17} aria-hidden="true" />
      ) : (
        <CircleAlert size={17} aria-hidden="true" />
      )}
      <span>{children}</span>
    </div>
  ) : null;
}
export function SearchField({
  value,
  onChange,
  label = "Search",
  placeholder,
}) {
  return (
    <label className="access-search">
      <Search size={16} aria-hidden="true" />
      <input
        aria-label={label}
        placeholder={placeholder || label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}
export function StatusFilter({ value, onChange }) {
  return (
    <select
      aria-label="Filter by status"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="">All statuses</option>
      <option value="active">Active</option>
      <option value="inactive">Inactive</option>
    </select>
  );
}
export function StatusBadge({ active }) {
  return (
    <span
      className={`badge access-status ${active ? "badge-success" : "badge-neutral"}`}
    >
      {active ? "Active" : "Inactive"}
    </span>
  );
}
export function Pager({ page, total, pageSize = 20, onChange }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  return (
    <div className="access-pager">
      <span>
        {total} {total === 1 ? "record" : "records"} · Page {page} of {pages}
      </span>
      <div className="access-actions">
        <button
          className="btn btn-secondary"
          aria-label="Previous page"
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
        >
          <ChevronLeft size={16} />
        </button>
        <button
          className="btn btn-secondary"
          aria-label="Next page"
          disabled={page >= pages}
          onClick={() => onChange(page + 1)}
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
export function TableState({ loading, error, empty, columns }) {
  return loading || error || empty ? (
    <tr>
      <td colSpan={columns} className="access-empty">
        {loading
          ? "Loading…"
          : error
            ? "Unable to load records. Please retry."
            : "No records found."}
      </td>
    </tr>
  ) : null;
}
export function Dialog({ title, onClose, children }) {
  const titleId = useId(),
    ref = useRef(null),
    close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    const previous = document.activeElement;
    ref.current?.querySelector("input,button,select,textarea")?.focus();
    const key = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close.current();
      }
      if (e.key === "Tab") {
        const items = [
          ...ref.current.querySelectorAll(
            "button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),a[href]",
          ),
        ].filter((el) => el.getClientRects().length);
        if (!items.length) {
          e.preventDefault();
          return;
        }
        const first = items[0],
          last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("keydown", key);
      document.body.style.overflow = overflow;
      previous?.focus({ preventScroll: true });
    };
  }, []);
  return (
    <div className="access-backdrop">
      <section
        className="access-dialog"
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <header>
          <h2 id={titleId}>{title}</h2>
          <button
            className="btn btn-secondary"
            aria-label="Close dialog"
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </header>
        <div className="access-dialog-body">{children}</div>
      </section>
    </div>
  );
}

export function SummaryCards({ items }) {
  return (
    <section
      className={`access-detail-stats access-detail-stats-${items.length}`}
      aria-label="Module summary"
    >
      {items.map(
        ({
          label,
          value,
          icon: Icon,
          tone = "neutral",
          horizontal = false,
        }) => (
          <article
            key={label}
            className={`access-detail-stat access-detail-stat-${tone} ${horizontal ? "horizontal" : ""}`}
          >
            {horizontal && Icon && <Icon size={23} aria-hidden="true" />}
            <div>
              <span>{label}</span>
              {value === undefined ? (
                <span className="access-skeleton access-skeleton-number" />
              ) : (
                <strong>{new Intl.NumberFormat("en-IN").format(value)}</strong>
              )}
            </div>
            {!horizontal && Icon && <Icon size={18} aria-hidden="true" />}
          </article>
        ),
      )}
    </section>
  );
}
export function StatusTabs({
  value,
  onChange,
  items,
  label = "Record status",
}) {
  return (
    <div className="access-status-tabs" role="tablist" aria-label={label}>
      {items.map((item) => (
        <button
          key={item.value}
          role="tab"
          aria-selected={value === item.value}
          tabIndex={value === item.value ? 0 : -1}
          onClick={() => onChange(item.value)}
          onKeyDown={(event) => {
            if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key))
              return;
            event.preventDefault();
            const i = items.findIndex((i) => i.value === value);
            const next =
              event.key === "Home"
                ? 0
                : event.key === "End"
                  ? items.length - 1
                  : (i + (event.key === "ArrowRight" ? 1 : -1) + items.length) %
                    items.length;
            onChange(items[next].value);
            event.currentTarget.parentElement
              .querySelectorAll("button")
              [next]?.focus();
          }}
        >
          {item.label}
          {item.count !== undefined
            ? ` (${new Intl.NumberFormat("en-IN").format(item.count)})`
            : ""}
        </button>
      ))}
    </div>
  );
}
export async function exportAccessCsv(path, filters, columns, filename) {
  const query = new URLSearchParams(
    Object.entries(filters).filter(([, v]) => v !== "" && v !== undefined),
  );
  query.set("pageSize", "100");
  query.set("page", "1");
  const first = await accessApi(`${path}?${query}`);
  const rows = [...first.items];
  for (let page = 2; page <= Math.ceil(first.total / 100); page++) {
    query.set("page", String(page));
    rows.push(...(await accessApi(`${path}?${query}`)).items);
  }
  const escape = (value) => {
    let text = String(value ?? "");
    if (/^[=+@\-\t\r]/.test(text)) text = "'" + text;
    return '"' + text.replaceAll('"', '""') + '"';
  };
  const csv = [
    columns.map((c) => escape(c.label)).join(","),
    ...rows.map((row) => columns.map((c) => escape(c.value(row))).join(",")),
  ].join("\r\n");
  const url = URL.createObjectURL(
    new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
