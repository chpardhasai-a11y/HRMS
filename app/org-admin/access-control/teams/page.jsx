"use client";
import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { apiRequest } from "../../../lib/hrmsApi";
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
export default function TeamsPage() {
  const [search, setSearch] = useState(""),
    [status, setStatus] = useState(""),
    [page, setPage] = useState(1),
    [editing, setEditing] = useState(null),
    [members, setMembers] = useState(null),
    [deleting, setDeleting] = useState(null),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false);
  const list = useAccessList("/teams", {
    search: useDebounced(search),
    status,
    page,
  });
  async function mutate(path, method, data, message) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await accessApi(path, method, data);
      setDeleting(null);
      list.reload();
      setNotice(message);
      return true;
    } catch (e) {
      setError(e.message);
      return false;
    } finally {
      setBusy(false);
    }
  }
  return (
    <AccessPage
      title="Teams Management"
      description="Manage department teams and their user memberships."
      actions={
        <button
          className="btn btn-primary"
          onClick={() =>
            setEditing({
              name: "",
              code: "",
              description: "",
              departmentId: "",
              isActive: true,
            })
          }
        >
          <Plus size={16} /> Add Team
        </button>
      }
    >
      <Alert>{error || list.error}</Alert>
      <Alert success>{notice}</Alert>
      <div className="access-toolbar">
        <SearchField
          label="Search teams"
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
              <th>Team</th>
              <th>Department</th>
              <th>Members</th>
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
              list.data.items.map((t) => (
                <tr key={t.id}>
                  <td>
                    <strong>{t.name}</strong>
                    <p className="access-muted">{t.code}</p>
                    {t.description && <p>{t.description}</p>}
                  </td>
                  <td>{t.department?.name || "—"}</td>
                  <td>{t.memberCount}</td>
                  <td>
                    <StatusBadge active={t.isActive} />
                  </td>
                  <td>
                    <div className="access-actions">
                      <button
                        className="btn btn-secondary"
                        onClick={() => setEditing(t)}
                      >
                        Edit
                      </button>
                      <button
                        className="btn btn-secondary"
                        onClick={() => setMembers(t)}
                      >
                        Manage Members
                      </button>
                      <RowMenu
                        label={`Actions for ${t.name}`}
                        items={[
                          {
                            label: t.isActive ? "Deactivate" : "Activate",
                            disabled: busy,
                            onClick: () =>
                              mutate(
                                `/teams/${t.id}/status`,
                                "PATCH",
                                { isActive: !t.isActive },
                                "Team status updated.",
                              ),
                          },
                          {
                            label: "Delete",
                            danger: true,
                            disabled: busy,
                            onClick: () => {
                              setError("");
                              setDeleting(t);
                            },
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
        <TeamForm
          team={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            list.reload();
            setNotice("Team saved.");
          }}
        />
      )}
      {members && (
        <Members
          team={members}
          onClose={() => setMembers(null)}
          onChange={list.reload}
        />
      )}
      {deleting && (
        <Dialog
          title="Delete Team"
          onClose={() => {
            if (!busy) setDeleting(null);
          }}
        >
          <Alert>{error}</Alert>
          <p>
            Delete {deleting.name}? Teams with members or workflow references
            must be deactivated instead.
          </p>
          <div className="access-dialog-footer">
            <button
              className="btn btn-secondary"
              disabled={busy}
              onClick={() => setDeleting(null)}
            >
              Cancel
            </button>
            <button
              className="btn btn-primary"
              disabled={busy}
              onClick={() =>
                mutate(`/teams/${deleting.id}`, "DELETE", null, "Team deleted.")
              }
            >
              {busy ? "Deleting…" : "Delete Team"}
            </button>
          </div>
        </Dialog>
      )}
    </AccessPage>
  );
}
function TeamForm({ team, onClose, onSaved }) {
  const [form, setForm] = useState(team),
    [departments, setDepartments] = useState([]),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [loading, setLoading] = useState(true);
  useEffect(() => {
    let current = true;
    apiRequest("/org-masters/departments")
      .then((d) => {
        if (current) setDepartments(d);
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
  }, []);
  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));
  async function save(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await accessApi(
        `/teams${team.id ? `/${team.id}` : ""}`,
        team.id ? "PATCH" : "POST",
        {
          name: form.name.trim(),
          ...(form.code?.trim() ? { code: form.code.trim() } : {}),
          description: form.description || "",
          departmentId: form.departmentId || "",
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
      title={team.id ? "Edit Team" : "Add Team"}
      onClose={() => {
        if (!busy) onClose();
      }}
    >
      <Alert>{error}</Alert>
      <form className="access-form" onSubmit={save}>
        <label className="access-field">
          Team name
          <input
            required
            maxLength={100}
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
          />
        </label>
        <label className="access-field">
          Team code
          <input
            maxLength={100}
            value={form.code}
            onChange={(e) => set("code", e.target.value)}
            placeholder="Generated automatically if blank"
          />
        </label>
        <label className="access-field">
          Department
          <select
            disabled={loading}
            value={form.departmentId || ""}
            onChange={(e) => set("departmentId", e.target.value)}
          >
            <option value="">No department</option>
            {departments.map((d) => (
              <option value={d.id} key={d.id}>
                {d.name}
                {!d.isActive ? " (Inactive)" : ""}
              </option>
            ))}
          </select>
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
          <button className="btn btn-primary" disabled={busy || loading}>
            {busy ? "Saving…" : "Save Team"}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
function Members({ team, onClose, onChange }) {
  const [search, setSearch] = useState(""),
    [userSearch, setUserSearch] = useState(""),
    [page, setPage] = useState(1),
    [userPage, setUserPage] = useState(1),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const members = useAccessList(`/teams/${team.id}/members`, {
      search: useDebounced(search),
      page,
      pageSize: 10,
    }),
    users = useAccessList("/users/options", {
      search: useDebounced(userSearch),
      page: userPage,
      pageSize: 10,
    });
  async function change(user, remove) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await accessApi(
        `/teams/${team.id}/members${remove ? `/${user.id}` : ""}`,
        remove ? "DELETE" : "POST",
        remove ? null : { userId: user.id },
      );
      members.reload();
      onChange();
      setNotice(remove ? "Member removed." : "Member added.");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog
      title={`Members · ${team.name}`}
      onClose={() => {
        if (!busy) onClose();
      }}
    >
      <div className="access-note">
        Membership is used for workflow assignment and does not grant module
        permissions. Existing tasks keep their assigned candidates.
      </div>
      <Alert>{error || members.error || users.error}</Alert>
      <Alert success>{notice}</Alert>
      <h3>Current members</h3>
      <SearchField
        label="Search members"
        value={search}
        onChange={(v) => {
          setSearch(v);
          setPage(1);
        }}
      />
      <ul className="access-member-list">
        {members.loading ? (
          <li>Loading…</li>
        ) : members.error ? (
          <li>
            <button className="btn btn-secondary" onClick={members.reload}>
              Retry members
            </button>
          </li>
        ) : members.data.items.length ? (
          members.data.items.map((u) => (
            <li key={u.id}>
              <div>
                {u.employee?.name || u.email}
                <small>
                  {u.employee?.name ? u.email : u.employeeCode}
                  {!u.isActive ? " · Inactive" : ""}
                </small>
              </div>
              <button
                className="btn btn-secondary"
                disabled={busy}
                onClick={() => change(u, true)}
                aria-label={`Remove ${u.email}`}
              >
                Remove
              </button>
            </li>
          ))
        ) : (
          <li>No members found.</li>
        )}
      </ul>
      <Pager
        page={page}
        total={members.data.total}
        pageSize={10}
        onChange={setPage}
      />
      <h3>Add members</h3>
      <SearchField
        label="Search organization users"
        value={userSearch}
        onChange={(v) => {
          setUserSearch(v);
          setUserPage(1);
        }}
      />
      <ul className="access-member-list">
        {users.loading ? (
          <li>Loading…</li>
        ) : users.error ? (
          <li>
            <button className="btn btn-secondary" onClick={users.reload}>
              Retry users
            </button>
          </li>
        ) : users.data.items.length ? (
          users.data.items.map((u) => (
            <li key={u.id}>
              <div>
                {u.employee?.name || u.email}
                <small>{u.employee?.name ? u.email : u.employeeCode}</small>
              </div>
              <button
                className="btn btn-secondary"
                disabled={busy || members.data.items.some((m) => m.id === u.id)}
                onClick={() => change(u, false)}
                aria-label={`Add ${u.email}`}
              >
                {members.data.items.some((m) => m.id === u.id)
                  ? "Added"
                  : "Add"}
              </button>
            </li>
          ))
        ) : (
          <li>No active users found.</li>
        )}
      </ul>
      <Pager
        page={userPage}
        total={users.data.total}
        pageSize={10}
        onChange={setUserPage}
      />
    </Dialog>
  );
}
