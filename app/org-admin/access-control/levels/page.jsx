"use client";
import { useState } from "react";
import { Plus, RefreshCw, Pencil } from "lucide-react";
import {
  AccessPage,
  LevelBadge,
  RowMenu,
  Alert,
  Dialog,
  Pager,
  SearchField,
  StatusBadge,
  StatusFilter,
  TableState,
  accessApi,
  useAccessList,
  useDebounced,
} from "../components";
export default function LevelsPage() {
  const [search, setSearch] = useState(""),
    [status, setStatus] = useState(""),
    [page, setPage] = useState(1),
    [editing, setEditing] = useState(null),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false);
  const list = useAccessList("/levels", {
    search: useDebounced(search),
    status,
    page,
  });
  async function changeStatus(level) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await accessApi(`/levels/${level.id}/status`, "PATCH", {
        isActive: !level.isActive,
      });
      list.reload();
      setNotice(
        `${level.code} ${level.isActive ? "deactivated" : "activated"}.`,
      );
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <AccessPage
      detail
      catalog
      title="Levels"
      description="Maintain ordered hierarchy ranks used by organization roles."
      actions={
        <>
          <button
            className="btn btn-secondary"
            disabled={list.loading}
            onClick={list.reload}
          >
            <RefreshCw
              size={16}
              className={list.loading ? "access-spin" : ""}
            />
            Refresh
          </button>
          <button
            className="btn btn-primary"
            onClick={() =>
              setEditing({
                number: "",
                displayName: "",
                description: "",
                isActive: true,
              })
            }
          >
            <Plus size={16} /> New Level
          </button>
        </>
      }
    >
      <Alert>{error || list.error}</Alert>
      <Alert success>{notice}</Alert>
      <div className="access-detail-filters">
        <SearchField
          label="Search levels"
          value={search}
          onChange={(v) => {
            setSearch(v);
            setPage(1);
          }}
        />
        <StatusFilter
          value={status}
          onChange={(v) => {
            setStatus(v);
            setPage(1);
          }}
        />
        {list.error && (
          <button className="btn btn-secondary" onClick={list.reload}>
            Retry
          </button>
        )}
      </div>
      <section
        className="access-detail-table access-catalog-table"
        aria-labelledby="level-catalog-title"
      >
        <h2 id="level-catalog-title">Hierarchy Levels</h2>
        <div className="access-table-wrap">
          <table
            aria-busy={list.loading}
            className="access-table access-records"
          >
            <thead>
              <tr>
                <th>Level</th>
                <th>Description</th>
                <th>Roles</th>
                <th title="Distinct active users assigned an active role at this level">
                  Active Users
                </th>
                <th title="Teams of users assigned to roles at this level">
                  Teams
                </th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <TableState
                loading={list.loading && !list.data.items.length}
                error={list.error}
                empty={!list.data.items.length}
                columns={7}
              />
              {!list.error &&
                list.data.items.map((l) => (
                  <tr key={l.id}>
                    <td>
                      <LevelBadge number={l.number} />
                      {l.displayName && <p>{l.displayName}</p>}
                    </td>
                    <td>{l.description || "—"}</td>
                    <td>{l.roleCount ?? "—"}</td>
                    <td>{l.activeUserCount ?? "—"}</td>
                    <td>
                      {l.teams?.length
                        ? l.teams
                            .map(
                              (t) => t.name + (t.isActive ? "" : " (Inactive)"),
                            )
                            .join(", ")
                        : "—"}
                    </td>
                    <td>
                      <StatusBadge active={l.isActive} />
                    </td>
                    <td>
                      <div className="access-actions">
                        <button
                          className="access-icon-action"
                          aria-label={`Edit ${l.code}`}
                          title={`Edit ${l.code}`}
                          onClick={() => setEditing(l)}
                        >
                          <Pencil size={17} />
                        </button>
                        <RowMenu
                          label={`Actions for ${l.code}`}
                          items={[
                            {
                              label: l.isActive ? "Deactivate" : "Activate",
                              disabled: busy,
                              onClick: () => changeStatus(l),
                            },
                          ]}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        <Pager page={page} total={list.data.total} onChange={setPage} />
      </section>
      <p className="access-readonly-caption">
        L1 is the highest authority. Levels define hierarchy only and do not
        grant or inherit permissions.
      </p>
      {editing && (
        <LevelForm
          level={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            list.reload();
            setNotice("Level saved.");
          }}
        />
      )}
    </AccessPage>
  );
}
function LevelForm({ level, onClose, onSaved }) {
  const [form, setForm] = useState(level),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));
  async function save(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await accessApi(
        `/levels${level.id ? `/${level.id}` : ""}`,
        level.id ? "PATCH" : "POST",
        {
          number: Number(form.number),
          displayName: form.displayName || "",
          description: form.description || "",
          isActive: form.isActive,
        },
      );
      onSaved();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog
      title={level.id ? "Edit Level" : "Add Level"}
      onClose={() => {
        if (!busy) onClose();
      }}
    >
      <Alert>{error}</Alert>
      <form className="access-form" onSubmit={save}>
        <label className="access-field">
          Level number
          <input
            type="number"
            min="1"
            max="2147483647"
            step="1"
            required
            value={form.number}
            onChange={(e) => set("number", e.target.value)}
          />
          <small className="access-muted">
            {form.number
              ? `Identifier: L${form.number}`
              : "Enter 1 for L1, 2 for L2, and so on."}
          </small>
        </label>
        <label className="access-field">
          Display name
          <input
            maxLength={100}
            value={form.displayName || ""}
            onChange={(e) => set("displayName", e.target.value)}
          />
        </label>
        <label className="access-field">
          Description
          <textarea
            maxLength={1000}
            value={form.description || ""}
            onChange={(e) => set("description", e.target.value)}
          />
        </label>
        <label className="access-check">
          <input
            type="checkbox"
            checked={form.isActive}
            onChange={(e) => set("isActive", e.target.checked)}
          />{" "}
          Active
        </label>
        <div className="access-dialog-footer">
          <button
            type="button"
            className="btn btn-secondary"
            disabled={busy}
            onClick={onClose}
          >
            Cancel
          </button>
          <button className="btn btn-primary" disabled={busy}>
            {busy ? "Saving…" : "Save Level"}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
