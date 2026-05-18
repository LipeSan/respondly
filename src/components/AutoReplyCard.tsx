"use client";

import { useState } from "react";
import { Text } from "./Text";
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
    <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 hover:shadow-2xl transition-shadow duration-200">
      <div className="flex items-center justify-between mb-2">
        <Text variant="body" className="text-sm font-medium text-gray-500">
          Auto-reply
        </Text>
        <div className={`p-1.5 rounded-md ${enabled ? "bg-blue-50 text-blue-600" : "bg-gray-100 text-gray-500"}`}>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
          </svg>
        </div>
      </div>

      <div className="flex items-end justify-between">
        <Text variant="h2" className={`text-3xl font-bold ${enabled ? "text-blue-600" : "text-gray-400"}`}>
          {enabled ? "ON" : "OFF"}
        </Text>
        <Switch checked={enabled} onCheckedChange={toggle} disabled={loading} />
      </div>
    </div>
  );
}
