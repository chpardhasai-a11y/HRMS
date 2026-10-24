"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  KeyRound,
  Layers,
  ListTree,
  Plus,
  ShieldCheck,
  UserPlus,
  UsersRound,
} from "lucide-react";
import { AccessPage, Alert, accessApi } from "./components";

import {
  catalogPermissionGroups,
  rolePermissionCount,
} from "./business-permissions";

const cards = [
  {
    slug: "users",
    title: "Users",
    icon: UsersRound,
    color: "blue",
    description:
      "Manage organization users, account status, and role assignments.",
    metric: "users",
    unit: "active users",
  },
  {
    slug: "roles",
    title: "Roles",
    icon: ShieldCheck,
    color: "green",
    description:
      "Maintain role definitions, hierarchy levels, and permission bundles.",
    metric: "roles",
    unit: "active roles",
  },
  {
    slug: "permissions",
    title: "Permissions",
    icon: KeyRound,
    color: "violet",
    description: "View module permissions and what each permission allows.",
    metric: "permissions",
    unit: "permissions",
  },
  {
    slug: "levels",
    title: "Levels",
    icon: ListTree,
    color: "sky",
    description: "Manage ordered hierarchy ranks used by organization roles.",
    metric: "levels",
    unit: "active levels",
  },
  {
    slug: "teams",
    title: "Teams",
    icon: Layers,
    color: "orange",
    description:
      "Manage department teams and the people assigned to each team.",
    metric: "teams",
    unit: "active teams",
  },
];
const metrics = [
  { key: "users", label: "Active users", color: "blue" },
  { key: "roles", label: "Active roles", color: "green" },
  { key: "teams", label: "Teams", color: "orange" },
  { key: "levels", label: "Levels", color: "sky" },
  { key: "permissions", label: "Permissions", color: "violet" },
  { key: "grants", label: "Role permissions", color: "pink" },
];
export default function AccessControlOverview() {
  const [data, setData] = useState(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [users, roles, teams, levels, permissions] = await Promise.all([
        accessApi("/users?status=active&pageSize=1"),
        accessApi("/roles?status=active&pageSize=100"),
        accessApi("/teams?status=active&pageSize=1"),
        accessApi("/levels?status=active&pageSize=1"),
        accessApi("/roles/options"),
      ]);
      const remaining = await Promise.all(
        Array.from(
          { length: Math.max(0, Math.ceil(roles.total / 100) - 1) },
          (_, i) =>
            accessApi(`/roles?status=active&pageSize=100&page=${i + 2}`),
        ),
      );
      const groups = catalogPermissionGroups(permissions);
      setData({
        users: users.total,
        roles: roles.total,
        teams: teams.total,
        levels: levels.total,
        permissions: groups.reduce((n, g) => n + g.actions.length, 0),
        grants: [roles, ...remaining]
          .flatMap((p) => p.items)
          .reduce((n, r) => n + rolePermissionCount(r), 0),
      });
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);
  const number = (key) =>
    loading
      ? null
      : data
        ? new Intl.NumberFormat("en-IN").format(data[key])
        : "—";
  return (
    <AccessPage
      overview
      title="Access Control"
      description="Manage users, roles, permissions, and effective access from one secure workspace."
      actions={
        <>
          <Link
            href="/org-admin/access-control/roles?create=1"
            className="btn btn-secondary"
          >
            <Plus size={17} />
            Create Role
          </Link>
          <Link
            href="/org-admin/access-control/users?create=1"
            className="btn btn-primary"
          >
            <UserPlus size={17} />
            Add User
          </Link>
        </>
      }
    >
      <Alert>{error}</Alert>
      {error && (
        <button
          className="btn btn-secondary access-overview-retry"
          onClick={load}
        >
          Retry summary
        </button>
      )}
      <section
        className="access-stat-grid"
        aria-label="Access Control summary"
        aria-busy={loading}
      >
        {metrics.map((m) => (
          <div
            key={m.key}
            className={`access-stat access-accent-${m.color}`}
            title={
              m.key === "grants"
                ? "Permissions assigned across active roles"
                : m.key === "teams" || m.key === "levels"
                  ? "Active records in your organization"
                  : undefined
            }
          >
            <span>{m.label}</span>
            {loading ? (
              <span className="access-skeleton access-skeleton-number" />
            ) : (
              <strong>{number(m.key)}</strong>
            )}
          </div>
        ))}
      </section>
      <section
        className="access-module-grid"
        aria-label="Access Control modules"
      >
        {cards.map(
          ({ slug, title, icon: Icon, color, description, metric, unit }) => (
            <article
              className={`access-module-card access-accent-${color}`}
              key={slug}
            >
              <Link
                href={`/org-admin/access-control/${slug}`}
                aria-label={`Open ${title}`}
              >
                <span className="access-module-icon">
                  <Icon size={25} strokeWidth={1.8} />
                </span>
                <h2>{title}</h2>
                <p>{description}</p>
                <footer>
                  <span>
                    {loading ? (
                      <span className="access-skeleton access-skeleton-caption" />
                    ) : (
                      `${number(metric)} ${unit}`
                    )}
                  </span>
                  <span className="access-module-open">
                    Open <ArrowRight size={15} />
                  </span>
                </footer>
              </Link>
            </article>
          ),
        )}
      </section>
    </AccessPage>
  );
}
