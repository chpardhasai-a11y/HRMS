"use client";
import { useEffect, useState } from "react";
import { KeyRound, LockKeyhole } from "lucide-react";
import {
  accessApi,
  AccessPage,
  AccessSelect,
  Alert,
  SearchField,
  SummaryCards,
} from "../components";
import {
  filterBusinessGroups,
  catalogPermissionGroups,
} from "../business-permissions";

const moduleTone = (name) =>
  ["blue", "sky", "violet", "green", "orange"][
    Array.from(name).reduce((n, c) => n + c.charCodeAt(0), 0) % 5
  ];

export default function PermissionsPage() {
  const [catalog, setCatalog] = useState(null);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [section, setSection] = useState("");
  const [module, setModule] = useState("");
  const [action, setAction] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let live = true;
    setError("");
    accessApi("/roles/options")
      .then((data) => {
        if (live) setCatalog(data);
      })
      .catch((e) => {
        if (live) setError(e.message);
      });
    return () => {
      live = false;
    };
  }, [retry]);
  const groups = catalogPermissionGroups(catalog);
  const sectionGroups = groups.filter(
    (group) => !section || group.section === section,
  );
  const visible = filterBusinessGroups(sectionGroups, search, module)
    .map((group) => ({
      ...group,
      actions: group.actions.filter((p) => !action || p.label === action),
    }))
    .filter((group) => group.actions.length);
  const total = groups.reduce((n, group) => n + group.actions.length, 0);
  const shown = visible.reduce((n, group) => n + group.actions.length, 0);
  return (
    <AccessPage
      detail
      title="Permissions"
      description="Permissions available for each module: Create, Read, Update, Delete and specific approval or workflow actions."
    >
      <SummaryCards
        items={[
          {
            label: "Permissions",
            value: catalog ? total : undefined,
            icon: KeyRound,
            horizontal: true,
          },
          {
            label: "Modules",
            value: catalog ? groups.length : undefined,
            icon: KeyRound,
            horizontal: true,
            tone: "blue",
          },
        ]}
      />
      <Alert>{error}</Alert>
      {error && (
        <button
          className="btn btn-secondary"
          onClick={() => setRetry((n) => n + 1)}
        >
          Retry
        </button>
      )}
      <div className="access-detail-filters">
        <SearchField
          label="Search permissions"
          value={search}
          onChange={setSearch}
        />
        <AccessSelect
          ariaLabel="Filter by section"
          value={section}
          onChange={(value) => {
            setSection(value);
            setModule("");
          }}
          options={[
            { value: "", label: "All sections" },
            ...[...new Set(groups.map((g) => g.section))].map((label) => ({
              value: label,
              label,
            })),
          ]}
        />
        <AccessSelect
          ariaLabel="Filter by module"
          value={module}
          onChange={setModule}
          options={[
            { value: "", label: "All modules" },
            ...sectionGroups.map((g) => ({ value: g.id, label: g.label })),
          ]}
        />
        <AccessSelect
          ariaLabel="Filter by action"
          value={action}
          onChange={setAction}
          options={[
            { value: "", label: "All actions" },
            ...[
              ...new Set(groups.flatMap((g) => g.actions.map((p) => p.label))),
            ].map((label) => ({ value: label, label })),
          ]}
        />
        <span className="access-result-count" aria-live="polite">
          {catalog
            ? `${shown} of ${total} permissions`
            : "Loading permissions…"}
        </span>
      </div>
      <div className="access-detail-table">
        <div className="access-table-wrap">
          <table
            className="access-table access-permission-list"
            aria-label="Permissions"
          >
            <thead>
              <tr>
                <th scope="col">Permission Name</th>
                <th scope="col">Code</th>
                <th scope="col">Section</th>
                <th scope="col">Module</th>
                <th scope="col">Action</th>
                <th scope="col">Description</th>
              </tr>
            </thead>
            <tbody>
              {!catalog && !error && (
                <tr>
                  <td colSpan={6}>Loading permissions…</td>
                </tr>
              )}
              {catalog && !visible.length && (
                <tr>
                  <td colSpan={6}>No records found.</td>
                </tr>
              )}
              {visible.map((group) =>
                group.actions.map((permission) => (
                  <tr key={permission.id}>
                    <td>
                      <strong>{permission.id}</strong>
                    </td>
                    <td>
                      <code className="access-code-chip">{permission.id}</code>
                    </td>
                    <td>{group.section}</td>
                    <td>
                      <span
                        className={`access-module-tag access-accent-${moduleTone(group.label)}`}
                      >
                        {group.label}
                      </span>
                    </td>
                    <td>
                      <span className="access-action-tag">
                        {permission.label}
                      </span>
                    </td>
                    <td>
                      <p className="access-permission-explanation">
                        {permission.description}
                      </p>
                      <p className="access-permission-context">
                        {group.description}
                      </p>
                      {group.assignable === false && (
                        <small className="access-admin-only">
                          Organization administrator only.
                        </small>
                      )}
                    </td>
                  </tr>
                )),
              )}
            </tbody>
          </table>
        </div>
      </div>
      <p className="access-readonly-caption">
        <LockKeyhole size={14} /> Assign organization permissions through Roles.
        Access Control permissions are reserved for organization administrators.
        Existing ownership and approval rules continue to apply.
      </p>
    </AccessPage>
  );
}
