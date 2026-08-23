"use client";

import { useState } from "react";
import Link from "next/link";
import Header from "@/components/Landing/Header";
import Footer from "@/components/Landing/Footer";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { InlineNotification } from "@/components/InlineNotification";
import { Textarea } from "@/components/Textarea";

export default function ContactPageContent() {
  const [email, setEmail] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; description?: string }>({});

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setFieldErrors({});

    const nextFieldErrors: { email?: string; description?: string } = {};
    const emailTrimmed = email.trim();
    const descriptionTrimmed = description.trim();

    if (!emailTrimmed) nextFieldErrors.email = "Email is required";
    else if (!emailTrimmed.includes("@")) nextFieldErrors.email = "Invalid email";

    if (!descriptionTrimmed) nextFieldErrors.description = "Description is required";

    if (nextFieldErrors.email || nextFieldErrors.description) {
      setFieldErrors(nextFieldErrors);
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: emailTrimmed,
          description: descriptionTrimmed,
        }),
      });

      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data?.error || "Could not send message");

      setSuccess(true);
      setEmail("");
      setDescription("");
    } catch (e2: unknown) {
      const msg = e2 instanceof Error ? e2.message : "Unexpected error";
      const lower = msg.toLowerCase();
      if (lower.includes("email")) setFieldErrors({ email: msg });
      else if (lower.includes("description")) setFieldErrors({ description: msg });
      else setError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main data-testid="contact-page" className="relative min-h-screen bg-black text-white overflow-x-hidden">
      <Header showNav={false} />

      <div className="max-w-7xl mx-auto px-6 lg:px-8 pt-28 pb-20">
        <div className="max-w-3xl">
          <h1 className="font-heading text-4xl sm:text-5xl font-bold tracking-tight">Contact</h1>
          <p className="mt-3 text-sm text-zinc-400">
            Send us a message and we&apos;ll get back to you.
          </p>

          <div className="mt-10 rounded-2xl border border-white/10 bg-white/[0.02] p-8 sm:p-10">
            <form onSubmit={onSubmit} className="space-y-4" data-testid="contact-form">
              <Input
                id="email"
                name="email"
                type="email"
                label={<span className="text-white">Email</span>}
                value={email}
                error={fieldErrors.email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (fieldErrors.email) setFieldErrors((s) => ({ ...s, email: undefined }));
                }}
                placeholder="you@company.com"
                className="!bg-zinc-900/70 !border-zinc-800 !text-white !placeholder-zinc-500 focus:!ring-blue-500 autofill:!bg-zinc-900/70 autofill:!text-white"
              />

              <Textarea
                id="description"
                name="description"
                label={<span className="text-white">Description</span>}
                value={description}
                error={fieldErrors.description}
                onChange={(e) => {
                  setDescription(e.target.value);
                  if (fieldErrors.description) setFieldErrors((s) => ({ ...s, description: undefined }));
                }}
                placeholder="Tell us what you need help with..."
                rows={6}
                className="!bg-zinc-900/70 !border-zinc-800 !text-white !placeholder-zinc-500 focus:!ring-blue-500 autofill:!bg-zinc-900/70 autofill:!text-white !resize-none"
              />

              {error ? (
                <InlineNotification tone="error" data-testid="contact-error">
                  {error}
                </InlineNotification>
              ) : null}
              {success ? (
                <InlineNotification tone="success" data-testid="contact-success">
                  Message sent. Thanks!
                </InlineNotification>
              ) : null}

              <div className="pt-2">
                <Button
                  type="submit"
                  isLoading={submitting}
                  disabled={submitting}
                  className="!w-auto !px-10"
                  data-testid="contact-submit"
                >
                  Send
                </Button>
              </div>
            </form>
          </div>

          <div className="mt-10 border-t border-white/10 pt-6 text-sm text-zinc-400">
            <p>
              Back to{" "}
              <Link href="/" className="text-white hover:text-zinc-200 font-medium">
                the homepage
              </Link>
              .
            </p>
          </div>
        </div>
      </div>

      <Footer />
    </main>
  );
}
