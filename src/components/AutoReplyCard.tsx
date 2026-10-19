"use client";

import { useState } from "react";
import { Card, CardHeader } from "./Card";
import { Switch } from "./Switch";

interface AutoReplyCardProps {
  initialEnabled: boolean;
}

export function AutoReplyCard({ initialEnabled }: AutoReplyCardProps) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [loading, setLoading] = useState(false);

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
        throw new Error("Failed to update");
      }
    } catch (error) {
      // Revert on error
      setEnabled(!checked);
      console.error(error);
      alert("Failed to update auto-reply settings");
    } finally {
      setLoading(false);
    }
  }

  return (
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
  );
}
