"use client";
import { useEffect, useState } from "react";
import {
  Inbox,
  RefreshCw,
  Clock,
  CheckCircle2,
  ArrowRight,
  UserRound,
  Paperclip,
} from "lucide-react";
import {
  flow,
  actionKey,
  dateTime,
  currentUser,
  download,
} from "../components/api";
import {
  Badge,
  ErrorBox,
  Empty,
  Loading,
  Modal,
  Field,
} from "../components/ui";
import { RuntimeForm } from "../components/forms";
export default function TasksPage() {
  const [rows, setRows] = useState([]),
    [notifications, setNotifications] = useState([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [all, setAll] = useState(false),
    [selected, setSelected] = useState(null),
    [data, setData] = useState({}),
    [comment, setComment] = useState(""),
    [busy, setBusy] = useState(false),
    [target, setTarget] = useState(""),
    [users, setUsers] = useState([]),
    [filter, setFilter] = useState("Open");
  const user = currentUser();
  async function load() {
    try {
      setError("");
      const [result, updates] = await Promise.all([
        flow(
          `/tasks?all=${all}&status=${filter === "Completed" ? "COMPLETED" : filter === "Unassigned" ? "UNASSIGNED" : "OPEN"}`,
        ),
        flow("/notifications"),
      ]);
      setRows(result);
      setNotifications(updates);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, [all, filter]);
  async function open(t) {
    setSelected(t);
    setData(t.instance.data);
    setComment("");
    setError("");
    try {
      const l = await flow("/lookups");
      setUsers(l.users);
    } catch (e) {
      setError(e.message);
    }
  }
  async function act(action) {
    setBusy(true);
    setError("");
    try {
      await flow(`/tasks/${selected.id}/action`, "POST", {
        action,
        revision: selected.instance.revision,
        key: actionKey(),
        comment,
        data,
        targetUserId: target || undefined,
      });
      setSelected(null);
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  const eligible = selected?.candidates.includes(user?.id || user?.sub),
    node = selected?.instance.version.document.nodes.find(
      (n) => n.id === selected.nodeId,
    );
  return (
    <>
      <div className="flow-page">
        <header className="flow-page-heading">
          <div>
            <h1>Task Inbox</h1>
            <p>The decisions and actions waiting for you.</p>
          </div>
          <div className="flow-actions">
            <button
              className="flow-button"
              title="Refresh tasks"
              onClick={load}
            >
              <RefreshCw size={16} /> Refresh
            </button>
            <label className="flow-check">
              <input
                type="checkbox"
                checked={all}
                onChange={(e) => setAll(e.target.checked)}
              />{" "}
              Organization queue
            </label>
          </div>
        </header>
        <ErrorBox error={!selected && error} />
        {notifications.length > 0 && (
          <section className="flow-panel" style={{ marginBottom: 20 }}>
            <h3>Updates for you</h3>
            {notifications.map((n) => (
              <div className="flow-notification-row" key={n.id}>
                <div>
                  <strong>{n.detail.message}</strong>
                  <small>{dateTime(n.createdAt)}</small>
                </div>
                <button
                  className="flow-button small"
                  onClick={async () => {
                    try {
                      await flow(`/notifications/${n.id}/read`, "POST", {});
                      setNotifications((v) => v.filter((x) => x.id !== n.id));
                    } catch (e) {
                      setError(e.message);
                    }
                  }}
                >
                  Dismiss
                </button>
              </div>
            ))}
          </section>
        )}
        <div className="flow-section-toolbar">
          <div className="flow-tabs">
            {["Open", "Unassigned", "Completed"].map((v) => (
              <button
                key={v}
                onClick={() => setFilter(v)}
                className={filter === v ? "active" : ""}
              >
                {v}
              </button>
            ))}
          </div>
          <span className="flow-muted">{rows.length} tasks</span>
        </div>
        {loading ? (
          <Loading />
        ) : !rows.length ? (
          <Empty title="You’re all caught up">
            New tasks will appear here when a workflow needs your input.
          </Empty>
        ) : (
          <div className="flow-table-wrap">
            <table className="flow-table">
              <thead>
                <tr>
                  <th>Task</th>
                  <th>Workflow</th>
                  <th>Status</th>
                  <th>Due</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.map((t) => (
                  <tr key={t.id}>
                    <td>
                      <strong>{t.title}</strong>
                      <small>
                        {t.instance.title}
                        {t.instance.test ? " · TEST" : ""}
                      </small>
                    </td>
                    <td>{t.instance.definition.name}</td>
                    <td>
                      <Badge>{t.status}</Badge>
                    </td>
                    <td
                      className={
                        t.dueAt && new Date(t.dueAt) < new Date()
                          ? "flow-overdue"
                          : ""
                      }
                    >
                      {dateTime(t.dueAt)}
                    </td>
                    <td>
                      <button
                        className="flow-button small"
                        onClick={() => open(t)}
                      >
                        Open <ArrowRight size={14} />
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
            <span>
              <Clock size={15} /> {dateTime(selected.dueAt)}
            </span>
            <span>
              {selected.instance.test
                ? "Draft test"
                : `Version ${selected.instance.version.number}`}
            </span>
          </div>
          <ErrorBox error={error} />
          <p className="flow-muted">{selected.instance.title}</p>
          <RuntimeForm
            fields={selected.instance.version.document.fields}
            data={data}
            onChange={setData}
            instanceId={selected.instanceId}
          />
          <Field label="Comment">
            <textarea
              rows={3}
              placeholder="Add context for the next person…"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
          </Field>
          <div className="flow-task-actions">
            {selected.status === "OPEN" &&
              (node?.config.actions || ["complete"]).map((action) => (
                <button
                  key={action}
                  disabled={busy || !eligible}
                  className={`flow-button ${["approve", "complete"].includes(action) ? "primary" : action === "reject" ? "danger" : ""}`}
                  onClick={() => act(action)}
                >
                  {action[0].toUpperCase() + action.slice(1)}
                </button>
              ))}
            {selected.status === "OPEN" && !selected.claimedBy && (
              <button
                className="flow-button"
                disabled={busy || !eligible}
                onClick={() => act("claim")}
              >
                Claim task
              </button>
            )}
          </div>
          <details className="flow-config-card">
            <summary>Assignment and activity</summary>
            <Field label="New assignee">
              <select
                value={target}
                onChange={(e) => setTarget(e.target.value)}
              >
                <option value="">Choose person</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.email}
                  </option>
                ))}
              </select>
            </Field>
            <div className="flow-actions">
              <button
                className="flow-button"
                disabled={busy || !target || !eligible}
                onClick={() => act("delegate")}
              >
                Delegate
              </button>
              <button
                className="flow-button"
                disabled={busy || !target}
                onClick={() => act("reassign")}
              >
                Reassign
              </button>
            </div>
            {(selected.votes || []).map((v, i) => (
              <div className="flow-timeline-row" key={i}>
                <span />
                <div>
                  <strong>{v.action}</strong>
                  <p>{v.comment}</p>
                  <small>{dateTime(v.at)}</small>
                  {(v.attachments || []).map((id) => (
                    <button
                      key={id}
                      className="flow-button small"
                      onClick={() =>
                        download(`/attachments/${id}`, "attachment").catch(
                          (e) => setError(e.message),
                        )
                      }
                    >
                      <Paperclip size={13} /> Download attachment
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </details>
        </Modal>
      )}
    </>
  );
}
