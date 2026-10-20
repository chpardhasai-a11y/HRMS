"use client";
import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import Link from "next/link";
import {
  AccessPage,
  Alert,
  Dialog,
  Pager,
  SearchField,
  StatusBadge,
  StatusFilter,
  TableState,
  accessApi,
  useAccessList,
  useOverviewCreate,
  RowMenu,
  useDebounced,
} from "../components";
export default function RolesPage() {
  const [search, setSearch] = useState(""),
    [status, setStatus] = useState(""),
    [page, setPage] = useState(1),
    [editing, setEditing] = useState(null),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false);
  const clearCreateShortcut = useOverviewCreate(() =>
    setEditing({
      name: "",
      description: "",
      levelId: "",
      permissionKeys: [],
      isActive: true,
    }),
  );
  const list = useAccessList("/roles", {
    search: useDebounced(search),
    status,
    page,
  });
  async function change(r) {
    setBusy(true);
    setError("");
    try {
      await accessApi(`/roles/${r.id}/status`, "PATCH", {
        isActive: !r.isActive,
        revision: r.revision,
      });
      list.reload();
      setNotice(
        "Role status updated. Permissions take effect on the next request.",
      );
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <AccessPage
      title="Roles Management"
      description="Assign levels and explicit permissions to custom organization roles."
      actions={
        <button
          className="btn btn-primary"
          onClick={() =>
            setEditing({
              name: "",
              description: "",
              levelId: "",
              permissionKeys: [],
              isActive: true,
            })
          }
        >
          <Plus size={16} /> Add Role
        </button>
      }
    >
      <div className="access-note">
        Users can hold multiple roles. Their active role permissions are
        combined. L1 is highest; levels do not inherit permissions. Organization
        administrators retain full access.
      </div>
      <Alert>{error || list.error}</Alert>
      <Alert success>{notice}</Alert>
      <div className="access-toolbar">
        <SearchField
          label="Search roles"
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
              <th>Role</th>
              <th>Level</th>
              <th>Permissions</th>
              <th>Users</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <TableState
              loading={list.loading}
              error={list.error}
              empty={!list.data.items.length}
              columns={6}
            />
            {!list.loading &&
              !list.error &&
              list.data.items.map((r) => (
                <tr key={r.id}>
                  <td>
                    <strong>{r.name}</strong>
                    {r.description && <p>{r.description}</p>}
                  </td>
                  <td>
                    L{r.level.number}
                    {r.level.displayName && (
                      <p className="access-muted">{r.level.displayName}</p>
                    )}
                    {!r.level.isActive && <small>Level inactive</small>}
                  </td>
                  <td>{r.permissionKeys.length}</td>
                  <td>{r._count.users}</td>
                  <td>
                    <StatusBadge active={r.isActive} />
                  </td>
                  <td>
                    <div className="access-actions">
                      <button
                        className="btn btn-secondary"
                        onClick={() => setEditing(r)}
                      >
                        Edit Role
                      </button>
                      <RowMenu
                        label={`Actions for ${r.name}`}
                        items={[
                          {
                            label: r.isActive ? "Deactivate" : "Activate",
                            disabled: busy,
                            onClick: () => change(r),
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
        <RoleForm
          initial={editing}
          onClose={() => {
            clearCreateShortcut();
            setEditing(null);
          }}
          onSaved={() => {
            clearCreateShortcut();
            setEditing(null);
            list.reload();
            setNotice("Role saved.");
          }}
        />
      )}
    </AccessPage>
  );
}
function RoleForm({ initial, onClose, onSaved }) {
  const [form, setForm] = useState(initial),
    [options, setOptions] = useState(null),
    [search, setSearch] = useState(""),
    [module, setModule] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    let current = true;
    Promise.all([
      accessApi("/roles/options"),
      initial.id ? accessApi(`/roles/${initial.id}`) : Promise.resolve(initial),
    ])
      .then(([o, r]) => {
        if (current) {
          setOptions(o);
          setForm(r);
        }
      })
      .catch((e) => {
        if (current) setError(e.message);
      });
    return () => {
      current = false;
    };
  }, [initial]);
  const change = (key, value) => setForm((f) => ({ ...f, [key]: value }));
  const available = options?.permissions.filter((p) => p.assignable) || [],
    visible = available.filter(
      (p) =>
        (!module || p.module === module) &&
        (!search ||
          `${p.key} ${p.name} ${p.description}`
            .toLowerCase()
            .includes(search.toLowerCase())),
    );
  const toggle = (keys, checked) =>
    change(
      "permissionKeys",
      checked
        ? [...new Set([...form.permissionKeys, ...keys])]
        : form.permissionKeys.filter((k) => !keys.includes(k)),
    );
  async function save(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await accessApi(
        `/roles${form.id ? `/${form.id}` : ""}`,
        form.id ? "PATCH" : "POST",
        {
          name: form.name,
          description: form.description,
          levelId: form.levelId,
          permissionKeys: form.permissionKeys,
          isActive: form.isActive,
          ...(form.id ? { revision: form.revision } : {}),
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
      title={initial.id ? "Edit Role" : "Add Role"}
      onClose={() => {
        if (!busy) onClose();
      }}
    >
      <Alert>{error}</Alert>
      {!options ? (
        <p>Loading role configuration…</p>
      ) : (
        <form className="access-form" onSubmit={save}>
          <label className="access-field">
            Role name
            <input
              required
              maxLength={100}
              value={form.name}
              onChange={(e) => change("name", e.target.value)}
            />
          </label>
          <label className="access-field">
            Level
            <select
              aria-label="Level"
              required
              value={form.levelId}
              onChange={(e) => change("levelId", e.target.value)}
            >
              <option value="">Select a level</option>
              {options.levels
                .filter((l) => l.isActive || l.id === form.levelId)
                .map((l) => (
                  <option key={l.id} value={l.id}>
                    L{l.number}
                    {l.displayName ? ` · ${l.displayName}` : ""}
                    {!l.isActive ? " (Inactive)" : ""}
                  </option>
                ))}
            </select>
          </label>
          {!options.levels.some((l) => l.isActive) && (
            <div className="access-note">
              Create an active level before adding roles.{" "}
              <Link href="/org-admin/access-control/levels">
                Open Levels Management
              </Link>
            </div>
          )}
          <label className="access-field">
            Description
            <textarea
              maxLength={1000}
              value={form.description}
              onChange={(e) => change("description", e.target.value)}
            />
          </label>
          <label className="access-check">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => change("isActive", e.target.checked)}
            />{" "}
            Active
          </label>
          <section className="access-grants" aria-label="Role permissions">
            <div className="access-actions">
              <h3>Permissions</h3>
              <span className="access-muted">
                {form.permissionKeys.length} selected
              </span>
            </div>
            <p className="access-muted">
              Employee self-service and workflow eligibility rules continue to
              apply. Platform and Access Control administration are controlled
              by account type.
            </p>
            <div className="access-toolbar">
              <SearchField
                label="Search role permissions"
                value={search}
                onChange={setSearch}
              />
              <select
                aria-label="Permission module"
                value={module}
                onChange={(e) => setModule(e.target.value)}
              >
                <option value="">All modules</option>
                {[...new Set(available.map((p) => p.module))]
                  .sort()
                  .map((m) => (
                    <option key={m}>{m}</option>
                  ))}
              </select>
            </div>
            <label className="access-check">
              <input
                type="checkbox"
                disabled={!visible.length}
                checked={
                  !!visible.length &&
                  visible.every((p) => form.permissionKeys.includes(p.key))
                }
                onChange={(e) =>
                  toggle(
                    visible.map((p) => p.key),
                    e.target.checked,
                  )
                }
              />{" "}
              Select all matching permissions ({visible.length})
            </label>
            <div className="access-permission-options">
              {visible.length ? (
                visible.map((p) => (
                  <label className="access-permission-option" key={p.key}>
                    <input
                      type="checkbox"
                      checked={form.permissionKeys.includes(p.key)}
                      onChange={(e) => toggle([p.key], e.target.checked)}
                    />
                    <span>
                      <strong>{p.name}</strong>
                      <small>{p.key}</small>
                      <small>{p.description}</small>
                    </span>
                  </label>
                ))
              ) : (
                <p>No matching permissions.</p>
              )}
            </div>
          </section>
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
              {busy ? "Saving…" : "Save Role"}
            </button>
          </div>
        </form>
      )}
    </Dialog>
  );
}
