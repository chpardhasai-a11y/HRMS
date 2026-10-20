"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowUpRight,
  Users,
  ShoppingBag,
  Headphones,
  TrendingUp,
  Plus,
  LayoutTemplate,
} from "lucide-react";
import { flow } from "../components/api";
import { ErrorBox, Loading } from "../components/ui";
const icons = {
  "hr-approval": Users,
  purchase: ShoppingBag,
  service: Headphones,
  sales: TrendingUp,
};
export default function TemplatesPage() {
  const router = useRouter(),
    [rows, setRows] = useState([]),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [loading, setLoading] = useState(true);
  useEffect(() => {
    flow("/templates")
      .then(setRows)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);
  async function install(t) {
    setBusy(true);
    try {
      const d = await flow("", "POST", { templateId: t.id });
      router.push(`/org-admin/workflows/builder?id=${d.id}`);
    } catch (e) {
      setError(e.message);
      setBusy(false);
    }
  }
  return (
    <>
      <div className="flow-page">
        <header className="flow-page-heading">
          <div>
            <h1>Workflow Templates</h1>
            <p>
              Install an editable draft, then review and publish it when ready.
            </p>
          </div>
        </header>
        <ErrorBox error={error} />
        <h2 className="flow-section-title">
          Explore templates <span>{rows.length} starting points</span>
        </h2>
        {loading ? (
          <Loading />
        ) : (
          <div className="flow-card-grid">
            {rows.map((t, i) => {
              const Icon = icons[t.id] || LayoutTemplate;
              return (
                <article className="flow-card flow-template-card" key={t.id}>
                  <div className="flow-card-top">
                    <span
                      className={`flow-card-symbol flow-tint-${["violet", "blue", "green", "amber"][i]}`}
                    >
                      <Icon size={24} />
                    </span>
                    <span className="flow-chip">{t.category}</span>
                  </div>
                  <h3>{t.name}</h3>
                  <p>{t.description}</p>
                  <div className="flow-template-preview">
                    {t.document.nodes.slice(0, 4).map((n, j) => (
                      <div key={n.id}>
                        <span>{j + 1}</span>
                        <small>{n.label}</small>
                        {j < 3 && <i />}
                      </div>
                    ))}
                  </div>
                  <div className="flow-card-meta">
                    <span>{t.document.nodes.length} blocks</span>
                    <span>{t.document.fields.length} form fields</span>
                  </div>
                  <button
                    className="flow-button"
                    disabled={busy}
                    onClick={() => install(t)}
                  >
                    Use template <ArrowUpRight size={15} />
                  </button>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
