"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/Button";
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

  // ... (rest of the state logic)

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
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="flex items-start justify-between gap-4">
          <div>
            <Text variant="h1">Templates</Text>
            <Text variant="subtitle" className="mt-2">
              Create reusable messages to automatically respond to reviews.
            </Text>
          </div>

          <Button
            className="!w-auto"
            onClick={startNew}
          >
            New Template
          </Button>
        </div>

        {error && (
          <div className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
            {error}
          </div>
        )}

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

        <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-3">
          {/* List */}
          <div className="rounded-2xl border border-gray-100 bg-white shadow-xl md:col-span-1">
            <div className="border-b border-gray-100 bg-gray-50/50 px-6 py-4">
              <Text variant="h2" className="!text-lg">Your Templates</Text>
            </div>

            {loading ? (
              <div className="p-6">
                <Text variant="body">Loading...</Text>
              </div>
            ) : templates.length === 0 ? (
              <div className="p-6">
                <Text variant="body">No templates yet.</Text>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {templates.map((t) => (
                  <div
                    key={t.id}
                    className={`flex items-center justify-between gap-2 px-6 py-4 transition-colors ${
                      selectedId === t.id ? "bg-blue-50/50" : "hover:bg-gray-50"
                    }`}
                  >
                    <button
                      className="flex-1 text-left"
                      onClick={() => setSelectedId(t.id)}
                    >
                      <Text variant="body" className="font-semibold text-gray-900">{t.name}</Text>
                      <Text variant="body" className="mt-1 line-clamp-2 text-xs">{t.body}</Text>
                    </button>

                    <Button
                      variant="ghost"
                      className="!w-8 !h-8 !p-0 text-gray-400 hover:text-red-600 hover:bg-red-50"
                      onClick={() => {
                        setConfirmDeleteId(t.id);
                        setConfirmDeleteOpen(true);
                      }}
                      disabled={deletingId === t.id}
                      title="Delete"
                    >
                      {deletingId === t.id ? (
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-red-600" />
                      ) : (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth={1.5}
                          stroke="currentColor"
                          className="w-4 h-4"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"
                          />
                        </svg>
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Editor */}
          <div className="rounded-2xl border border-gray-100 bg-white p-8 shadow-xl md:col-span-2">
            <div className="flex items-center justify-between">
              <Text variant="h2" className="!text-xl">
                {isEditing ? "Edit Template" : "Create Template"}
              </Text>

              <div className="flex flex-wrap gap-2">
                {VARS.map((v) => (
                  <Button
                    key={v}
                    variant="outline"
                    className="!w-auto !py-1 !px-3 text-xs !font-normal !rounded-full"
                    onClick={() => setForm((s) => ({ ...s, body: s.body ? s.body + " " + v : v }))}
                    type="button"
                  >
                    Insert {v}
                  </Button>
                ))}
              </div>
            </div>

            <div className="mt-4 space-y-4">
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
                <Text variant="body" className="mt-2 text-xs text-gray-500">
                  Supported variables: {VARS.join(", ")}
                </Text>
              </div>

              <div className="flex gap-3">
                <Button
                  className="!w-auto"
                  disabled={saving || !form.name.trim() || !form.body.trim()}
                  isLoading={saving}
                  onClick={isEditing ? updateTemplate : createTemplate}
                >
                  {isEditing ? "Save Changes" : "Create Template"}
                </Button>

                {isEditing && (
                  <Button
                    variant="outline"
                    className="!w-auto"
                    onClick={startNew}
                  >
                    Cancel
                  </Button>
                )}
              </div>

              {/* Preview */}
              <div className="rounded-xl border border-gray-100 bg-gray-50 p-6">
                <Text variant="label">Preview</Text>
                <div className="mt-2 whitespace-pre-wrap text-sm text-gray-900 font-sans">
                  {form.body
                    .replaceAll("{{customer_name}}", "Ana")
                    .replaceAll("{{business_name}}", "Churrascaria do Filipe")
                    .replaceAll("{{phone}}", "+61 400 000 000")
                    .replaceAll("{{email}}", "contato@exemplo.com")}
                </div>
              </div>

              <Text variant="body" className="text-xs text-gray-500">
                Tip: use &quot;rotate templates&quot; later to avoid repeating the same response.
              </Text>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
