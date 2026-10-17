"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Select } from "@/components/Select";

type Role = "user" | "support" | "admin";

export function AdminOwnerRole({ userId, role, canEdit }: { userId: string; role: Role; canEdit: boolean }) {
  const router = useRouter();
  const [draft, setDraft] = useState<Role>(role);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/users/role", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, role: draft }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload?.error || "Failed to update role");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unexpected error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="flex items-center gap-2">
        <Select
          compact
          id={`ownerRole-${userId}`}
          aria-label="Owner role"
          value={draft}
          disabled={!canEdit || saving}
          onChange={(e) => setDraft(e.target.value as Role)}
        >
          <option value="user">user</option>
          <option value="support">support</option>
          <option value="admin">admin</option>
        </Select>
        {canEdit && draft !== role ? (
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-gray-700 disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save"}
          </button>
        ) : null}
      </div>
      {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
