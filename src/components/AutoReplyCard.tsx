"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "./Button";
import { Card, CardHeader } from "./Card";
import { Modal } from "./Modal";
import { Switch } from "./Switch";

interface AutoReplyCardProps {
  initialEnabled: boolean;
}

type UpdateError = { message: string; code?: string };

export function AutoReplyCard({ initialEnabled }: AutoReplyCardProps) {
  const router = useRouter();
  const [enabled, setEnabled] = useState(initialEnabled);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<UpdateError | null>(null);

  async function toggle(checked: boolean) {
    setLoading(true);
    // Optimistic update
    setEnabled(checked);

    try {
      const res = await fetch("/api/businesses/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ autoResponderEnabled: checked }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        // Revert on error
        setEnabled(!checked);
        setError({ message: data?.error || "Failed to update auto-reply settings", code: data?.code });
      }
    } catch (e) {
      setEnabled(!checked);
      console.error(e);
      setError({ message: "Failed to update auto-reply settings" });
    } finally {
      setLoading(false);
    }
  }

  const googleNotConnected = error?.code === "GOOGLE_NOT_CONNECTED";

  return (
    <>
      <Card>
        <CardHeader
          title="Automatic replies"
          subtitle={
            enabled
              ? "New reviews are answered automatically using your rules."
              : "New reviews are synced but won't be answered until you turn this on."
          }
          action={
            <div className="flex shrink-0 items-center gap-3">
              <span className={`text-sm font-semibold ${enabled ? "text-green-600" : "text-gray-400"}`}>
                {enabled ? "On" : "Off"}
              </span>
              <Switch checked={enabled} onCheckedChange={toggle} disabled={loading} aria-label="Automatic replies" />
            </div>
          }
        />
      </Card>
      <Modal
        open={error !== null}
        onClose={() => setError(null)}
        title={googleNotConnected ? "Connect Google first" : "Couldn't update automatic replies"}
        footer={
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" className="!w-auto" onClick={() => setError(null)}>
              {googleNotConnected ? "Not now" : "Close"}
            </Button>
            {googleNotConnected ? (
              <Button type="button" className="!w-auto" onClick={() => router.push("/google")}>
                Connect Google
              </Button>
            ) : null}
          </div>
        }
      >
        <p className="text-sm text-gray-600">
          {googleNotConnected
            ? "Automatic replies are posted to your Google Business Profile, so it needs to be connected before you turn them on."
            : error?.message}
        </p>
      </Modal>
    </>
  );
}
