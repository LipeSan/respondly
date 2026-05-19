"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { Modal } from "@/components/Modal";
import { Select } from "@/components/Select";
import { Text } from "@/components/Text";
import { useToast } from "@/components/Toast";

type Template = {
  id: string;
  name: string;
  body: string;
};

type Rule = {
  id: string;
  priority: number;
  minStars: number | null;
  maxStars: number | null;
  mode: "auto" | "manual";
  responseType: "template" | "ai" | "manual";
  templateId: string | null;
  template?: Template | null;
  createdAt: string;
};

function formatRange(minStars: number | null, maxStars: number | null) {
  if (minStars == null && maxStars == null) return "All";
  if (minStars != null && maxStars != null && minStars === maxStars) return `${minStars}⭐`;
  if (minStars != null && maxStars != null) return `${minStars}⭐ - ${maxStars}⭐`;
  if (minStars != null) return `>= ${minStars}⭐`;
  return `<= ${maxStars}⭐`;
}

function getErrorMessage(e: unknown) {
  if (e instanceof Error) return e.message;
  if (typeof e === "string") return e;
  return "Unexpected error";
}

export default function RulesPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [canUseAi, setCanUseAi] = useState(false);

  const [templates, setTemplates] = useState<Template[]>([]);
  const [rules, setRules] = useState<Rule[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selected = useMemo(
    () => rules.find((r) => r.id === selectedId) ?? null,
    [rules, selectedId]
  );

  const [form, setForm] = useState<{
    id: string;
    priority: number;
    minStars: string; // keep as string for inputs
    maxStars: string;
    mode: "auto" | "manual";
    responseType: "template" | "ai";
    templateId: string;
  }>({
    id: "",
    priority: 100,
    minStars: "4",
    maxStars: "5",
    mode: "auto",
    responseType: "template",
    templateId: "",
  });

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [tRes, rRes, sRes] = await Promise.all([
        fetch("/api/templates", { cache: "no-store" }),
        fetch("/api/rules", { cache: "no-store" }),
        fetch("/api/businesses/settings", { cache: "no-store" }),
      ]);

      const tData = await tRes.json();
      const rData = await rRes.json();
      const sData = await sRes.json().catch(() => ({}));

      if (tRes.status === 401 || rRes.status === 401 || sRes.status === 401) {
        router.push("/login");
        router.refresh();
        return;
      }

      if (tData?.code === "NO_BUSINESS" || rData?.code === "NO_BUSINESS" || sData?.code === "NO_BUSINESS") {
        router.push("/onboarding");
        router.refresh();
        return;
      }

      if (!tRes.ok) throw new Error(tData?.error || "Failed to load templates");
      if (!rRes.ok) throw new Error(rData?.error || "Failed to load rules");
      if (!sRes.ok) throw new Error(sData?.error || "Failed to load settings");

      setTemplates(tData.templates ?? []);
      setRules(rData.rules ?? []);
      const plan = sData?.subscription?.plan;
      const status = sData?.subscription?.status;
      setCanUseAi(plan === "pro" && (status === "active" || status === "trialing"));
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
    if (!selected) {
      setForm((s) => ({ ...s, id: "" }));
      return;
    }
    setForm({
      id: selected.id,
      priority: selected.priority,
      minStars: selected.minStars == null ? "" : String(selected.minStars),
      maxStars: selected.maxStars == null ? "" : String(selected.maxStars),
      mode: selected.mode,
      responseType: selected.responseType === "ai" ? "ai" : "template",
      templateId: selected.templateId ?? "",
    });
  }, [selected]);

  function startNew() {
    setSelectedId(null);
    setForm((s) => ({
      ...s,
      id: "",
      priority: 100,
      minStars: "4",
      maxStars: "5",
      mode: "auto",
      responseType: "template",
      templateId: templates[0]?.id ?? "",
    }));
  }

  const isEditing = !!form.id;

  function parseStars(v: string) {
    const s = v.trim();
    if (!s) return null;
    const n = Number(s);
    if (Number.isNaN(n)) return null;
    return n;
  }

  async function save() {
    setSaving(true);
    setError(null);

    const minStars = parseStars(form.minStars);
    const maxStars = parseStars(form.maxStars);

    try {
      const wasEditing = isEditing;
      const payload = {
        id: form.id || undefined,
        priority: Number(form.priority),
        minStars,
        maxStars,
        mode: form.mode,
        responseType: form.responseType,
        templateId: form.responseType === "template" ? (form.templateId || undefined) : undefined,
      };

      const res = await fetch("/api/rules", {
        method: isEditing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
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
      if (!res.ok) throw new Error(data?.error || "Failed to save rule");

      await load();

      if (!isEditing && data?.rule?.id) setSelectedId(data.rule.id);
      showToast({
        type: "success",
        message: wasEditing ? "Rule updated successfully." : "Rule created successfully.",
      });
    } catch (e: unknown) {
      const msg = getErrorMessage(e);
      setError(msg);
      showToast({ type: "error", message: msg });
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    setDeletingId(id);
    setError(null);
    try {
      const res = await fetch(`/api/rules?id=${encodeURIComponent(id)}`, { method: "DELETE" });
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
      if (!res.ok) throw new Error(data?.error || "Failed to delete rule");
      await load();
      if (selectedId === id) setSelectedId(null);
      showToast({ type: "success", message: "Rule deleted successfully." });
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

  const rangeLabel = useMemo(() => {
    const min = form.minStars.trim() ? Number(form.minStars) : null;
    const max = form.maxStars.trim() ? Number(form.maxStars) : null;
    const minStars = min == null || Number.isNaN(min) ? null : min;
    const maxStars = max == null || Number.isNaN(max) ? null : max;
    return formatRange(minStars, maxStars);
  }, [form.minStars, form.maxStars]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="flex items-start justify-between gap-4">
          <div>
            <Text variant="h1">Rules</Text>
            <Text variant="subtitle" className="mt-2">
              Define which templates to use based on review stars.
            </Text>
          </div>

          <Button
            className="!w-auto"
            onClick={startNew}
          >
            New Rule
          </Button>
        </div>

        {error && (
          <div className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
            {error}
          </div>
        )}

        <Modal
          open={confirmDeleteOpen}
          title="Delete rule"
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
                  const ok = await remove(confirmDeleteId);
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
            Are you sure you want to delete this rule? This action cannot be undone.
          </Text>
        </Modal>

        {templates.length === 0 && !loading && (
          <div className="mt-6 rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-yellow-800">
            <Text variant="body" className="text-sm text-yellow-800">
              You don&apos;t have any templates yet. Create at least 1 in{" "}
              <Link href="/templates" className="font-semibold underline underline-offset-2">
                Templates
              </Link>{" "}
              before creating rules.
            </Text>
          </div>
        )}

        <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-3">
          {/* Lista */}
          <div className="rounded-2xl border border-gray-100 bg-white shadow-xl md:col-span-1">
            <div className="border-b border-gray-100 bg-gray-50/50 px-6 py-4">
              <Text variant="h2" className="!text-lg">Rules (by priority)</Text>
            </div>

            {loading ? (
              <div className="p-6">
                <Text variant="body">Loading...</Text>
              </div>
            ) : rules.length === 0 ? (
              <div className="p-6">
                <Text variant="body">No rules yet.</Text>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {rules.map((r) => (
                  <div
                    key={r.id}
                    className={`flex items-center justify-between gap-2 px-6 py-4 transition-colors ${
                      selectedId === r.id ? "bg-blue-50/50" : "hover:bg-gray-50"
                    }`}
                  >
                    <button className="flex-1 text-left" onClick={() => setSelectedId(r.id)}>
                      <div className="flex items-center gap-2">
                        <span className="text-xs rounded-full bg-gray-100 px-2 py-1 text-gray-700 font-medium">
                          P{r.priority}
                        </span>
                        <Text variant="body" className="font-semibold text-gray-900">
                          {formatRange(r.minStars, r.maxStars)}
                        </Text>
                      </div>
                      <div className="mt-1 flex items-center gap-2">
                        {r.responseType === "ai" ? (
                          <span className="inline-flex items-center gap-1 rounded-full border border-purple-200 bg-purple-50 px-2 py-0.5 text-[11px] font-medium text-purple-700">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 20 20"
                              fill="currentColor"
                              className="h-3.5 w-3.5"
                            >
                              <path
                                fillRule="evenodd"
                                d="M9.965 2.5a.75.75 0 0 1 .75.75c0 2.152.814 3.818 2.178 4.95 1.36 1.13 3.28 1.72 5.357 1.72a.75.75 0 0 1 0 1.5c-2.077 0-3.997.59-5.357 1.72-1.364 1.132-2.178 2.798-2.178 4.95a.75.75 0 0 1-1.5 0c0-2.152-.814-3.818-2.178-4.95-1.36-1.13-3.28-1.72-5.357-1.72a.75.75 0 0 1 0-1.5c2.077 0 3.997-.59 5.357-1.72 1.364-1.132 2.178-2.798 2.178-4.95a.75.75 0 0 1 .75-.75Z"
                                clipRule="evenodd"
                              />
                            </svg>
                            AI
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-[11px] font-medium text-gray-700">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 20 20"
                              fill="currentColor"
                              className="h-3.5 w-3.5"
                            >
                              <path
                                fillRule="evenodd"
                                d="M4 2.75A1.75 1.75 0 0 1 5.75 1h5.19c.464 0 .91.184 1.238.512l3.06 3.06c.328.328.512.774.512 1.238v11.44A1.75 1.75 0 0 1 14 19H5.75A1.75 1.75 0 0 1 4 17.25V2.75ZM11 2.5v3.25c0 .414.336.75.75.75H15.5v-.69a.25.25 0 0 0-.073-.177l-3.06-3.06A.25.25 0 0 0 12.19 2.5H11Z"
                                clipRule="evenodd"
                              />
                            </svg>
                            Template
                          </span>
                        )}
                      </div>
                      <Text variant="body" className="mt-1 text-xs text-gray-500">
                        Mode: {r.mode}
                      </Text>
                    </button>

                    <Button
                      variant="ghost"
                      className="!w-8 !h-8 !p-0 text-gray-400 hover:text-red-600 hover:bg-red-50"
                      onClick={() => {
                        setConfirmDeleteId(r.id);
                        setConfirmDeleteOpen(true);
                      }}
                      disabled={deletingId === r.id}
                      title="Delete"
                    >
                      {deletingId === r.id ? (
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
              <Text variant="h2" className="!text-lg">
                {isEditing ? "Edit Rule" : "Create Rule"}
              </Text>
              <Text variant="body" className="text-xs">
                Range: <b>{rangeLabel}</b>
              </Text>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <Input
                  label="Priority"
                  type="number"
                  value={form.priority}
                  onChange={(e) => setForm((s) => ({ ...s, priority: Number(e.target.value) }))}
                />
                <Text variant="body" className="mt-1 text-xs">
                  Lower number = applies first.
                </Text>
              </div>

              <div>
                <Select
                  label="Mode"
                  value={form.mode}
                  onChange={(e) => {
                    const v = e.target.value === "manual" ? "manual" : "auto";
                    setForm((s) => ({ ...s, mode: v }));
                  }}
                >
                  <option value="auto">auto</option>
                  <option value="manual">manual</option>
                </Select>
              </div>

              <div className="sm:col-span-2">
                <Select
                  label="Response type"
                  value={form.responseType}
                  onChange={(e) => {
                    const v = e.target.value as "template" | "ai";
                    if (v === "ai" && !canUseAi) return;
                    setForm((s) => ({ ...s, responseType: v }));
                  }}
                >
                  <option value="template">template</option>
                  <option value="ai" disabled={!canUseAi}>
                    ai {canUseAi ? "" : "(Pro)"}
                  </option>
                </Select>
                {!canUseAi && (
                  <Text variant="body" className="mt-1 text-xs text-gray-500">
                    AI is available only on the Pro plan (active subscription).
                  </Text>
                )}
              </div>

              <div>
                <Input
                  label="Min Stars"
                  type="number"
                  placeholder="e.g. 4"
                  value={form.minStars}
                  onChange={(e) => setForm((s) => ({ ...s, minStars: e.target.value }))}
                  min={1}
                  max={5}
                />
                <Text variant="body" className="mt-1 text-xs">Empty for &quot;no minimum&quot;.</Text>
              </div>

              <div>
                <Input
                  label="Max Stars"
                  type="number"
                  placeholder="e.g. 5"
                  value={form.maxStars}
                  onChange={(e) => setForm((s) => ({ ...s, maxStars: e.target.value }))}
                  min={1}
                  max={5}
                />
                <Text variant="body" className="mt-1 text-xs">Empty for &quot;no maximum&quot;.</Text>
              </div>

              {form.responseType === "template" && (
                <div className="sm:col-span-2">
                  <Select
                    label="Template"
                    value={form.templateId}
                    onChange={(e) => setForm((s) => ({ ...s, templateId: e.target.value }))}
                    disabled={templates.length === 0}
                  >
                    <option value="">Select...</option>
                    {templates.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </Select>
                </div>
              )}
            </div>

            {form.responseType === "template" ? (
              <div className="mt-6 rounded-lg border border-gray-100 bg-gray-50 p-4">
                <Text variant="label" className="mb-2">Preview</Text>
                <div className="whitespace-pre-wrap text-sm text-gray-900">
                  {(templates.find((t) => t.id === form.templateId)?.body ?? "Select a template")
                    .replaceAll("{{customer_name}}", "Ana")
                    .replaceAll("{{business_name}}", "Filipe's Steakhouse")
                    .replaceAll("{{phone}}", "+61 400 000 000")
                    .replaceAll("{{email}}", "contact@example.com")}
                </div>
              </div>
            ) : (
              <div className="mt-6 rounded-lg border border-gray-100 bg-gray-50 p-4">
                <Text variant="label" className="mb-2">AI</Text>
                <Text variant="body" className="text-sm text-gray-700">
                  The reply will be generated automatically based on your Pro plan AI settings.
                </Text>
              </div>
            )}

            <div className="mt-6 flex gap-3">
              <Button
                className="!w-auto"
                disabled={saving || (form.responseType === "template" && (templates.length === 0 || !form.templateId))}
                onClick={save}
              >
                {saving ? "Saving..." : isEditing ? "Save Changes" : "Create Rule"}
              </Button>

              {isEditing && (
                <Button
                  variant="ghost"
                  className="!w-auto"
                  onClick={startNew}
                >
                  Cancel
                </Button>
              )}
            </div>

            <Text variant="body" className="mt-4 text-xs">
              Tip: create a rule for 1–3⭐ (apologies) with priority 10 and another for 4–5⭐ (thank you) with priority 20.
            </Text>
          </div>
        </div>
      </div>
    </div>
  );
}
