"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/Button";
import { InlineNotification } from "@/components/InlineNotification";
import { Select } from "@/components/Select";
import { AdminSendEmailModal, type AdminEmailRecipient } from "@/app/admin/AdminSendEmailModal";

const customerPages = [
  { href: "/configuration", label: "Configuration" },
  { href: "/rules", label: "Rules" },
  { href: "/templates", label: "Templates" },
  { href: "/reviews", label: "Reviews" },
];

export function AdminBusinessActions({
  businessId,
  isCurrent,
  emailRecipient,
}: {
  businessId: string;
  isCurrent: boolean;
  emailRecipient: AdminEmailRecipient | null;
}) {
  const router = useRouter();
  const [loadingKey, setLoadingKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isEmailOpen, setIsEmailOpen] = useState(false);

  async function openBusiness(destination: string) {
    setLoadingKey(destination);
    setError(null);
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
      const message = e instanceof Error ? e.message : "Unexpected error";
      setError(message);
      setLoadingKey(null);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          className="!w-auto !py-2 px-4"
          isLoading={loadingKey === "/dashboard"}
          onClick={() => openBusiness("/dashboard")}
        >
          {isCurrent ? "Return to their dashboard" : "Open as customer"}
        </Button>
        {emailRecipient ? (
          <Button
            type="button"
            variant="outline"
            className="!w-auto !py-2 px-4"
            onClick={() => {
              setNotice(null);
              setIsEmailOpen(true);
            }}
          >
            Send email
          </Button>
        ) : null}
        <Select
          compact
          id="adminOpenCustomerPage"
          aria-label="Open a customer page"
          value=""
          disabled={loadingKey !== null}
          onChange={(e) => {
            if (e.target.value) void openBusiness(e.target.value);
          }}
          className="!py-2"
        >
          <option value="">{loadingKey && loadingKey !== "/dashboard" ? "Opening..." : "Open page..."}</option>
          {customerPages.map((page) => (
            <option key={page.href} value={page.href}>
              {page.label}
            </option>
          ))}
        </Select>
      </div>
      {error ? <InlineNotification tone="error">{error}</InlineNotification> : null}
      {notice ? <InlineNotification tone="success">{notice}</InlineNotification> : null}
      <AdminSendEmailModal
        recipient={isEmailOpen ? emailRecipient : null}
        onClose={() => setIsEmailOpen(false)}
        onSent={(recipient) => {
          setIsEmailOpen(false);
          setNotice(`Email sent to ${recipient.email}.`);
          router.refresh();
        }}
      />
    </div>
  );
}
