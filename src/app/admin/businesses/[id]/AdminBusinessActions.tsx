"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/Button";
import { InlineNotification } from "@/components/InlineNotification";
import { AdminSendEmailModal, type AdminEmailRecipient } from "@/app/admin/AdminSendEmailModal";

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
    } finally {
      setLoadingKey(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <Link
          href="/admin"
          className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm font-bold text-gray-700 transition-colors hover:bg-gray-50"
        >
          Back to admin
        </Link>
        <Button
          type="button"
          className="!w-auto px-5"
          isLoading={loadingKey === "/dashboard"}
          onClick={() => openBusiness("/dashboard")}
        >
          {isCurrent ? "Return to dashboard" : "Open dashboard"}
        </Button>
        <Button
          type="button"
          variant="outline"
          className="!w-auto px-5"
          isLoading={loadingKey === "/configuration"}
          onClick={() => openBusiness("/configuration")}
        >
          Configuration
        </Button>
        <Button
          type="button"
          variant="outline"
          className="!w-auto px-5"
          isLoading={loadingKey === "/rules"}
          onClick={() => openBusiness("/rules")}
        >
          Rules
        </Button>
        <Button
          type="button"
          variant="outline"
          className="!w-auto px-5"
          isLoading={loadingKey === "/templates"}
          onClick={() => openBusiness("/templates")}
        >
          Templates
        </Button>
        <Button
          type="button"
          variant="outline"
          className="!w-auto px-5"
          isLoading={loadingKey === "/reviews"}
          onClick={() => openBusiness("/reviews")}
        >
          Reviews
        </Button>
        {emailRecipient ? (
          <Button
            type="button"
            variant="outline"
            className="!w-auto px-5"
            onClick={() => {
              setNotice(null);
              setIsEmailOpen(true);
            }}
          >
            Send email
          </Button>
        ) : null}
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
