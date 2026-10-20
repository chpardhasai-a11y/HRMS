"use client";
import { useState } from "react";
import { KeyRound, LockKeyhole } from "lucide-react";
import {
  AccessPage,
  Alert,
  Pager,
  SearchField,
  SummaryCards,
  TableState,
  useAccessList,
  useDebounced,
} from "../components";
const moduleTone = (name) =>
  ["blue", "sky", "violet", "green", "orange"][
    Array.from(name).reduce((n, c) => n + c.charCodeAt(0), 0) % 5
  ];
export default function PermissionsPage() {
  const [search, setSearch] = useState(""),
    [module, setModule] = useState(""),
    [action, setAction] = useState(""),
    [page, setPage] = useState(1);
  const list = useAccessList("/permissions", {
    search: useDebounced(search),
    module,
    action,
    page,
  });
  return (
    <AccessPage
      detail
      title="Permissions"
      description="Browse grouped system permissions and their access restrictions."
    >
      <SummaryCards
        items={[
          {
            label: "Total permissions",
            value: list.data.catalogTotal,
            icon: KeyRound,
            horizontal: true,
          },
          {
            label: "Modules",
            value: list.data.modules?.length,
            icon: KeyRound,
            horizontal: true,
            tone: "blue",
          },
          {
            label: "Actions",
            value: list.data.actions?.length,
            icon: KeyRound,
            horizontal: true,
            tone: "violet",
          },
        ]}
      />
      <Alert>{list.error}</Alert>
      <div className="access-detail-filters">
        <SearchField
          label="Search permissions"
          placeholder="Search permissions…"
          value={search}
          onChange={(v) => {
            setSearch(v);
            setPage(1);
          }}
        />
        <select
          aria-label="Filter by module"
          value={module}
          onChange={(e) => {
            setModule(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All modules</option>
          {list.data.modules?.map((m) => (
            <option key={m}>{m}</option>
          ))}
        </select>
        <select
          aria-label="Filter by action"
          value={action}
          onChange={(e) => {
            setAction(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All actions</option>
          {list.data.actions?.map((a) => (
            <option key={a}>{a}</option>
          ))}
        </select>
        <span className="access-result-count" aria-live="polite">
          {list.loading
            ? "Loading permissions…"
            : `${list.data.total} of ${list.data.catalogTotal ?? "—"} permissions`}
        </span>
        {list.error && (
          <button className="btn btn-secondary" onClick={list.reload}>
            Retry
          </button>
        )}
      </div>
      <div className="access-detail-table">
        <div className="access-table-wrap">
          <table className="access-table access-permission-catalog">
            <thead>
              <tr>
                {[
                  "Permission Name",
                  "Code",
                  "Module",
                  "Scope",
                  "Action",
                  "Description",
                ].map((h) => (
                  <th key={h} scope="col">
                    {h}
                  </th>
                ))}
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
                list.data.items.map((p) => (
                  <tr key={p.key}>
                    <td>
                      <strong>{p.name}</strong>
                      {p.status !== "Available" && <small>{p.status}</small>}
                    </td>
                    <td>
                      <code className="access-code-chip">{p.key}</code>
                    </td>
                    <td>
                      <span
                        className={`access-module-tag access-accent-${moduleTone(p.module)}`}
                      >
                        {p.module}
                      </span>
                    </td>
                    <td>
                      <span className="access-muted">{p.scope}</span>
                    </td>
                    <td>
                      <span className="access-action-tag">{p.action}</span>
                    </td>
                    <td>
                      <details className="access-permission-description">
                        <summary title={p.description}>{p.description}</summary>
                        <div>
                          <p>{p.description}</p>
                          {p.roles.length > 0 && (
                            <p>Account types: {p.roles.join(", ")}</p>
                          )}
                          {p.endpoint && <code>{p.endpoint}</code>}
                        </div>
                      </details>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        <Pager page={page} total={list.data.total} onChange={setPage} />
      </div>
      <p className="access-readonly-caption">
        <LockKeyhole size={14} />
        Permissions are maintained by the application. This catalog is read-only
        and does not grant access.
      </p>
    </AccessPage>
  );
}
