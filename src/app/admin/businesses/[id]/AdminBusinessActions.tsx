"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ExternalLink, Loader2, Mail, RefreshCw } from "lucide-react";
import { Button } from "@/components/Button";
import { Select } from "@/components/Select";
import { useToast } from "@/components/Toast";
import { AdminSendEmailModal, type AdminEmailRecipient } from "@/app/admin/AdminSendEmailModal";

const customerPages = [
  { href: "/configuration", label: "Configuration" },
  { href: "/rules", label: "Rules" },
  { href: "/templates", label: "Templates" },
  { href: "/reviews", label: "Reviews" },
];

// One height and type size for every control in the toolbar, so the buttons
// and the page select line up.
const control = "!w-auto h-9 !py-0 px-3.5 gap-2 items-center whitespace-nowrap !font-semibold";

export function AdminBusinessActions({
  businessId,
  isCurrent,
  emailRecipient,
  canSync,
}: {
  businessId: string;
  isCurrent: boolean;
  emailRecipient: AdminEmailRecipient | null;
  /** Full admins only, and only when the business has a Google location. */
  canSync: boolean;
}) {
  const router = useRouter();
  const { showToast } = useToast();
  const [loadingKey, setLoadingKey] = useState<string | null>(null);
  const [isEmailOpen, setIsEmailOpen] = useState(false);

  async function openBusiness(destination: string) {
    setLoadingKey(destination);
    try {
      const res = await fetch("/api/admin/impersonation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessId }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(payload?.error || "Failed to access customer account");
      }
      router.push(destination);
      router.refresh();
    } catch (e) {
      showToast({ type: "error", message: e instanceof Error ? e.message : "Unexpected error" });
      setLoadingKey(null);
    }
  }

  async function syncReviews() {
    setLoadingKey("sync");
    try {
      const res = await fetch(`/api/admin/businesses/${businessId}/sync`, { method: "POST" });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload?.error || "Sync failed");
      const counts = `${payload.totalFetched ?? 0} fetched · ${payload.imported ?? 0} new · ${payload.updated ?? 0} updated · ${payload.removed ?? 0} removed`;
      showToast({
        type: payload.removalGuarded ? "info" : "success",
        message: payload.removalGuarded
          ? `Synced (${counts}). Removal check skipped: too many reviews were missing from Google's answer.`
          : `Reviews synced: ${counts}.`,
        duration: 8000,
      });
      router.refresh();
    } catch (e) {
      showToast({ type: "error", message: e instanceof Error ? e.message : "Unexpected error" });
    } finally {
      setLoadingKey(null);
    }
  }

  const busy = loadingKey !== null;

  return (
    <div className="flex flex-wrap items-center gap-2 lg:shrink-0 lg:justify-end">
      {canSync ? (
        <Button type="button" variant="outline" className={control} disabled={busy} onClick={syncReviews}>
          <RefreshCw className={`h-4 w-4 ${loadingKey === "sync" ? "animate-spin" : ""}`} aria-hidden="true" />
          {loadingKey === "sync" ? "Syncing..." : "Sync reviews"}
        </Button>
      ) : null}
      {emailRecipient ? (
        <Button type="button" variant="outline" className={control} disabled={busy} onClick={() => setIsEmailOpen(true)}>
          <Mail className="h-4 w-4" aria-hidden="true" />
          Send email
        </Button>
      ) : null}
      <Select
        compact
        id="adminOpenCustomerPage"
        aria-label="Open a customer page"
        value=""
        disabled={busy}
        onChange={(e) => {
          if (e.target.value) void openBusiness(e.target.value);
        }}
        className="h-9 !border-gray-300 !py-0 font-semibold leading-[34px]"
      >
        <option value="">{loadingKey && loadingKey.startsWith("/") && loadingKey !== "/dashboard" ? "Opening..." : "Open page..."}</option>
        {customerPages.map((page) => (
          <option key={page.href} value={page.href}>
            {page.label}
          </option>
        ))}
      </Select>
      <Button type="button" className={control} disabled={busy} onClick={() => openBusiness("/dashboard")}>
        {loadingKey === "/dashboard" ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : (
          <ExternalLink className="h-4 w-4" aria-hidden="true" />
        )}
        {isCurrent ? "Return to their dashboard" : "Open as customer"}
      </Button>
      <AdminSendEmailModal
        recipient={isEmailOpen ? emailRecipient : null}
        onClose={() => setIsEmailOpen(false)}
        onSent={(recipient) => {
          setIsEmailOpen(false);
          showToast({ type: "success", message: `Email sent to ${recipient.email}.` });
          router.refresh();
        }}
      />
    </div>
  );
}
