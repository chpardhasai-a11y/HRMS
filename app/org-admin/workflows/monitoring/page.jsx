"use client";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Activity,
  ArrowRight,
  RefreshCw,
  Download,
  Play,
  Pause,
  X,
  RotateCcw,
  Clock,
  CheckCircle2,
  AlertTriangle,
  GitBranch,
} from "lucide-react";
import { flow, download, dateTime, currentUser } from "../components/api";
import {
  Badge,
  Empty,
  ErrorBox,
  Loading,
  Modal,
  Field,
} from "../components/ui";
function Monitoring() {
  const params = useSearchParams(),
    user = currentUser(),
    admin = ["org_admin", "platform_admin"].includes(user?.role),
    [stats, setStats] = useState(null),
    [rows, setRows] = useState([]),
    [status, setStatus] = useState(""),
    [error, setError] = useState(""),
    [selected, setSelected] = useState(null),
    [busy, setBusy] = useState(false),
    [loading, setLoading] = useState(true);
  async function load() {
    try {
      const [s, r] = await Promise.all([
        admin ? flow("/monitoring") : Promise.resolve(null),
        flow(`/instances${status ? `?status=${status}` : ""}`),
      ]);
      setStats(s);
      setRows(r);
      setError("");
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }
  async function open(id) {
    try {
      setSelected(await flow(`/instances/${id}`));
    } catch (e) {
      setError(e.message);
    }
  }
  useEffect(() => {
    load();
    const timer = setInterval(load, 15000);
    return () => clearInterval(timer);
  }, [status]);
  useEffect(() => {
    const id = params.get("instance");
    if (id) open(id);
  }, []);
  async function control(action, state, transitionAction) {
    setBusy(true);
    try {
      await flow(`/instances/${selected.id}/actions`, "POST", {
        action,
        state,
        transitionAction,
        revision: selected.revision,
      });
      await open(selected.id);
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <div className="flow-page">
        <header className="flow-page-heading">
          <div>
            <h1>Workflow monitoring</h1>
            <p>See what’s moving, what’s waiting, and what needs attention.</p>
          </div>
          <div className="flow-actions">
            {admin && (
              <button
                className="flow-button"
                onClick={() =>
                  download("/reports.csv", "workflow-report.csv").catch((e) =>
                    setError(e.message),
                  )
                }
              >
                <Download size={16} /> Export report
              </button>
            )}
            <button className="flow-button" onClick={load}>
              <RefreshCw size={16} /> Refresh
            </button>
          </div>
        </header>
        <ErrorBox error={error} />
        {loading ? (
          <Loading />
        ) : (
          stats && (
            <>
              <section className="flow-stat-grid">
                {[
                  {
                    label: "Active executions",
                    value: stats.running,
                    icon: Activity,
                    color: "violet",
                  },
                  {
                    label: "Completed",
                    value: stats.completed,
                    icon: CheckCircle2,
                    color: "green",
                  },
                  {
                    label: "Overdue tasks",
                    value: stats.overdue,
                    icon: Clock,
                    color: "amber",
                  },
                  {
                    label: "Failed executions",
                    value: stats.failed,
                    icon: AlertTriangle,
                    color: "rose",
                  },
                ].map((s) => (
                  <div key={s.label} className="flow-stat">
                    <div>
                      <span>{s.label}</span>
                      <strong>{s.value}</strong>
                    </div>
                    <i className={`flow-tint-${s.color}`}>
                      <s.icon size={21} />
                    </i>
                  </div>
                ))}
              </section>
              <div className="flow-monitor-panels">
                <section className="flow-panel">
                  <header>
                    <h3>Process health</h3>
                    <Badge>{stats.workers.length ? "Online" : "Offline"}</Badge>
                  </header>
                  <div className="flow-health-metrics">
                    <div>
                      <strong>{stats.averageHours.toFixed(1)}h</strong>
                      <span>Average completion</span>
                    </div>
                    <div>
                      <strong>{stats.unassigned}</strong>
                      <span>Unassigned tasks</span>
                    </div>
                    <div>
                      <strong>{stats.workers.length}</strong>
                      <span>Active workers</span>
                    </div>
                  </div>
                  {!stats.workers.length && (
                    <p className="flow-muted">
                      No worker heartbeat. Start the workflow worker to process
                      schedules, delays, and integrations.
                    </p>
                  )}
                </section>
                <section className="flow-panel">
                  <header>
                    <h3>Where work is waiting</h3>
                    <GitBranch size={17} />
                  </header>
                  {stats.bottlenecks.length ? (
                    stats.bottlenecks
                      .sort((a, b) => b.open - a.open)
                      .slice(0, 4)
                      .map((b) => (
                        <div className="flow-bottleneck" key={b.name}>
                          <span>{b.name}</span>
                          <div>
                            <i
                              style={{
                                width: `${Math.min(100, (b.open / Math.max(...stats.bottlenecks.map((b) => b.open), 1)) * 100)}%`,
                              }}
                            />
                          </div>
                          <strong>{b.open}</strong>
                        </div>
                      ))
                  ) : (
                    <p className="flow-muted">
                      Bottlenecks appear as workflows create tasks.
                    </p>
                  )}
                </section>
              </div>
              {stats.jobs.length > 0 && (
                <section className="flow-panel flow-failures">
                  <h3>Failed jobs</h3>
                  {stats.jobs.map((j) => (
                    <button
                      key={j.id}
                      onClick={() => j.instanceId && open(j.instanceId)}
                    >
                      <AlertTriangle size={16} />
                      <div>
                        <strong>
                          {j.kind} · attempt {j.attempts}
                        </strong>
                        <p>{j.error}</p>
                      </div>
                      <ArrowRight size={16} />
                    </button>
                  ))}
                </section>
              )}
            </>
          )
        )}
        <div className="flow-section-toolbar">
          <h2 className="flow-section-title">Execution history</h2>
          <select
            aria-label="Filter execution status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">All statuses</option>
            {[
              "RUNNING",
              "WAITING",
              "PAUSED",
              "COMPLETED",
              "FAILED",
              "CANCELLED",
            ].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </div>
        {!rows.length ? (
          <Empty title="Your execution story starts here">
            Start a published workflow or run a test to see its history.
          </Empty>
        ) : (
          <div className="flow-table-wrap">
            <table className="flow-table">
              <thead>
                <tr>
                  <th>Execution</th>
                  <th>Status</th>
                  <th>Business state</th>
                  <th>Started</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <strong>
                        {r.title}
                        {r.test ? " · TEST" : ""}
                      </strong>
                      <small>
                        {r.definition.name} · v{r.version.number}
                      </small>
                    </td>
                    <td>
                      <Badge>{r.status}</Badge>
                    </td>
                    <td>{r.state}</td>
                    <td>{dateTime(r.createdAt)}</td>
                    <td>
                      <button
                        className="flow-button small"
                        onClick={() => open(r.id)}
                      >
                        Inspect <ArrowRight size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {selected && (
        <Modal wide title={selected.title} onClose={() => setSelected(null)}>
          <div className="flow-task-meta">
            <Badge>{selected.status}</Badge>
            <span>State: {selected.state}</span>
            <span>
              {selected.test
                ? "Draft test"
                : `Version ${selected.version.number}`}
            </span>
          </div>
          <ErrorBox error={error} />
          <div className="flow-task-actions">
            {(selected.version.document.policies.operators?.length
              ? selected.version.document.policies.operators.includes(
                  user?.id,
                ) ||
                selected.version.document.policies.operators.includes(
                  user?.role,
                )
              : admin) &&
              !["COMPLETED", "CANCELLED"].includes(selected.status) && (
                <>
                  {selected.status === "PAUSED" ? (
                    <button
                      className="flow-button"
                      disabled={busy}
                      onClick={() => control("resume")}
                    >
                      <Play size={15} /> Resume
                    </button>
                  ) : (
                    <button
                      className="flow-button"
                      disabled={
                        busy ||
                        !["RUNNING", "WAITING"].includes(selected.status)
                      }
                      onClick={() => control("pause")}
                    >
                      <Pause size={15} /> Pause
                    </button>
                  )}
                  {selected.status === "FAILED" && (
                    <button
                      className="flow-button"
                      disabled={busy}
                      onClick={() => control("retry")}
                    >
                      <RotateCcw size={15} /> Retry failed work
                    </button>
                  )}
                  <button
                    className="flow-button danger"
                    disabled={busy}
                    onClick={() => control("cancel")}
                  >
                    <X size={15} /> Cancel
                  </button>
                </>
              )}
          </div>
          <div className="flow-execution-graph">
            {selected.version.document.nodes.map((n) => {
              const tokens = selected.tokens.filter((t) => t.nodeId === n.id),
                active = tokens.some((t) =>
                  ["READY", "WAITING", "ERROR", "JOINED"].includes(t.status),
                );
              return (
                <div key={n.id} className={active ? "active" : ""}>
                  <span>
                    {active ? (
                      <Activity size={16} />
                    ) : (
                      <CheckCircle2 size={16} />
                    )}
                  </span>
                  <strong>{n.label}</strong>
                  <small>
                    {active ? tokens.map((t) => t.status).join(", ") : n.type}
                  </small>
                </div>
              );
            })}
          </div>
          {selected.version.document.transitions
            .filter((t) => t.from === selected.state)
            .map((t) => (
              <button
                key={t.id}
                className="flow-button small"
                disabled={
                  busy || ["COMPLETED", "CANCELLED"].includes(selected.status)
                }
                onClick={() => control("transition", t.to, t.action)}
              >
                {t.action} →{" "}
                {
                  selected.version.document.states.find((s) => s.id === t.to)
                    ?.name
                }
              </button>
            ))}
          {selected.status === "FAILED" &&
            selected.events.some((e) =>
              String(e.detail.message || "").includes("ambiguous"),
            ) && (
              <p className="flow-muted">
                An external operation may already have succeeded. Verify its
                outcome before retrying.
              </p>
            )}
          <h3>Execution timeline</h3>
          <div className="flow-timeline">
            {selected.events.map((e) => (
              <div className="flow-timeline-row" key={e.id}>
                <span />
                <div>
                  <strong>{e.type.replaceAll("_", " ").toLowerCase()}</strong>
                  <p>
                    {e.nodeId
                      ? selected.version.document.nodes.find(
                          (n) => n.id === e.nodeId,
                        )?.label
                      : ""}{" "}
                    {e.detail.message ||
                      e.detail.comment ||
                      e.detail.action ||
                      ""}
                  </p>
                  <small>{dateTime(e.createdAt)}</small>
                </div>
              </div>
            ))}
          </div>
        </Modal>
      )}
    </>
  );
}
export default function MonitoringPage() {
  return (
    <Suspense fallback={<Loading />}>
      <Monitoring />
    </Suspense>
  );
}
