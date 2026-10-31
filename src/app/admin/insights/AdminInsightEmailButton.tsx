"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/Button";
import { Modal } from "@/components/Modal";

export function AdminInsightEmailButton({
  insightId,
  businessName,
  to,
  emailed,
}: {
  insightId: string;
  businessName: string;
  to: string;
  emailed: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  async function send() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/insights/${insightId}/email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resend: emailed }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload?.error || "Failed to send email");
      setDialogOpen(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unexpected error");
    } finally {
      setLoading(false);
    }
  }

  function closeDialog() {
    if (loading) return;
    setDialogOpen(false);
    setError(null);
  }

  const label = emailed ? "Resend" : "Send email";

  return (
    <>
      <button
        type="button"
        onClick={() => setDialogOpen(true)}
        className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors ${
          emailed
            ? "border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
            : "bg-gray-900 text-white hover:bg-gray-700"
        }`}
      >
        {label}
      </button>
      <Modal
        open={dialogOpen}
        onClose={closeDialog}
        title={emailed ? `Resend the report to ${businessName}?` : `Email the report to ${businessName}?`}
        footer={
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" className="!w-auto" onClick={closeDialog} disabled={loading}>
              Cancel
            </Button>
            <Button type="button" className="!w-auto" isLoading={loading} onClick={() => void send()}>
              {label}
            </Button>
          </div>
        }
      >
        <div className="space-y-3 text-left text-sm text-gray-600">
          <p>
            It goes to <span className="font-semibold text-gray-900">{to}</span>.
            {emailed ? " They already got this report once." : null}
          </p>
          <a
            href={`/api/admin/insights/${insightId}/email`}
            target="_blank"
            rel="noreferrer"
            className="inline-block font-semibold text-blue-600 hover:text-blue-500"
          >
            Preview the email ↗
          </a>
          {error ? <p className="text-red-600">{error}</p> : null}
        </div>
      </Modal>
    </>
  );
}
