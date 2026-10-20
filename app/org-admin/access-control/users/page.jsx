"use client";
import { useEffect, useState } from "react";
import {
  Eye,
  EyeOff,
  UserPlus,
  UserRoundMinus,
  CircleCheck,
  Download,
  RefreshCw,
  UserRoundCog,
} from "lucide-react";
import { getStoredUser } from "../../../lib/hrmsApi";
import {
  AccessPage,
  Alert,
  Dialog,
  Pager,
  SearchField,
  StatusBadge,
  SummaryCards,
  StatusTabs,
  exportAccessCsv,
  TableState,
  accessApi,
  useAccessList,
  useOverviewCreate,
  RowMenu,
  useDebounced,
} from "../components";
export default function UsersPage() {
  const [search, setSearch] = useState(""),
    [status, setStatus] = useState("active"),
    [roleFilter, setRoleFilter] = useState(""),
    [exporting, setExporting] = useState(false),
    [page, setPage] = useState(1),
    [editing, setEditing] = useState(null),
    [reset, setReset] = useState(null),
    [viewing, setViewing] = useState(null),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false);
  const clearCreateShortcut = useOverviewCreate(() =>
    setEditing({
      email: "",
      role: "employee",
      employeeCode: "",
      isActive: true,
      accessRoles: [],
    }),
  );
  const filters = {
    search: useDebounced(search),
    status: status === "recent" ? "active" : status,
    activity: status === "recent" ? "recent" : "",
    roleId: roleFilter.startsWith("account:") ? "" : roleFilter,
    accountType: roleFilter.startsWith("account:") ? roleFilter.slice(8) : "",
  };
  const list = useAccessList("/users", { ...filters, page });

  const summary = list.data.summary;
  async function exportUsers() {
    setExporting(true);
    setError("");
    try {
      await exportAccessCsv(
        "/users",
        filters,
        [
          { label: "Name", value: (u) => u.employee?.name || "" },
          { label: "Email", value: (u) => u.email },
          { label: "Account type", value: (u) => u.role },
          {
            label: "Roles",
            value: (u) => u.accessRoles.map((a) => a.role.name).join("; "),
          },
          {
            label: "Teams",
            value: (u) => u.teams?.map((t) => t.name).join("; "),
          },
          {
            label: "Reporting to",
            value: (u) => u.managers?.map((m) => m.name).join("; "),
          },
          {
            label: "Status",
            value: (u) => (u.isActive ? "Active" : "Inactive"),
          },
          {
            label: "Last login date (UTC)",
            value: (u) => u.lastLoginAt || "Never",
          },
        ],
        "hrms-users.csv",
      );
    } catch (e) {
      setError(e.message);
    } finally {
      setExporting(false);
    }
  }
  const current = getStoredUser();
  async function change(u) {
    setBusy(true);
    setError("");
    try {
      await accessApi(`/users/${u.id}/status`, "PATCH", {
        isActive: !u.isActive,
        updatedAt: u.updatedAt,
      });
      list.reload();
      setNotice("Account status updated.");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <AccessPage
      detail
      title="Users"
      description="Manage organization users, account status, and role assignments."
      actions={
        <>
          <button
            className="btn btn-secondary"
            onClick={exportUsers}
            disabled={exporting || list.loading || !!list.error}
          >
            <Download size={16} />
            {exporting ? "Exporting…" : "Export"}
          </button>
          <button
            className="btn btn-secondary"
            onClick={list.reload}
            disabled={list.loading}
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
                email: "",
                role: "employee",
                employeeCode: "",
                isActive: true,
                accessRoles: [],
              })
            }
          >
            <UserPlus size={16} /> Add User
          </button>
        </>
      }
    >
      <SummaryCards
        items={[
          {
            label: "Active Users",
            value: summary?.active,
            icon: CircleCheck,
            tone: "green",
          },
          {
            label: "Inactive Users",
            value: summary?.inactive,
            icon: UserRoundMinus,
          },
        ]}
      />
      <Alert>{error || list.error}</Alert>
      <Alert success>{notice}</Alert>
      <div className="access-detail-filters">
        <SearchField
          label="Search users"
          placeholder={`Search ${status === "inactive" ? "inactive" : status === "recent" ? "recently active" : "active"} users…`}
          value={search}
          onChange={(v) => {
            setSearch(v);
            setPage(1);
          }}
        />
        <select
          aria-label="Filter users by role"
          value={roleFilter}
          onChange={(e) => {
            setRoleFilter(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All roles</option>
          <optgroup label="Account types">
            <option value="account:employee">Employee</option>
            <option value="account:org_admin">
              Organization administrator
            </option>
          </optgroup>
          <optgroup label="Custom roles">
            {list.data.roleOptions?.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
                {!r.isActive ? " (Inactive)" : ""}
              </option>
            ))}
          </optgroup>
        </select>
        {list.error && (
          <button className="btn btn-secondary" onClick={list.reload}>
            Retry
          </button>
        )}
      </div>
      <p className="access-filter-result" aria-live="polite">
        {list.loading
          ? "Loading users…"
          : `${list.data.total} ${status === "inactive" ? "inactive" : status === "recent" ? "recently active" : "active"} users found`}
      </p>
      <StatusTabs
        label="User status"
        value={status}
        onChange={(v) => {
          setStatus(v);
          setPage(1);
        }}
        items={[
          { value: "active", label: "Active", count: summary?.active },
          { value: "inactive", label: "Inactive", count: summary?.inactive },
          { value: "recent", label: "Recently Active", count: summary?.recent },
        ]}
      />
      {status === "recent" && (
        <p className="access-muted">
          Active accounts with a successful sign-in in the last 30 days.
        </p>
      )}
      <div className="access-detail-table">
        <div className="access-table-wrap">
          <table className="access-table access-users-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Team</th>
                <th>Reporting To</th>
                <th>Last Login Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <TableState
                loading={list.loading}
                error={list.error}
                empty={!list.data.items.length}
                columns={7}
              />
              {!list.loading &&
                !list.error &&
                list.data.items.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <strong>{u.employee?.name || "—"}</strong>
                      <p className="access-muted">
                        {u.employeeCode || "No employee linked"}
                        {current?.id === u.id ? " · You" : ""}
                      </p>
                    </td>
                    <td className="access-user-email">{u.email}</td>
                    <td>
                      <div className="access-role-tags">
                        {u.accessRoles.length ? (
                          u.accessRoles.map(({ role: r }) => (
                            <span key={r.id} className="access-role-tag">
                              {r.name}
                              {!r.isActive ? " · Inactive" : ""}
                            </span>
                          ))
                        ) : (
                          <span className="access-role-tag">
                            {u.role === "org_admin"
                              ? "Organization administrator"
                              : "Employee"}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="access-muted">
                      {u.teams?.length
                        ? u.teams
                            .map(
                              (t) => t.name + (t.isActive ? "" : " (Inactive)"),
                            )
                            .join(", ")
                        : "—"}
                    </td>
                    <td className="access-muted">
                      {u.managers?.length
                        ? u.managers.map((m) => m.name).join(", ")
                        : "—"}
                    </td>
                    <td>
                      {u.lastLoginAt
                        ? new Date(u.lastLoginAt).toLocaleString("en-IN")
                        : "Never"}
                    </td>
                    <td>
                      <div className="access-actions">
                        <button
                          className="access-icon-action"
                          aria-label="Edit User"
                          title="Edit User"
                          onClick={() => setEditing(u)}
                        >
                          <UserRoundCog size={18} />
                        </button>
                        <RowMenu
                          label={`Actions for ${u.email}`}
                          items={[
                            {
                              label: "View Access",
                              onClick: () => setViewing(u),
                            },
                            {
                              label: u.isActive ? "Deactivate" : "Activate",
                              disabled: busy || current?.id === u.id,
                              onClick: () => change(u),
                            },
                            {
                              label: "Reset Password",
                              disabled: current?.id === u.id,
                              onClick: () => setReset(u),
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
      </div>
      {editing && (
        <UserForm
          initial={editing}
          self={current?.id === editing.id}
          onClose={() => {
            clearCreateShortcut();
            setEditing(null);
          }}
          onSaved={() => {
            clearCreateShortcut();
            setEditing(null);
            list.reload();
            setNotice(
              "User saved. Changes to an existing account revoke its sessions.",
            );
          }}
        />
      )}
      {reset && (
        <PasswordForm
          user={reset}
          onClose={() => setReset(null)}
          onSaved={() => {
            setReset(null);
            list.reload();
            setNotice(
              "Password reset. Existing sessions and reset links were revoked.",
            );
          }}
        />
      )}
      {viewing && (
        <UserAccess user={viewing} onClose={() => setViewing(null)} />
      )}
    </AccessPage>
  );
}
function PasswordInput({ label, value, onChange }) {
  const [show, setShow] = useState(false);
  return (
    <label className="access-field">
      {label}
      <span className="access-password">
        <input
          required
          type={show ? "text" : "password"}
          minLength={12}
          maxLength={72}
          autoComplete="new-password"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        <button
          type="button"
          className="btn btn-secondary"
          aria-label={show ? "Hide password" : "Show password"}
          onClick={() => setShow(!show)}
        >
          {show ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </span>
      <small className="access-muted">
        At least 12 characters. Share the initial password securely with the
        user.
      </small>
    </label>
  );
}
function UserForm({ initial, self, onClose, onSaved }) {
  const [form, setForm] = useState({
      ...initial,
      roleIds: initial.accessRoles.map((m) => m.role.id),
      password: "",
    }),
    [loading, setLoading] = useState(!!initial.id),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [roleSearch, setRoleSearch] = useState(""),
    [rolePage, setRolePage] = useState(1),
    [employeeSearch, setEmployeeSearch] = useState(""),
    [employeePage, setEmployeePage] = useState(1);
  const roles = useAccessList("/roles", {
      search: useDebounced(roleSearch),
      page: rolePage,
      pageSize: 10,
    }),
    employees = useAccessList("/employees/options", {
      search: useDebounced(employeeSearch),
      page: employeePage,
      pageSize: 10,
    });
  useEffect(() => {
    if (!initial.id) return;
    let live = true;
    accessApi(`/users/${initial.id}/detail`)
      .then((u) => {
        if (live)
          setForm({
            ...u,
            roleIds: u.accessRoles.map((m) => m.role.id),
            password: "",
          });
      })
      .catch((e) => {
        if (live) setError(e.message);
      })
      .finally(() => {
        if (live) setLoading(false);
      });
    return () => {
      live = false;
    };
  }, [initial]);
  const change = (key, value) => setForm((f) => ({ ...f, [key]: value }));
  async function save(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await accessApi(
        `/users${form.id ? `/${form.id}` : ""}`,
        form.id ? "PATCH" : "POST",
        {
          email: form.email,
          role: form.role,
          employeeCode: form.employeeCode || "",
          roleIds: form.roleIds,
          isActive: form.isActive,
          ...(form.id
            ? { updatedAt: form.updatedAt }
            : { password: form.password }),
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
      title={initial.id ? "Edit User" : "Add User"}
      onClose={() => {
        if (!busy) onClose();
      }}
    >
      <Alert>{error || roles.error || employees.error}</Alert>
      {loading ? (
        <p>Loading account…</p>
      ) : (
        <form className="access-form" onSubmit={save}>
          <label className="access-field">
            Login email
            <input
              type="email"
              required
              maxLength={254}
              value={form.email}
              onChange={(e) => change("email", e.target.value)}
            />
          </label>
          <label className="access-field">
            Account type
            <select
              value={form.role}
              disabled={self}
              onChange={(e) => change("role", e.target.value)}
            >
              <option value="employee">Employee</option>
              <option value="org_admin">Organization administrator</option>
            </select>
          </label>
          <label className="access-check">
            <input
              type="checkbox"
              disabled={self}
              checked={form.isActive}
              onChange={(e) => change("isActive", e.target.checked)}
            />{" "}
            Active
          </label>
          {!initial.id && (
            <PasswordInput
              label="Initial password"
              value={form.password}
              onChange={(v) => change("password", v)}
            />
          )}
          <section>
            <h3>Employee link (optional)</h3>
            <div className="access-actions">
              <span>{form.employeeCode || "No employee linked"}</span>
              {form.employeeCode && (
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => change("employeeCode", "")}
                >
                  Clear link
                </button>
              )}
            </div>
            <p className="access-muted">
              Links an existing employee record. Updating the login email does
              not change the employee record.
            </p>
            <SearchField
              label="Search employees"
              value={employeeSearch}
              onChange={(v) => {
                setEmployeeSearch(v);
                setEmployeePage(1);
              }}
            />
            <ul className="access-member-list">
              {employees.loading ? (
                <li>Loading…</li>
              ) : employees.data.items.length ? (
                employees.data.items.map((e) => (
                  <li key={e.code}>
                    <div>
                      {e.name}
                      <small>
                        {e.code} · {e.email}
                      </small>
                    </div>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      disabled={e.users.some((u) => u.id !== initial.id)}
                      onClick={() => change("employeeCode", e.code)}
                      aria-label={`Link ${e.code}`}
                    >
                      {form.employeeCode === e.code
                        ? "Selected"
                        : e.users.some((u) => u.id !== initial.id)
                          ? "Already linked"
                          : "Link"}
                    </button>
                  </li>
                ))
              ) : (
                <li>No employees found.</li>
              )}
            </ul>
            <Pager
              page={employeePage}
              total={employees.data.total}
              pageSize={10}
              onChange={setEmployeePage}
            />
          </section>
          <section>
            <h3>Custom roles · {form.roleIds.length} selected</h3>
            <p className="access-muted">
              {form.role === "org_admin"
                ? "Organization administrators already have full organization access."
                : "Select roles to grant additional organization capabilities."}
            </p>
            <SearchField
              label="Search available roles"
              value={roleSearch}
              onChange={(v) => {
                setRoleSearch(v);
                setRolePage(1);
              }}
            />
            <div className="access-permission-options">
              {roles.loading ? (
                <p>Loading…</p>
              ) : roles.data.items.length ? (
                roles.data.items.map((r) => (
                  <label className="access-permission-option" key={r.id}>
                    <input
                      type="checkbox"
                      disabled={!r.isActive && !form.roleIds.includes(r.id)}
                      checked={form.roleIds.includes(r.id)}
                      onChange={(e) =>
                        change(
                          "roleIds",
                          e.target.checked
                            ? [...form.roleIds, r.id]
                            : form.roleIds.filter((id) => id !== r.id),
                        )
                      }
                    />
                    <span>
                      <strong>
                        {r.name} · L{r.level.number}
                      </strong>
                      <small>
                        {r.permissionKeys.length} permissions
                        {!r.isActive ? " · Inactive" : ""}
                      </small>
                    </span>
                  </label>
                ))
              ) : (
                <p>No roles found. Create a role in Roles Management.</p>
              )}
            </div>
            <Pager
              page={rolePage}
              total={roles.data.total}
              pageSize={10}
              onChange={setRolePage}
            />
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
            <button
              className="btn btn-primary"
              disabled={busy || !!roles.error || !!employees.error}
            >
              {busy ? "Saving…" : "Save User"}
            </button>
          </div>
        </form>
      )}
    </Dialog>
  );
}
function PasswordForm({ user, onClose, onSaved }) {
  const [password, setPassword] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function save(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await accessApi(`/users/${user.id}/password`, "POST", {
        password,
        updatedAt: user.updatedAt,
      });
      onSaved();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog
      title="Reset Password"
      onClose={() => {
        if (!busy) onClose();
      }}
    >
      <Alert>{error}</Alert>
      <p>
        Set a new password for {user.email}. Existing sessions and password
        reset links will expire.
      </p>
      <form className="access-form" onSubmit={save}>
        <PasswordInput
          label="New password"
          value={password}
          onChange={setPassword}
        />
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
            {busy ? "Resetting…" : "Reset Password"}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
function UserAccess({ user, onClose }) {
  const [detail, setDetail] = useState(null),
    [options, setOptions] = useState(null),
    [error, setError] = useState("");
  useEffect(() => {
    let live = true;
    Promise.all([
      accessApi(`/users/${user.id}/detail`),
      accessApi("/roles/options"),
    ])
      .then(([u, o]) => {
        if (live) {
          setDetail(u);
          setOptions(o);
        }
      })
      .catch((e) => {
        if (live) setError(e.message);
      });
    return () => {
      live = false;
    };
  }, [user]);
  const keys = [
    ...new Set(
      detail?.accessRoles
        .filter((m) => m.role.isActive)
        .flatMap((m) => m.role.permissionKeys) || [],
    ),
  ];
  return (
    <Dialog title="User Access" onClose={onClose}>
      <Alert>{error}</Alert>
      {detail ? (
        <>
          <h3>{detail.email}</h3>
          <StatusBadge active={detail.isActive} />
          <p>
            {!detail.isActive
              ? "This account is inactive and cannot sign in."
              : detail.role === "org_admin"
                ? "Full organization administrator access."
                : "Employee self-service plus the permissions below. Workflow task eligibility and ownership restrictions still apply."}
          </p>
          <div className="access-role-tags">
            {detail.accessRoles.map(({ role: r }) => (
              <span className="badge badge-neutral" key={r.id}>
                {r.name} · L{r.level.number}
                {!r.isActive ? " · Inactive" : ""}
              </span>
            ))}
          </div>
          <h3>Active custom role permissions ({keys.length})</h3>
          <ul className="access-access-list">
            {keys.map((k) => (
              <li key={k}>
                {options?.permissions.find((p) => p.key === k)?.name || k}
                <small>{k}</small>
              </li>
            ))}
          </ul>
          {!keys.length && (
            <p className="access-muted">No additional custom permissions.</p>
          )}
        </>
      ) : (
        <p>Loading account access…</p>
      )}
    </Dialog>
  );
}
