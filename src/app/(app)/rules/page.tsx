"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/Button";
import { Card, CardHeader } from "@/components/Card";
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

function ResponseTypeBadge({ type }: { type: Rule["responseType"] }) {
  return type === "ai" ? (
    <span className="rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-800">AI</span>
  ) : (
    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">Template</span>
  );
}

function ModeBadge({ mode }: { mode: Rule["mode"] }) {
  return mode === "auto" ? (
    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">Auto</span>
  ) : (
    <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800">Manual</span>
  );
}

function RulesSkeleton() {
  return (
    <div className="grid animate-pulse gap-6 lg:grid-cols-3" aria-busy="true" aria-label="Loading rules">
      <div className="h-80 rounded-2xl bg-gray-100" />
      <div className="h-80 rounded-2xl bg-gray-100 lg:col-span-2" />
    </div>
  );
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
    <div className="pb-12">
      <main className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <Text variant="h1">Rules</Text>
            <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-green-600">Choose how each review is answered based on its star rating.</p>
          </div>
          <Button className="!w-auto px-4 py-2" onClick={startNew}>
            New rule
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

        {templates.length === 0 && !loading ? (
          <div className="flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-amber-900">You don&apos;t have any templates yet</p>
              <p className="mt-0.5 text-sm text-amber-800">Create at least one template before adding template rules.</p>
            </div>
            <Link
              href="/templates"
              className="inline-flex shrink-0 items-center justify-center rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-gray-700"
            >
              Create template
            </Link>
          </div>
        ) : null}

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

        {loading && rules.length === 0 ? (
          <RulesSkeleton />
        ) : (
          <div className="grid gap-6 lg:grid-cols-3">
            <Card>
              <CardHeader title="Your rules" subtitle="Checked by priority. The first match is used." />
              {rules.length === 0 ? (
                <div className="mt-5 flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 px-4 py-10 text-center">
                  <p className="text-sm font-medium text-gray-700">No rules yet</p>
                  <p className="mt-1 max-w-xs text-sm text-gray-500">Create your first rule to start answering reviews.</p>
                </div>
              ) : (
                <div className="mt-4 space-y-2">
                  {rules.map((r) => (
                    <div
                      key={r.id}
                      className={`group flex items-center justify-between gap-2 rounded-xl border bg-gray-50 px-3 py-3 transition-colors ${
                        selectedId === r.id ? "border-green-500 ring-1 ring-green-500" : "border-transparent hover:bg-gray-100"
                      }`}
                    >
                      <button type="button" className="min-w-0 flex-1 text-left" onClick={() => setSelectedId(r.id)}>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-medium text-gray-400 tabular-nums">P{r.priority}</span>
                          <span className="text-sm font-medium text-gray-900">{formatRange(r.minStars, r.maxStars)}</span>
                        </div>
                        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                          <ResponseTypeBadge type={r.responseType} />
                          <ModeBadge mode={r.mode} />
                        </div>
                      </button>

                      <button
                        type="button"
                        aria-label="Delete rule"
                        title="Delete"
                        disabled={deletingId === r.id}
                        onClick={() => {
                          setConfirmDeleteId(r.id);
                          setConfirmDeleteOpen(true);
                        }}
                        className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-gray-300 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-60"
                      >
                        {deletingId === r.id ? (
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
                title={isEditing ? "Edit rule" : "New rule"}
                subtitle={isEditing ? "Changes apply to new reviews only." : "Pick a star range and how to reply."}
                action={
                  <span className="shrink-0 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700">
                    {rangeLabel}
                  </span>
                }
              />

              <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div>
                  <Input
                    label="Priority"
                    type="number"
                    value={form.priority}
                    onChange={(e) => setForm((s) => ({ ...s, priority: Number(e.target.value) }))}
                  />
                  <p className="mt-1 text-xs text-gray-500">Lower number = applies first.</p>
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
                    <option value="auto">Auto</option>
                    <option value="manual">Manual</option>
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
                    <option value="template">Template</option>
                    <option value="ai" disabled={!canUseAi}>
                      AI {canUseAi ? "" : "(Pro)"}
                    </option>
                  </Select>
                  {!canUseAi ? (
                    <p className="mt-1 text-xs text-gray-500">
                      AI is available only on the Pro plan (active subscription).
                    </p>
                  ) : null}
                </div>

                <div>
                  <Input
                    label="Min stars"
                    type="number"
                    placeholder="e.g. 4"
                    value={form.minStars}
                    onChange={(e) => setForm((s) => ({ ...s, minStars: e.target.value }))}
                    min={1}
                    max={5}
                  />
                  <p className="mt-1 text-xs text-gray-500">Empty for &quot;no minimum&quot;.</p>
                </div>

                <div>
                  <Input
                    label="Max stars"
                    type="number"
                    placeholder="e.g. 5"
                    value={form.maxStars}
                    onChange={(e) => setForm((s) => ({ ...s, maxStars: e.target.value }))}
                    min={1}
                    max={5}
                  />
                  <p className="mt-1 text-xs text-gray-500">Empty for &quot;no maximum&quot;.</p>
                </div>

                {form.responseType === "template" ? (
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
                ) : null}
              </div>

              <div className="mt-6 rounded-xl border border-gray-100 bg-gray-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                  {form.responseType === "template" ? "Preview" : "AI reply"}
                </p>
                {form.responseType === "template" ? (
                  <div className="mt-2 whitespace-pre-wrap text-sm text-gray-900">
                    {(templates.find((t) => t.id === form.templateId)?.body ?? "Select a template")
                      .replaceAll("{{customer_name}}", "Ana")
                      .replaceAll("{{business_name}}", "Filipe's Steakhouse")
                      .replaceAll("{{phone}}", "+61 400 000 000")
                      .replaceAll("{{email}}", "contact@example.com")}
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-gray-700">
                    The reply will be generated automatically based on your Pro plan AI settings.
                  </p>
                )}
              </div>

              <div className="mt-6 flex gap-3">
                <Button
                  className="!w-auto px-4 py-2"
                  disabled={saving || (form.responseType === "template" && (templates.length === 0 || !form.templateId))}
                  onClick={save}
                >
                  {saving ? "Saving..." : isEditing ? "Save changes" : "Create rule"}
                </Button>
                {isEditing ? (
                  <Button variant="ghost" className="!w-auto px-4 py-2" onClick={startNew}>
                    Cancel
                  </Button>
                ) : null}
              </div>

              <p className="mt-4 text-xs text-gray-400">
                Tip: create a rule for 1–3★ (apologies) with priority 10 and another for 4–5★ (thank you) with priority 20.
              </p>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
