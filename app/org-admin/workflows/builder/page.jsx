"use client";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Handle,
  Position,
  applyNodeChanges,
  applyEdgeChanges,
  MarkerType,
  ReactFlowProvider,
  useReactFlow,
} from "@xyflow/react";
import dagre from "@dagrejs/dagre";
import "@xyflow/react/dist/style.css";
import {
  ArrowLeft,
  Plus,
  Search,
  Zap,
  GitBranch,
  UserCheck,
  Split,
  FileText,
  Clock,
  CircleCheck,
  CircleDot,
  X,
  Save,
  Play,
  Check,
  UploadCloud,
  Undo2,
  Redo2,
  LayoutDashboard,
  List,
  Trash2,
  History,
  ShieldCheck,
  Activity,
  Users,
  Settings2,
  ChevronDown,
} from "lucide-react";
import { flow, actionKey } from "../components/api";
import { Badge, ErrorBox, Field, Modal, Loading } from "../components/ui";
import {
  NodeConfig,
  GlobalConfig,
  categories,
} from "../components/configuration";
import { RuleEditor, RuntimeForm } from "../components/forms";
const icons = {
  trigger: Zap,
  state: CircleDot,
  task: UserCheck,
  decision: Split,
  form: FileText,
  automation: Zap,
  wait: Clock,
  fork: GitBranch,
  join: GitBranch,
  end: CircleCheck,
};
const colors = {
  trigger: "green",
  state: "violet",
  task: "blue",
  decision: "amber",
  form: "blue",
  automation: "violet",
  wait: "amber",
  fork: "rose",
  join: "rose",
  end: "green",
};
function CanvasNode({ data, selected }) {
  const n = data.node,
    Icon = icons[n.type] || CircleDot,
    basePorts = ["task", "form"].includes(n.type)
      ? [
          ...(n.config.actions || ["complete"]),
          ...(n.config.slaHours ? ["timeout"] : []),
        ]
      : n.type === "decision"
        ? ["condition", "default"]
        : n.type === "fork"
          ? ["branch-1", "branch-2"]
          : ["next"];
  const ports = [...new Set([...basePorts, ...(data.ports || [])])];
  return (
    <div className={`flow-node ${selected ? "selected" : ""}`}>
      <div className="flow-node-content">
        {n.type !== "trigger" && (
          <Handle type="target" position={Position.Left} />
        )}
        <span className={`flow-node-icon flow-tint-${colors[n.type]}`}>
          <Icon size={19} />
        </span>
        <div>
          <small>
            {n.type === "task" ? "HUMAN ACTION" : n.type.toUpperCase()}
          </small>
          <strong>{n.label}</strong>
          <p>
            {n.type === "task"
              ? `${n.config.approvalPolicy || "any"} · ${n.config.assignment?.kind || "Unassigned"}`
              : n.type === "trigger"
                ? (n.config.event || "manual").replace(".", " ")
                : n.type === "wait"
                  ? `${n.config.seconds || 0} seconds`
                  : n.type === "end"
                    ? "Finish execution"
                    : "Configure this block"}
          </p>
        </div>
      </div>
      {n.type !== "end" && (
        <div className="flow-node-ports">
          {ports.map((port, i) => (
            <div key={port}>
              <span>{port}</span>
              <Handle
                type="source"
                position={Position.Right}
                id={port}
                style={{ top: `${38 + i * 22}px` }}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
const nodeTypes = { flowNode: CanvasNode };
const clone = (v) => JSON.parse(JSON.stringify(v));
function Builder() {
  const params = useSearchParams(),
    router = useRouter(),
    rf = useReactFlow(),
    id = params.get("id"),
    [definition, setDefinition] = useState(null),
    [doc, setDoc] = useState(null),
    [saved, setSaved] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [selection, setSelection] = useState(null),
    [section, setSection] = useState(null),
    [paletteSearch, setPaletteSearch] = useState(""),
    [lookups, setLookups] = useState({
      users: [],
      departments: [],
      teams: [],
      memberships: [],
    }),
    [issues, setIssues] = useState(null),
    [test, setTest] = useState(false),
    [testData, setTestData] = useState({}),
    [notice, setNotice] = useState(""),
    [versions, setVersions] = useState(false),
    [listView, setListView] = useState(false),
    [paletteOpen, setPaletteOpen] = useState(false),
    [inspector, setInspector] = useState(true),
    [history, setHistory] = useState([]),
    [future, setFuture] = useState([]);
  const initialized = useRef(false),
    dragStart = useRef(null);
  useEffect(() => {
    if (window.matchMedia("(max-width:760px)").matches) {
      setListView(true);
      setInspector(false);
    }
    if (initialized.current) return;
    initialized.current = true;
    (async () => {
      try {
        let current = id;
        if (!current) {
          const created = await flow("", "POST", { name: "Untitled workflow" });
          router.replace(`/org-admin/workflows/builder?id=${created.id}`);
          current = created.id;
        }
        const [d, l] = await Promise.all([
          flow(`/${current}`),
          flow("/lookups"),
        ]);
        setDefinition(d);
        setDoc(d.draft);
        setSaved(
          JSON.stringify({
            document: d.draft,
            name: d.name,
            description: d.description,
            category: d.category,
          }),
        );
        setLookups(l);
      } catch (e) {
        setError(e.message);
      }
    })();
  }, [id]);
  const current =
      doc && definition
        ? JSON.stringify({
            document: doc,
            name: definition.name,
            description: definition.description,
            category: definition.category,
          })
        : "",
    dirty = current !== saved;
  useEffect(() => {
    if (!dirty || !doc) return;
    const guard = (e) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", guard);
    return () => window.removeEventListener("beforeunload", guard);
  }, [dirty, doc]);
  function change(next, record = true) {
    if (record && doc) {
      setHistory((h) => [...h.slice(-49), clone(doc)]);
      setFuture([]);
    }
    setDoc(next);
    setIssues(null);
  }
  function undo() {
    if (!history.length) return;
    setFuture((f) => [clone(doc), ...f]);
    setDoc(history[history.length - 1]);
    setHistory((h) => h.slice(0, -1));
  }
  function redo() {
    if (!future.length) return;
    setHistory((h) => [...h, clone(doc)]);
    setDoc(future[0]);
    setFuture((f) => f.slice(1));
  }
  async function perform(fn) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      return await fn();
    } catch (e) {
      setError(e.message);
      return null;
    } finally {
      setBusy(false);
    }
  }
  async function save() {
    const updated = await flow(`/${definition.id}`, "PUT", {
      revision: definition.revision,
      name: definition.name,
      description: definition.description,
      category: definition.category,
      document: doc,
    });
    setDefinition((d) => ({ ...d, ...updated }));
    setSaved(current);
    return updated;
  }
  async function publish() {
    await perform(async () => {
      const d = dirty ? await save() : definition;
      const result = await flow(`/${definition.id}/validate`, "POST", {});
      setIssues(result.issues);
      if (result.issues.length) return;
      await flow(`/${definition.id}/publish`, "POST", { revision: d.revision });
      const updated = await flow(`/${definition.id}`);
      setDefinition(updated);
      setIssues(null);
      setNotice(`Version ${updated.versions[0].number} published`);
    });
  }
  function add(type) {
    setPaletteOpen(false);
    const key = crypto.randomUUID(),
      count = doc.nodes.length;
    const config =
      type === "trigger"
        ? { event: "manual" }
        : type === "task" || type === "form"
          ? {
              assignment: { kind: "role", values: ["org_admin"] },
              actions:
                type === "task"
                  ? ["approve", "reject", "return"]
                  : ["complete"],
              approvalPolicy: "any",
              slaHours: 24,
            }
          : type === "wait"
            ? { seconds: 3600 }
            : type === "automation"
              ? { action: "notification" }
              : type === "join"
                ? { mode: "all" }
                : type === "end"
                  ? { state: doc.states.find((s) => s.terminal)?.id }
                  : {};
    const node = {
      id: key,
      type,
      label: {
        trigger: "Start workflow",
        state: "Update state",
        task: "Review request",
        decision: "Choose a path",
        form: "Collect information",
        automation: "Automate work",
        wait: "Wait",
        fork: "Parallel branches",
        join: "Join branches",
        end: "Finish workflow",
      }[type],
      position: {
        x: 180 + (count % 3) * 300,
        y: 100 + Math.floor(count / 3) * 180,
      },
      config,
    };
    change({ ...doc, nodes: [...doc.nodes, node] });
    setSelection({ kind: "node", id: key });
    setSection(null);
    setInspector(true);
  }
  const selectedNode = doc?.nodes.find(
      (n) => selection?.kind === "node" && n.id === selection.id,
    ),
    selectedEdge = doc?.edges.find(
      (e) => selection?.kind === "edge" && e.id === selection.id,
    );
  const updateNode = (n) =>
    change({ ...doc, nodes: doc.nodes.map((v) => (v.id === n.id ? n : v)) });
  const updateEdge = (p) =>
    change({
      ...doc,
      edges: doc.edges.map((e) =>
        e.id === selectedEdge.id ? { ...e, ...p } : e,
      ),
    });
  const nodes = (doc?.nodes || []).map((n) => ({
      id: n.id,
      type: "flowNode",
      position: n.position,
      data: {
        node: n,
        ports: doc.edges
          .filter((e) => e.source === n.id)
          .map((e) => e.port || "next"),
      },
      selected: selection?.kind === "node" && selection.id === n.id,
    })),
    edges = (doc?.edges || []).map((e) => ({
      ...e,
      label: e.label || e.port,
      sourceHandle: e.port,
      animated: false,
      type: "smoothstep",
      style: {
        stroke:
          selection?.id === e.id
            ? "var(--color-primary)"
            : "var(--color-neutral-300)",
        strokeWidth: 1.5,
      },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: "var(--color-neutral-300)",
      },
    }));
  function layout() {
    const graph = new dagre.graphlib.Graph();
    graph.setGraph({ rankdir: "LR", nodesep: 70, ranksep: 90 });
    graph.setDefaultEdgeLabel(() => ({}));
    doc.nodes.forEach((n) => graph.setNode(n.id, { width: 240, height: 150 }));
    doc.edges.forEach((e) => graph.setEdge(e.source, e.target));
    dagre.layout(graph);
    change({
      ...doc,
      nodes: doc.nodes.map((n) => ({
        ...n,
        position: { x: graph.node(n.id).x - 120, y: graph.node(n.id).y - 75 },
      })),
    });
    setTimeout(() => rf.fitView({ padding: 0.2 }), 50);
  }
  if (!doc)
    return (
      <div className="flow-page">
        <ErrorBox error={error} />
        {!error && <Loading />}
      </div>
    );
  return (
    <div className="flow-builder">
      <header className="flow-builder-header">
        <div className="flow-builder-identity">
          <Link href="/org-admin/workflows" title="Back to workflows">
            <ArrowLeft size={18} />
          </Link>
          <div>
            <input
              aria-label="Workflow name"
              value={definition.name}
              onChange={(e) =>
                setDefinition({ ...definition, name: e.target.value })
              }
            />
            <span>
              <Badge>{definition.status}</Badge>
              <small>{dirty ? "Unsaved changes" : "All changes saved"}</small>
            </span>
          </div>
        </div>
        <div className="flow-actions">
          <button
            className="flow-icon-button"
            title="Version history"
            onClick={() => setVersions(true)}
          >
            <History size={18} />
          </button>
          <button
            className="flow-button"
            aria-label="Save draft"
            title="Save draft"
            disabled={busy || !dirty}
            onClick={() => perform(save)}
          >
            <Save size={15} />
            <span>Save draft</span>
          </button>
          <button
            className="flow-button"
            aria-label="Test"
            title="Test workflow"
            disabled={busy}
            onClick={() => {
              setTest(true);
              setTestData({});
            }}
          >
            <Play size={15} />
            <span>Test</span>
          </button>
          <button
            className="flow-button primary"
            disabled={busy}
            onClick={publish}
          >
            <UploadCloud size={16} /> Publish
          </button>
        </div>
      </header>
      <div className="flow-builder-subbar">
        <div className="flow-tabs">
          <button
            className={!listView ? "active" : ""}
            onClick={() => setListView(false)}
          >
            Canvas
          </button>
          <button
            className={listView ? "active" : ""}
            onClick={() => setListView(true)}
          >
            Step list
          </button>
          <button
            onClick={() => {
              setSection("lifecycle");
              setSelection(null);
              setInspector(true);
            }}
          >
            Lifecycle
          </button>
        </div>
        <div className="flow-actions">
          <button
            className="flow-icon-button flow-mobile-add"
            aria-label="Open building blocks"
            onClick={() => {
              setPaletteOpen(!paletteOpen);
              setInspector(false);
            }}
          >
            <Plus size={16} />
          </button>
          <span className="flow-muted">
            {doc.nodes.length} blocks · {doc.edges.length} connections
          </span>
          <button
            className="flow-icon-button"
            title="Undo"
            disabled={!history.length}
            onClick={undo}
          >
            <Undo2 size={16} />
          </button>
          <button
            className="flow-icon-button"
            title="Redo"
            disabled={!future.length}
            onClick={redo}
          >
            <Redo2 size={16} />
          </button>
          <button className="flow-button small" onClick={layout}>
            <LayoutDashboard size={14} /> Auto layout
          </button>
          <button
            className="flow-icon-button"
            title="Toggle configuration"
            onClick={() => setInspector(!inspector)}
          >
            <Settings2 size={17} />
          </button>
        </div>
      </div>
      {error && <ErrorBox error={error} />}{" "}
      {notice && (
        <div className="flow-notice" role="status">
          <Check size={16} />
          {notice}
        </div>
      )}
      <div className="flow-builder-body">
        <aside className={`flow-palette ${paletteOpen ? "is-open" : ""}`}>
          <div className="flow-palette-heading">
            <h3>Building blocks</h3>
            <p>Everything your process needs.</p>
          </div>
          <label className="flow-search">
            <Search size={14} />
            <input
              value={paletteSearch}
              onChange={(e) => setPaletteSearch(e.target.value)}
              placeholder="Find a block…"
              aria-label="Find a block"
            />
          </label>
          {categories
            .filter((c) =>
              c.name.toLowerCase().includes(paletteSearch.toLowerCase()),
            )
            .map((c, i) => {
              const Icon =
                icons[c.id] ||
                {
                  lifecycle: CircleDot,
                  people: Users,
                  data: FileText,
                  governance: ShieldCheck,
                  time: Clock,
                  monitoring: Activity,
                }[c.id];
              return (
                <button
                  key={c.id}
                  className={`flow-palette-item ${section === c.id ? "active" : ""}`}
                  onClick={() => {
                    if (["trigger", "task", "decision"].includes(c.id))
                      add(c.id);
                    else {
                      setSection(c.id);
                      setSelection(null);
                      setInspector(true);
                      setPaletteOpen(false);
                    }
                  }}
                >
                  <span className={`flow-tint-${c.color}`}>
                    <Icon size={16} />
                  </span>
                  <div>
                    <strong>{c.name}</strong>
                    <small>{c.description}</small>
                  </div>
                  <Plus size={13} />
                </button>
              );
            })}
          <div className="flow-palette-extras">
            <p className="flow-nav-caption">FLOW CONTROLS</p>
            {[
              ["state", "State"],
              ["form", "Form task"],
              ["automation", "Automation"],
              ["wait", "Delay"],
              ["fork", "Parallel fork"],
              ["join", "Join branches"],
              ["end", "End"],
            ].map(([type, label]) => (
              <button key={type} onClick={() => add(type)}>
                <Plus size={13} />
                {label}
              </button>
            ))}
          </div>
        </aside>
        <div className="flow-canvas-area">
          {listView ? (
            <div className="flow-step-list">
              {doc.nodes.map((n, i) => (
                <button
                  key={n.id}
                  className="flow-step-row"
                  onClick={() => {
                    setSelection({ kind: "node", id: n.id });
                    setSection(null);
                    setInspector(true);
                  }}
                >
                  <span>{i + 1}</span>
                  <div>
                    <strong>{n.label}</strong>
                    <small>
                      {n.type} ·{" "}
                      {doc.edges.filter((e) => e.source === n.id).length} routes
                    </small>
                  </div>
                  <Settings2 size={16} />
                </button>
              ))}
            </div>
          ) : (
            <ReactFlow
              nodes={nodes}
              edges={edges}
              nodeTypes={nodeTypes}
              fitView
              minZoom={0.2}
              maxZoom={1.5}
              onNodeDragStart={() => {
                dragStart.current = clone(doc);
              }}
              onNodeDragStop={() => {
                if (dragStart.current) {
                  setHistory((h) => [...h.slice(-49), dragStart.current]);
                  setFuture([]);
                  dragStart.current = null;
                }
              }}
              onNodesChange={(changes) => {
                const removals = changes
                    .filter((c) => c.type === "remove")
                    .map((c) => c.id),
                  positions = changes.filter(
                    (c) => c.type === "position" && c.position,
                  );
                if (!removals.length && !positions.length) return;
                change(
                  {
                    ...doc,
                    nodes: doc.nodes
                      .filter((n) => !removals.includes(n.id))
                      .map((n) => ({
                        ...n,
                        position:
                          positions.find((c) => c.id === n.id)?.position ||
                          n.position,
                      })),
                    edges: doc.edges.filter(
                      (e) =>
                        !removals.includes(e.source) &&
                        !removals.includes(e.target),
                    ),
                  },
                  !!removals.length,
                );
              }}
              onEdgesChange={(changes) => {
                const remove = changes
                  .filter((c) => c.type === "remove")
                  .map((c) => c.id);
                if (remove.length)
                  change({
                    ...doc,
                    edges: doc.edges.filter((e) => !remove.includes(e.id)),
                  });
              }}
              onConnect={(connection) => {
                const port = connection.sourceHandle || "next";
                change({
                  ...doc,
                  edges: [
                    ...doc.edges,
                    {
                      id: crypto.randomUUID(),
                      source: connection.source,
                      target: connection.target,
                      port,
                      label: port,
                      ...(port === "condition"
                        ? {
                            rule: {
                              op: "eq",
                              field: doc.fields[0]?.id || "",
                              value: "",
                            },
                          }
                        : {}),
                    },
                  ],
                });
              }}
              onNodeClick={(_, n) => {
                setSelection({ kind: "node", id: n.id });
                setSection(null);
                setInspector(true);
              }}
              onEdgeClick={(_, e) => {
                setSelection({ kind: "edge", id: e.id });
                setSection(null);
                setInspector(true);
              }}
              onPaneClick={() => {
                setSelection(null);
              }}
              deleteKeyCode={["Backspace", "Delete"]}
            >
              <Background color="var(--color-border)" gap={22} size={1} />
              <Controls showInteractive={false} />
              <MiniMap
                pannable
                zoomable
                nodeColor={(n) =>
                  ({
                    green: "var(--color-success)",
                    blue: "var(--color-info)",
                    amber: "var(--color-warning)",
                    violet: "var(--color-primary)",
                    rose: "var(--color-error)",
                  })[colors[n.data.node.type]]
                }
              />
              <div className="flow-canvas-hint">
                Connect blocks to shape your process
              </div>
            </ReactFlow>
          )}
          {issues && (
            <div className="flow-validation-panel">
              <header>
                <strong>
                  {issues.length
                    ? `${issues.length} things to resolve`
                    : "Ready to publish"}
                </strong>
                <button
                  className="flow-icon-button"
                  onClick={() => setIssues(null)}
                >
                  <X size={15} />
                </button>
              </header>
              {issues.map((i, k) => (
                <button
                  key={k}
                  onClick={() => {
                    const id = i.path.split(".")[1];
                    if (doc.nodes.some((n) => n.id === id)) {
                      setSelection({ kind: "node", id });
                      setSection(null);
                      setInspector(true);
                    }
                  }}
                >
                  {i.message}
                  <small>{i.path}</small>
                </button>
              ))}
            </div>
          )}
        </div>
        {inspector && (
          <aside className="flow-inspector">
            <header>
              <div>
                <p className="flow-eyebrow">CONFIGURATION</p>
                <h3>
                  {selectedNode?.label ||
                    (selectedEdge
                      ? "Connection"
                      : categories.find((c) => c.id === section)?.name ||
                        "Workflow settings")}
                </h3>
              </div>
              <button
                className="flow-icon-button"
                onClick={() => setInspector(false)}
                title="Close configuration"
              >
                <X size={17} />
              </button>
            </header>
            <div className="flow-inspector-content">
              {selectedNode ? (
                <>
                  <NodeConfig
                    node={selectedNode}
                    doc={doc}
                    lookups={lookups}
                    onChange={updateNode}
                  />
                  <h4>Connections</h4>
                  {doc.edges
                    .filter((e) => e.source === selectedNode.id)
                    .map((e) => (
                      <button
                        className="flow-connection-row"
                        key={e.id}
                        onClick={() => setSelection({ kind: "edge", id: e.id })}
                      >
                        {e.port} →{" "}
                        {doc.nodes.find((n) => n.id === e.target)?.label}
                      </button>
                    ))}
                  <button
                    className="flow-button small"
                    onClick={() => {
                      const target = doc.nodes.find(
                        (n) => n.id !== selectedNode.id,
                      );
                      if (target)
                        change({
                          ...doc,
                          edges: [
                            ...doc.edges,
                            {
                              id: crypto.randomUUID(),
                              source: selectedNode.id,
                              target: target.id,
                              port: "next",
                              label: "next",
                            },
                          ],
                        });
                    }}
                  >
                    <Plus size={14} /> Add connection
                  </button>
                  <hr />
                  <button
                    className="flow-button danger"
                    onClick={() => {
                      change({
                        ...doc,
                        nodes: doc.nodes.filter(
                          (n) => n.id !== selectedNode.id,
                        ),
                        edges: doc.edges.filter(
                          (e) =>
                            e.source !== selectedNode.id &&
                            e.target !== selectedNode.id,
                        ),
                      });
                      setSelection(null);
                    }}
                  >
                    <Trash2 size={15} /> Delete block
                  </button>
                </>
              ) : selectedEdge ? (
                <>
                  <Field label="Route / action">
                    <input
                      value={selectedEdge.port || "next"}
                      onChange={(e) =>
                        updateEdge({
                          port: e.target.value,
                          label: e.target.value,
                        })
                      }
                    />
                  </Field>
                  <Field label="Destination">
                    <select
                      value={selectedEdge.target}
                      onChange={(e) => updateEdge({ target: e.target.value })}
                    >
                      {doc.nodes.map((n) => (
                        <option value={n.id} key={n.id}>
                          {n.label}
                        </option>
                      ))}
                    </select>
                  </Field>
                  {doc.nodes.find((n) => n.id === selectedEdge.source)?.type ===
                    "decision" &&
                    selectedEdge.port !== "default" && (
                      <>
                        <h4>Execute when</h4>
                        <RuleEditor
                          value={selectedEdge.rule}
                          fields={doc.fields}
                          onChange={(rule) => updateEdge({ rule })}
                        />
                      </>
                    )}
                  <button
                    className="flow-button danger"
                    onClick={() => {
                      change({
                        ...doc,
                        edges: doc.edges.filter(
                          (e) => e.id !== selectedEdge.id,
                        ),
                      });
                      setSelection(null);
                    }}
                  >
                    Delete connection
                  </button>
                </>
              ) : section ? (
                <GlobalConfig
                  section={section}
                  doc={doc}
                  onChange={change}
                  lookups={lookups}
                  onError={setError}
                />
              ) : (
                <>
                  <Field label="Description">
                    <textarea
                      rows={4}
                      placeholder="What does this workflow do?"
                      value={definition.description}
                      onChange={(e) =>
                        setDefinition({
                          ...definition,
                          description: e.target.value,
                        })
                      }
                    />
                  </Field>
                  <Field label="Category">
                    <input
                      value={definition.category}
                      onChange={(e) =>
                        setDefinition({
                          ...definition,
                          category: e.target.value,
                        })
                      }
                    />
                  </Field>
                  <div className="flow-config-intro">
                    <Settings2 size={28} />
                    <h3>Make it work your way</h3>
                    <p>
                      Select a block or connection to configure it. Use the
                      building blocks to add capabilities.
                    </p>
                  </div>
                  <button
                    className="flow-button"
                    disabled={busy}
                    onClick={() =>
                      perform(async () => {
                        if (dirty) await save();
                        const result = await flow(
                          `/${definition.id}/validate`,
                          "POST",
                          {},
                        );
                        setIssues(result.issues);
                      })
                    }
                  >
                    <Check size={15} /> Validate workflow
                  </button>
                </>
              )}
            </div>
          </aside>
        )}
      </div>
      {test && (
        <Modal title="Test workflow" onClose={() => setTest(false)}>
          <p className="flow-muted">
            Runs the saved draft in an isolated test execution. External calls
            and HR updates are simulated.
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              perform(async () => {
                if (dirty) await save();
                const result = await flow(`/${definition.id}/test`, "POST", {
                  key: actionKey(),
                  data: testData,
                });
                setTest(false);
                router.push(
                  `/org-admin/workflows/monitoring?instance=${result.id}`,
                );
              });
            }}
          >
            <RuntimeForm
              fields={doc.fields}
              data={testData}
              onChange={setTestData}
            />
            <ErrorBox error={error} />
            <button className="flow-button primary" disabled={busy}>
              <Play size={15} /> Run test
            </button>
          </form>
        </Modal>
      )}
      {versions && (
        <Modal title="Published versions" onClose={() => setVersions(false)}>
          {definition.versions?.length ? (
            definition.versions.map((v) => (
              <div className="flow-version-row" key={v.id}>
                <span className="flow-tint-violet">v{v.number}</span>
                <div>
                  <strong>Version {v.number}</strong>
                  <p>{new Date(v.createdAt).toLocaleString("en-IN")}</p>
                </div>
                <Badge>Published</Badge>
              </div>
            ))
          ) : (
            <p>
              No versions published yet. Validate your draft and publish when
              ready.
            </p>
          )}
        </Modal>
      )}
    </div>
  );
}
export default function WorkflowBuilderPage() {
  return (
    <Suspense fallback={<Loading />}>
      <ReactFlowProvider>
        <Builder />
      </ReactFlowProvider>
    </Suspense>
  );
}
