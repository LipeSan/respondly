"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/Button";
import { Text } from "@/components/Text";

export function AdminImpersonationBar({ businessName }: { businessName: string }) {
  const router = useRouter();
  const [stopping, setStopping] = useState(false);

  async function stopImpersonation() {
    setStopping(true);
    try {
      await fetch("/api/admin/impersonation", { method: "DELETE" });
      router.push("/admin");
      router.refresh();
    } finally {
      setStopping(false);
    }
  }

  return (
    <div className="border-b border-amber-200 bg-amber-50">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <Text variant="body" className="text-sm text-amber-900">
          Admin access active. You are viewing <strong>{businessName}</strong> as the customer.
        </Text>
        <div className="flex items-center gap-3">
          <Link href="/admin" className="text-sm font-medium text-amber-900 underline underline-offset-2">
            Back to admin
          </Link>
          <Button
            type="button"
            variant="outline"
            className="!w-auto border-amber-300 bg-white px-3 py-2 text-amber-900 hover:bg-amber-100"
            onClick={stopImpersonation}
            isLoading={stopping}
          >
            Exit client access
          </Button>
        </div>
      </div>
    </div>
  );
}
