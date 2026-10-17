"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/Button";
import { InlineNotification } from "@/components/InlineNotification";
import { Input } from "@/components/Input";
import { Modal } from "@/components/Modal";
import { Select } from "@/components/Select";
import { Text } from "@/components/Text";
import { Textarea } from "@/components/Textarea";
import {
  adminEmailCtas,
  getAdminEmailPreset,
  isAdminEmailCtaPath,
  onboardingStageLabels,
  type AdminEmailCtaPath,
  type OnboardingStage,
} from "@/lib/email/adminEmailPresets";

export type AdminEmailRecipient = {
  userId: string;
  name: string | null;
  email: string;
  stage: OnboardingStage;
};

const presetOptions: OnboardingStage[] = ["no_business", "no_google", "no_subscription", "complete"];

export function AdminSendEmailModal({
  recipient,
  onClose,
  onSent,
}: {
  recipient: AdminEmailRecipient | null;
  onClose(): void;
  onSent(recipient: AdminEmailRecipient, sentAt: string): void;
}) {
  const [preset, setPreset] = useState<OnboardingStage>("complete");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [ctaPath, setCtaPath] = useState<AdminEmailCtaPath | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function applyPreset(stage: OnboardingStage, name: string | null) {
    const next = getAdminEmailPreset(stage, name);
    setPreset(stage);
    setSubject(next.subject);
    setMessage(next.message);
    setCtaPath(next.ctaPath);
  }

  useEffect(() => {
    if (!recipient) return;
    applyPreset(recipient.stage, recipient.name);
    setError(null);
  }, [recipient]);

  async function send() {
    if (!recipient) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/users/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: recipient.userId, subject, message, ctaPath }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(payload?.error || "Failed to send email");
      }
      onSent(recipient, payload?.sentAt ?? new Date().toISOString());
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : "Unexpected error";
      setError(errorMessage);
    } finally {
      setSending(false);
    }
  }

  return (
    <Modal
      open={Boolean(recipient)}
      title="Send email"
      size="lg"
      onClose={() => {
        if (!sending) onClose();
      }}
      footer={
        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" className="!w-auto px-5" onClick={onClose} disabled={sending}>
            Cancel
          </Button>
          <Button
            type="button"
            className="!w-auto px-5"
            isLoading={sending}
            disabled={!subject.trim() || !message.trim()}
            onClick={send}
          >
            Send email
          </Button>
        </div>
      }
    >
      {recipient ? (
        <div className="max-h-[60vh] space-y-4 overflow-y-auto pr-1">
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700">
            <div>
              <span className="font-semibold text-gray-900">To:</span> {recipient.name ? `${recipient.name} ` : ""}
              &lt;{recipient.email}&gt;
            </div>
            <div className="mt-1">
              <span className="font-semibold text-gray-900">Stage:</span> {onboardingStageLabels[recipient.stage]}
            </div>
          </div>

          <Select
            id="adminEmailPreset"
            name="adminEmailPreset"
            label="Template"
            value={preset}
            onChange={(e) => applyPreset(e.target.value as OnboardingStage, recipient.name)}
          >
            {presetOptions.map((stage) => (
              <option key={stage} value={stage}>
                {stage === "complete" ? "Blank message" : onboardingStageLabels[stage]}
              </option>
            ))}
          </Select>

          <Input
            id="adminEmailSubject"
            name="adminEmailSubject"
            label="Subject"
            value={subject}
            maxLength={150}
            onChange={(e) => setSubject(e.target.value)}
          />

          <Textarea
            id="adminEmailMessage"
            name="adminEmailMessage"
            label="Message"
            rows={12}
            value={message}
            maxLength={5000}
            onChange={(e) => setMessage(e.target.value)}
          />

          <Select
            id="adminEmailCta"
            name="adminEmailCta"
            label="Button"
            value={ctaPath ?? ""}
            onChange={(e) => setCtaPath(isAdminEmailCtaPath(e.target.value) ? e.target.value : null)}
          >
            <option value="">No button</option>
            {(Object.keys(adminEmailCtas) as AdminEmailCtaPath[]).map((path) => (
              <option key={path} value={path}>
                {adminEmailCtas[path]} ({path})
              </option>
            ))}
          </Select>

          <Text variant="body" className="text-xs text-gray-500">
            Sent from the Respondly support address using the standard email layout.
          </Text>

          {error ? <InlineNotification tone="error">{error}</InlineNotification> : null}
        </div>
      ) : null}
    </Modal>
  );
}
