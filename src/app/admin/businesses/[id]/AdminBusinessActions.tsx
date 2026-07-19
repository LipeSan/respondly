"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/Button";
import { InlineNotification } from "@/components/InlineNotification";

export function AdminBusinessActions({
  businessId,
  isCurrent,
}: {
  businessId: string;
  isCurrent: boolean;
}) {
  const router = useRouter();
  const [loadingKey, setLoadingKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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
      </div>
      {error ? <InlineNotification tone="error">{error}</InlineNotification> : null}
    </div>
  );
}
