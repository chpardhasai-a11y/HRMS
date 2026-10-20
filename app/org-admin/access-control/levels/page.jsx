"use client";
import { useState } from "react";
import { Plus } from "lucide-react";
import {
  AccessPage,
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
      title="Levels Management"
      description="Define the hierarchy for role assignments. L1 is the highest authority."
      actions={
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
          <Plus size={16} /> Add Level
        </button>
      }
    >
      <div className="access-note">
        Levels define hierarchy only. They do not grant or inherit permissions.
        Assign levels to roles in Roles Management.
      </div>
      <Alert>{error || list.error}</Alert>
      <Alert success>{notice}</Alert>
      <div className="access-toolbar">
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
      <div className="access-table-wrap">
        <table className="access-table access-records">
          <thead>
            <tr>
              <th>Level</th>
              <th>Display name</th>
              <th>Description</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <TableState
              loading={list.loading}
              error={list.error}
              empty={!list.data.items.length}
              columns={5}
            />
            {!list.loading &&
              !list.error &&
              list.data.items.map((l) => (
                <tr key={l.id}>
                  <td>
                    <strong>{l.code}</strong>
                  </td>
                  <td>{l.displayName || "—"}</td>
                  <td>{l.description || "—"}</td>
                  <td>
                    <StatusBadge active={l.isActive} />
                  </td>
                  <td>
                    <div className="access-actions">
                      <button
                        className="btn btn-secondary"
                        onClick={() => setEditing(l)}
                      >
                        Edit {l.code}
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
