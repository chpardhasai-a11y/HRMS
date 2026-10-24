"use client";
import { useEffect, useRef } from "react";
import { CRED, selectionState } from "./business-permissions";

function PermissionAction({
  group,
  action,
  keys,
  onToggle,
  permissions,
  showSelection,
}) {
  const checkbox = useRef(null);
  const state = selectionState(action, keys);
  useEffect(() => {
    if (checkbox.current) checkbox.current.indeterminate = state === "partial";
  }, [state]);
  return (
    <div className="access-business-action">
      {onToggle ? (
        <label className="access-check">
          <input
            ref={checkbox}
            type="checkbox"
            aria-label={`${group.label}: ${action.label}`}
            aria-checked={state === "partial" ? "mixed" : state === "all"}
            checked={state === "all"}
            onChange={(event) => onToggle(action, event.target.checked)}
          />
          <span>{action.label}</span>
        </label>
      ) : (
        <strong>{action.label}</strong>
      )}
      {(onToggle || showSelection) && state === "partial" && (
        <small className="access-partial">Partial access</small>
      )}
      <details className="access-business-details">
        <summary>
          {state === "partial" && (onToggle || showSelection)
            ? "View partial access"
            : "Details"}
        </summary>
        <p>{action.description}</p>
        <ul>
          {action.permissionKeys.map((key) => {
            const permission = permissions.find((p) => p.key === key);
            return (
              <li key={key}>
                {permission?.name || key}
                {(onToggle || showSelection) && (
                  <span>
                    {" "}
                    · {keys.includes(key) ? "Granted" : "Not granted"}
                  </span>
                )}
                <code>{key}</code>
                {permission?.endpoint && <code>{permission.endpoint}</code>}
                {permission?.description && <p>{permission.description}</p>}
              </li>
            );
          })}
        </ul>
      </details>
    </div>
  );
}
export default function PermissionMatrix({
  groups,
  keys = [],
  onToggle,
  permissions = [],
  showSelection = false,
}) {
  return (
    <div className="access-table-wrap access-business-wrap">
      <table
        className="access-table access-business-matrix"
        aria-label="Permissions"
      >
        <thead>
          <tr>
            <th scope="col">Module</th>
            {["Create", "Read", "Update", "Delete", "Special permissions"].map(
              (label) => (
                <th scope="col" key={label}>
                  {label}
                </th>
              ),
            )}
          </tr>
        </thead>
        <tbody>
          {groups.length ? (
            groups.map((group) => (
              <tr key={group.id}>
                <th scope="row">
                  {group.label}
                  <p className="access-module-description">
                    {group.description}
                  </p>
                </th>
                {CRED.map((kind) => {
                  const action = group.actions.find((a) => a.kind === kind);
                  return (
                    <td key={kind}>
                      {action ? (
                        <PermissionAction
                          {...{
                            group,
                            action,
                            keys,
                            onToggle,
                            permissions,
                            showSelection,
                          }}
                        />
                      ) : (
                        "—"
                      )}
                    </td>
                  );
                })}
                <td>
                  {group.actions
                    .filter((a) => a.kind === "special")
                    .map((action) => (
                      <PermissionAction
                        key={action.id}
                        {...{
                          group,
                          action,
                          keys,
                          onToggle,
                          permissions,
                          showSelection,
                        }}
                      />
                    ))}
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={6}>No records found.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
