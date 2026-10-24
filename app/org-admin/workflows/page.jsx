"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Plus,
  Search,
  ArrowUpRight,
  GitBranch,
  MoreHorizontal,
  Copy,
  Archive,
  Play,
  LayoutTemplate,
  Layers,
  FileText,
  Trash2,
} from "lucide-react";
import { flow, actionKey, dateTime } from "./components/api";
import { Badge, ErrorBox, Empty, Loading, Modal, Field } from "./components/ui";
import { RuntimeForm } from "./components/forms";
export default function WorkflowsPage() {
  const router = useRouter(),
    [rows, setRows] = useState([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [search, setSearch] = useState(""),
    [filter, setFilter] = useState("All"),
    [create, setCreate] = useState(false),
    [name, setName] = useState(""),
    [busy, setBusy] = useState(false),
    [start, setStart] = useState(null),
    [data, setData] = useState({}),
    [binding, setBinding] = useState(null),
    [bound, setBound] = useState([]),
    [removeTarget, setRemoveTarget] = useState(null);
  async function load() {
    try {
      setError("");
      const [r, b] = await Promise.all([
        flow(),
        flow("/bindings").catch(() => []),
      ]);
      setRows(r);
      setBound(b);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, []);
  async function run(fn) {
    setBusy(true);
    setError("");
    try {
      await fn();
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  const visible = rows.filter(
    (r) =>
      (filter === "All" || r.status === filter.toUpperCase()) &&
      r.name.toLowerCase().includes(search.toLowerCase()),
  );
  return (
    <>
      <div className="flow-page">
        <header className="flow-page-heading">
          <div>
            <h1>Workflows</h1>
            <p>Create, configure, and manage workflow processes.</p>
          </div>
          <div className="flow-actions">
            <Link href="/org-admin/workflows/templates" className="flow-button">
              <LayoutTemplate size={16} /> Browse templates
            </Link>
            <button
              className="flow-button primary"
              onClick={() => setCreate(true)}
            >
              <Plus size={17} /> Create workflow
            </button>
          </div>
        </header>
        <ErrorBox error={error} />
        <div className="flow-section-toolbar">
          <div className="flow-tabs">
            {["All", "Published", "Draft", "Archived"].map((v) => (
              <button
                className={filter === v ? "active" : ""}
                onClick={() => setFilter(v)}
                key={v}
              >
                {v}
                {v === "All" && <span>{rows.length}</span>}
              </button>
            ))}
          </div>
          <label className="flow-search">
            <Search size={16} />
            <input
              aria-label="Search workflows"
              placeholder="Search workflows…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
        </div>
        {loading ? (
          <Loading />
        ) : visible.length ? (
          <div className="flow-card-grid">
            {visible.map((r, index) => (
              <article className="flow-card" key={r.id}>
                <div className="flow-card-top">
                  <span
                    className={`flow-card-symbol flow-tint-${["violet", "blue", "green", "amber"][index % 4]}`}
                  >
                    <GitBranch size={22} />
                  </span>
                  <Badge>{r.status}</Badge>
                </div>
                <Link
                  className="flow-card-title"
                  href={`/org-admin/workflows/builder?id=${r.id}`}
                >
                  {r.name}
                  <ArrowUpRight size={18} />
                </Link>
                <p>
                  {r.description ||
                    "A configurable process, built around your team."}
                </p>
                <div className="flow-card-chips">
                  <span>{r.category}</span>
                  <span>
                    {r.versions[0]
                      ? `Version ${r.versions[0].number}`
                      : "Unpublished"}
                  </span>
                </div>
                <div className="flow-card-meta">
                  <span>
                    <GitBranch size={14} />
                    {r._count.instances} executions
                  </span>
                  <span>
                    Updated{" "}
                    {new Date(r.updatedAt).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                    })}
                  </span>
                </div>
                <footer>
                  <Link href={`/org-admin/workflows/builder?id=${r.id}`}>
                    Open builder <ArrowUpRight size={14} />
                  </Link>
                  <div>
                    <button
                      title="Duplicate"
                      aria-label={`Duplicate ${r.name}`}
                      disabled={busy}
                      onClick={() =>
                        run(async () => {
                          await flow(`/${r.id}/duplicate`, "POST", {});
                        })
                      }
                    >
                      <Copy size={16} />
                    </button>
                    {r.status === "PUBLISHED" && (
                      <>
                        <Link
                          href={`/org-admin/workflows/forms/${r.id}`}
                          title="Open request form"
                          aria-label={`Open ${r.name} request form`}
                        >
                          <FileText size={15} />
                        </Link>
                        <button
                          title="Bind to HR approvals"
                          aria-label={`Bind ${r.name}`}
                          onClick={() => setBinding(r)}
                        >
                          <Layers size={16} />
                        </button>
                        <button
                          title="Start workflow"
                          aria-label={`Start ${r.name}`}
                          onClick={async () => {
                            await run(async () => {
                              const d = await flow(`/${r.id}`);
                              setStart(d);
                              setData({});
                            });
                          }}
                        >
                          <Play size={16} />
                        </button>
                      </>
                    )}
                    <button
                      title="Archive"
                      aria-label={`Archive ${r.name}`}
                      disabled={busy || r.status === "ARCHIVED"}
                      onClick={() =>
                        run(() => flow(`/${r.id}/archive`, "POST", {}))
                      }
                    >
                      <Archive size={16} />
                    </button>
                    <button
                      className="flow-danger-action"
                      title="Delete"
                      aria-label={`Delete ${r.name}`}
                      disabled={busy}
                      onClick={() => setRemoveTarget(r)}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </footer>
              </article>
            ))}
            <button
              className="flow-create-card"
              onClick={() => setCreate(true)}
            >
              <span>
                <Plus size={24} />
              </span>
              <strong>Build something new</strong>
              <p>
                Start with a blank canvas.
                <br />
                Make it work your way.
              </p>
            </button>
          </div>
        ) : (
          <Empty
            title={
              search ? "No matching workflows" : "Your next process starts here"
            }
            action={
              <button
                className="flow-button primary"
                onClick={() => setCreate(true)}
              >
                <Plus size={16} /> Create workflow
              </button>
            }
          >
            Build from a blank canvas or choose a template.
          </Empty>
        )}
        <div className="flow-bottom-note">
          <span className="flow-online-dot" /> Published versions stay fixed for
          running executions. You can keep improving the draft.
        </div>
      </div>
      {create && (
        <Modal title="Create a workflow" onClose={() => setCreate(false)}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              run(async () => {
                const d = await flow("", "POST", { name });
                router.push(`/org-admin/workflows/builder?id=${d.id}`);
              });
            }}
          >
            <Field label="Workflow name">
              <input
                autoFocus
                required
                maxLength={160}
                placeholder="e.g. Purchase approval"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </Field>
            <p className="flow-muted">
              Start with a review process and customize every block.
            </p>
            <button className="flow-button primary" disabled={busy}>
              Create workflow <ArrowUpRight size={16} />
            </button>
          </form>
        </Modal>
      )}
      {start && (
        <Modal title={`Start ${start.name}`} onClose={() => setStart(null)}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              run(async () => {
                await flow(`/${start.id}/start`, "POST", {
                  key: actionKey(),
                  data,
                });
                setStart(null);
                router.push("/org-admin/workflows/monitoring");
              });
            }}
          >
            <RuntimeForm
              fields={start.versions[0].document.fields}
              data={data}
              definitionId={start.id}
              onChange={setData}
            />
            <button className="flow-button primary" disabled={busy}>
              <Play size={16} /> Start execution
            </button>
          </form>
        </Modal>
      )}
      {binding && (
        <Modal title="Connect HR approvals" onClose={() => setBinding(null)}>
          <p>
            New profile approval requests will run through{" "}
            <strong>{binding.name}</strong>. Queued requests can be started from
            the HR approvals screen.
          </p>
          {bound.find((b) => b.source === "profile_change") && (
            <p className="flow-muted">
              Current binding:{" "}
              {bound.find((b) => b.source === "profile_change").definition.name}
            </p>
          )}
          <button
            className="flow-button primary"
            disabled={busy}
            onClick={() =>
              run(async () => {
                await flow("/bindings", "POST", {
                  source: "profile_change",
                  definitionId: binding.id,
                });
                setBinding(null);
              })
            }
          >
            Bind published workflow
          </button>
        </Modal>
      )}
      {removeTarget && (
        <Modal
          title={`Delete ${removeTarget.name}?`}
          onClose={() => setRemoveTarget(null)}
        >
          <p>
            This permanently removes the workflow and its unpublished draft.
            Published workflows with executions must be archived instead.
          </p>
          <div className="flow-modal-actions">
            <button
              className="flow-button"
              type="button"
              onClick={() => setRemoveTarget(null)}
              disabled={busy}
            >
              Cancel
            </button>
            <button
              className="flow-button danger"
              type="button"
              disabled={busy}
              onClick={() =>
                run(async () => {
                  await flow(`/${removeTarget.id}`, "DELETE");
                  setRemoveTarget(null);
                })
              }
            >
              <Trash2 size={16} /> Delete workflow
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
