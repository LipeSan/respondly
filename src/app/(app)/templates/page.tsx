"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/Button";
import { Card, CardHeader } from "@/components/Card";
import { Input } from "@/components/Input";
import { Textarea } from "@/components/Textarea";
import { Text } from "@/components/Text";
import { Modal } from "@/components/Modal";
import { useToast } from "@/components/Toast";

type Template = {
  id: string;
  name: string;
  body: string;
  createdAt: string;
};

const VARS = [
  "{{customer_name}}",
  "{{business_name}}",
  "{{phone}}",
  "{{email}}",
];

function getErrorMessage(e: unknown) {
  if (e instanceof Error) return e.message;
  if (typeof e === "string") return e;
  return "Unexpected error";
}

function TemplatesSkeleton() {
  return (
    <div className="grid animate-pulse gap-6 lg:grid-cols-3" aria-busy="true" aria-label="Loading templates">
      <div className="h-80 rounded-2xl bg-gray-100" />
      <div className="h-80 rounded-2xl bg-gray-100 lg:col-span-2" />
    </div>
  );
}

export default function TemplatesPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selected = useMemo(
    () => templates.find((t) => t.id === selectedId) ?? null,
    [templates, selectedId]
  );

  const [form, setForm] = useState({ id: "", name: "", body: "" });

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/templates", { cache: "no-store" });
      const data = await res.json();
      if (res.status === 401) {
        router.push("/login");
        router.refresh();
        return;
      }
      if (data?.code === "NO_BUSINESS") {
        router.push("/onboarding");
        router.refresh();
        return;
      }
      if (!res.ok) throw new Error(data?.error || "Failed to load templates");
      setTemplates(data.templates ?? []);
    } catch (e: unknown) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (selected) setForm({ id: selected.id, name: selected.name, body: selected.body });
    else setForm({ id: "", name: "", body: "" });
  }, [selected]);

  async function createTemplate() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: form.name, body: form.body }),
      });
      const data = await res.json();
      if (res.status === 401) {
        router.push("/login");
        router.refresh();
        return;
      }
      if (data?.code === "NO_BUSINESS") {
        router.push("/onboarding");
        router.refresh();
        return;
      }
      if (!res.ok) throw new Error(data?.error || "Failed to create template");
      await load();
      setSelectedId(data.template.id);
      showToast({ type: "success", message: "Template created successfully." });
    } catch (e: unknown) {
      const msg = getErrorMessage(e);
      setError(msg);
      showToast({ type: "error", message: msg });
    } finally {
      setSaving(false);
    }
  }

  async function updateTemplate() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/templates", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: form.id, name: form.name, body: form.body }),
      });
      const data = await res.json();
      if (res.status === 401) {
        router.push("/login");
        router.refresh();
        return;
      }
      if (data?.code === "NO_BUSINESS") {
        router.push("/onboarding");
        router.refresh();
        return;
      }
      if (!res.ok) throw new Error(data?.error || "Failed to update template");
      await load();
      showToast({ type: "success", message: "Template updated successfully." });
    } catch (e: unknown) {
      const msg = getErrorMessage(e);
      setError(msg);
      showToast({ type: "error", message: msg });
    } finally {
      setSaving(false);
    }
  }

  async function deleteTemplate(id: string) {
    setDeletingId(id);
    setError(null);
    try {
      const res = await fetch(`/api/templates?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (res.status === 401) {
        router.push("/login");
        router.refresh();
        return false;
      }
      if (data?.code === "NO_BUSINESS") {
        router.push("/onboarding");
        router.refresh();
        return false;
      }
      if (!res.ok) throw new Error(data?.error || "Failed to delete template");
      await load();
      if (selectedId === id) setSelectedId(null);
      showToast({ type: "success", message: "Template deleted successfully." });
      return true;
    } catch (e: unknown) {
      const msg = getErrorMessage(e);
      setError(msg);
      showToast({ type: "error", message: msg });
      return false;
    } finally {
      setDeletingId(null);
    }
  }

  function startNew() {
    setSelectedId(null);
    setForm({ id: "", name: "", body: "" });
  }

  const isEditing = !!form.id;

  return (
    <div className="pb-12">
      <main className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <Text variant="h1">Templates</Text>
            <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-green-600">Reusable messages your rules use to reply to reviews.</p>
          </div>
          <Button className="!w-auto px-4 py-2" onClick={startNew}>
            New template
          </Button>
        </div>

        {error ? (
          <div className="flex flex-col gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-red-800">{error}</p>
            <Button variant="outline" className="!w-auto bg-white px-4 py-2" onClick={() => load()}>
              Try again
            </Button>
          </div>
        ) : null}

        <Modal
          open={confirmDeleteOpen}
          title="Delete template"
          onClose={() => {
            if (deletingId) return;
            setConfirmDeleteOpen(false);
            setConfirmDeleteId(null);
          }}
          footer={
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                className="!w-auto"
                onClick={() => {
                  if (deletingId) return;
                  setConfirmDeleteOpen(false);
                  setConfirmDeleteId(null);
                }}
              >
                Cancel
              </Button>
              <Button
                variant="outline"
                className="!w-auto border-red-200 text-red-700 hover:bg-red-50 focus:ring-red-500"
                isLoading={Boolean(confirmDeleteId && deletingId === confirmDeleteId)}
                onClick={async () => {
                  if (!confirmDeleteId) return;
                  const ok = await deleteTemplate(confirmDeleteId);
                  if (ok) {
                    setConfirmDeleteOpen(false);
                    setConfirmDeleteId(null);
                  }
                }}
              >
                Delete
              </Button>
            </div>
          }
        >
          <Text variant="body" className="text-sm text-gray-700">
            Are you sure you want to delete this template? This action cannot be undone.
          </Text>
        </Modal>

        {loading && templates.length === 0 ? (
          <TemplatesSkeleton />
        ) : (
          <div className="grid gap-6 lg:grid-cols-3">
            <Card>
              <CardHeader title="Your templates" subtitle="Pick one to edit it." />
              {templates.length === 0 ? (
                <div className="mt-5 flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 px-4 py-10 text-center">
                  <p className="text-sm font-medium text-gray-700">No templates yet</p>
                  <p className="mt-1 max-w-xs text-sm text-gray-500">Write your first reply to use it in your rules.</p>
                </div>
              ) : (
                <div className="mt-3 divide-y divide-gray-100">
                  {templates.map((t) => (
                    <div
                      key={t.id}
                      className={`flex items-start justify-between gap-2 rounded-xl px-3 py-3 transition-colors ${
                        selectedId === t.id ? "bg-gray-50" : "hover:bg-gray-50"
                      }`}
                    >
                      <button type="button" className="min-w-0 flex-1 text-left" onClick={() => setSelectedId(t.id)}>
                        <p className="truncate text-sm font-medium text-gray-900">{t.name}</p>
                        <p className="mt-1 line-clamp-2 text-sm text-gray-600">{t.body}</p>
                      </button>

                      <button
                        type="button"
                        aria-label="Delete template"
                        title="Delete"
                        disabled={deletingId === t.id}
                        onClick={() => {
                          setConfirmDeleteId(t.id);
                          setConfirmDeleteOpen(true);
                        }}
                        className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-gray-300 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-60"
                      >
                        {deletingId === t.id ? (
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-red-600" />
                        ) : (
                          <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                            <path
                              fillRule="evenodd"
                              d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z"
                              clipRule="evenodd"
                            />
                          </svg>
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader
                title={isEditing ? "Edit template" : "New template"}
                subtitle="Variables are replaced with the review's details when the reply is sent."
              />

              <div className="mt-6 space-y-6">
                <Input
                  label="Name"
                  className="w-full"
                  value={form.name}
                  onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
                  placeholder="Ex: 5-star Thank You"
                />

                <div>
                  <Textarea
                    label="Message"
                    className="mt-1 min-h-[160px] w-full"
                    value={form.body}
                    onChange={(e) => setForm((s) => ({ ...s, body: e.target.value }))}
                    placeholder="Write the response..."
                  />
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <span className="text-xs text-gray-500">Insert:</span>
                    {VARS.map((v) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => setForm((s) => ({ ...s, body: s.body ? s.body + " " + v : v }))}
                        className="rounded-full bg-gray-100 px-2.5 py-1 font-mono text-xs text-gray-700 transition-colors hover:bg-gray-200"
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Preview</p>
                  <div className="mt-2 whitespace-pre-wrap text-sm text-gray-900">
                    {form.body.trim() ? (
                      form.body
                        .replaceAll("{{customer_name}}", "Ana")
                        .replaceAll("{{business_name}}", "Churrascaria do Filipe")
                        .replaceAll("{{phone}}", "+61 400 000 000")
                        .replaceAll("{{email}}", "contato@exemplo.com")
                    ) : (
                      <span className="text-gray-400">Your message will appear here.</span>
                    )}
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button
                    className="!w-auto px-4 py-2"
                    disabled={saving || !form.name.trim() || !form.body.trim()}
                    isLoading={saving}
                    onClick={isEditing ? updateTemplate : createTemplate}
                  >
                    {isEditing ? "Save changes" : "Create template"}
                  </Button>
                  {isEditing ? (
                    <Button variant="ghost" className="!w-auto px-4 py-2" onClick={startNew}>
                      Cancel
                    </Button>
                  ) : null}
                </div>
              </div>

              <p className="mt-4 text-xs text-gray-400">
                Tip: use &quot;rotate templates&quot; later to avoid repeating the same response.
              </p>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
