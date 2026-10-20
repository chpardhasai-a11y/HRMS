"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Play, CheckCircle2 } from "lucide-react";
import { flow, actionKey } from "../../components/api";
import { ErrorBox, Loading } from "../../components/ui";
import { RuntimeForm } from "../../components/forms";
export default function WorkflowForm() {
  const { id } = useParams(),
    router = useRouter(),
    [definition, setDefinition] = useState(null),
    [data, setData] = useState({}),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [result, setResult] = useState(null);
  useEffect(() => {
    flow(`/${id}/form`)
      .then(setDefinition)
      .catch((e) => setError(e.message));
  }, [id]);
  return (
    <>
      <div className="flow-page" style={{ maxWidth: 800 }}>
        <ErrorBox error={error} />
        {!definition && !error ? (
          <Loading />
        ) : result ? (
          <section className="flow-panel">
            <CheckCircle2 size={30} className="flow-tint-green" />
            <h1>Request submitted</h1>
            <p className="flow-muted">
              Your workflow has started. You can follow its progress in
              Monitoring.
            </p>
            <button
              className="flow-button primary"
              onClick={() =>
                router.push(
                  `/org-admin/workflows/monitoring?instance=${result.id}`,
                )
              }
            >
              View execution
            </button>
          </section>
        ) : (
          definition && (
            <>
              <header className="flow-page-heading">
                <div>
                  <p className="flow-eyebrow">NEW WORKFLOW REQUEST</p>
                  <h1>{definition.name}</h1>
                  <p>{definition.description}</p>
                </div>
              </header>
              <form
                className="flow-panel"
                onSubmit={async (e) => {
                  e.preventDefault();
                  setBusy(true);
                  setError("");
                  try {
                    setResult(
                      await flow(`/${id}/form`, "POST", {
                        key: actionKey(),
                        data,
                      }),
                    );
                  } catch (err) {
                    setError(err.message);
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                <RuntimeForm
                  fields={definition.fields}
                  data={data}
                  definitionId={id}
                  onChange={setData}
                />
                <button disabled={busy} className="flow-button primary">
                  <Play size={16} /> Submit request
                </button>
              </form>
            </>
          )
        )}
      </div>
    </>
  );
}
