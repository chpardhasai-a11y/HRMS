import { apiRequest, getStoredUser } from "../../../lib/hrmsApi";
export const flow = (path = "", method = "GET", body) =>
  apiRequest(`/workflows${path}`, {
    method,
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
export const actionKey = () => crypto.randomUUID();
export async function download(path, name) {
  const base = process.env.NEXT_PUBLIC_HRMS_API_URL || "http://localhost:4000";
  const response = await fetch(`${base}/workflows${path}`, {
    headers: { Authorization: `Bearer ${localStorage.getItem("hrms_token")}` },
  });
  if (!response.ok) throw new Error("Download failed");
  const url = URL.createObjectURL(await response.blob());
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}
export async function upload(instanceId, file) {
  const body = new FormData();
  body.append("file", file);
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_HRMS_API_URL || "http://localhost:4000"}/workflows${instanceId ? `/instances/${instanceId}/attachments` : "/attachments"}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("hrms_token")}`,
      },
      body,
    },
  );
  const result = await response.json();
  if (!response.ok) throw new Error(result.message || "Upload failed");
  return result;
}
export const currentUser = getStoredUser;
export const dateTime = (value) =>
  value
    ? new Date(value).toLocaleString("en-IN", {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "—";
