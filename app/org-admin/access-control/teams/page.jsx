"use client";
import { useEffect, useState } from "react";
import { Plus, RefreshCw, Layers, UsersRound, Pencil } from "lucide-react";
import { apiRequest } from "../../../lib/hrmsApi";
import {
  AccessPage,
  AccessSelect,
  SummaryCards,
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
      detail
      catalog
      title="Teams"
      description="Manage organization teams, department relationships, and memberships."
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
                name: "",
                code: "",
                description: "",
                departmentId: "",
                isActive: true,
              })
            }
          >
            <Plus size={16} /> New Team
          </button>
        </>
      }
    >
      <SummaryCards
        items={[
          {
            label: "Total Teams",
            value: list.data.summary?.totalTeams,
            icon: Layers,
            horizontal: true,
            valueFirst: true,
            tone: "orange",
          },
          {
            label: "Active Teams",
            value: list.data.summary?.activeTeams,
            icon: Layers,
            horizontal: true,
            valueFirst: true,
          },
          {
            label: "Total Roles",
            value: list.data.summary?.totalRoles,
            icon: UsersRound,
            horizontal: true,
            valueFirst: true,
            tone: "blue",
          },
        ]}
      />
      <Alert>{error || list.error}</Alert>
      <Alert success>{notice}</Alert>
      <div className="access-detail-filters">
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
      <section
        className="access-detail-table access-catalog-table"
        aria-labelledby="team-catalog-title"
      >
        <h2 id="team-catalog-title">Team Catalog</h2>
        <div className="access-table-wrap">
          <table
            aria-busy={list.loading}
            className="access-table access-records"
          >
            <thead>
              <tr>
                <th>Team</th>
                <th>Description</th>
                <th title="Distinct roles assigned to this team's members; not a permission scope">
                  Member Roles
                </th>
                <th>Members</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <TableState
                loading={list.loading && !list.data.items.length}
                error={list.error}
                empty={!list.data.items.length}
                columns={6}
              />
              {!list.error &&
                list.data.items.map((t) => (
                  <tr key={t.id}>
                    <td>
                      <strong>{t.name}</strong>
                      <p className="access-muted">{t.code}</p>
                      {t.department && (
                        <p className="access-muted">{t.department.name}</p>
                      )}
                    </td>
                    <td>{t.description || "—"}</td>
                    <td>{t.memberRoleCount ?? "—"}</td>
                    <td>{t.memberCount}</td>
                    <td>
                      <StatusBadge active={t.isActive} />
                    </td>
                    <td>
                      <div className="access-actions">
                        <button
                          className="access-icon-action"
                          aria-label="Edit"
                          title={`Edit ${t.name}`}
                          onClick={() => setEditing(t)}
                        >
                          <Pencil size={17} />
                        </button>
                        <button
                          className="access-icon-action"
                          aria-label="Manage Members"
                          title={`Manage members of ${t.name}`}
                          onClick={() => setMembers(t)}
                        >
                          <UsersRound size={17} />
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
      </section>
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
          <AccessSelect
            ariaLabel="Department"
            disabled={loading}
            value={form.departmentId || ""}
            onChange={(value) => set("departmentId", value)}
            options={[
              { value: "", label: "No department" },
              ...departments.map((d) => ({
                value: d.id,
                label: d.name + (!d.isActive ? " (Inactive)" : ""),
              })),
            ]}
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
