"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { Text } from "@/components/Text";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [devResetUrl, setDevResetUrl] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email.trim()) {
      setError("Email is required");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = (await res.json()) as { ok?: boolean; error?: string; devResetUrl?: string };
      if (!res.ok) {
        setError(data.error || "Something went wrong");
        return;
      }

      setSent(true);
      setDevResetUrl(typeof data.devResetUrl === "string" ? data.devResetUrl : null);
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-6 p-8 bg-white rounded-2xl shadow-xl border border-gray-100">
        <div className="flex flex-col items-center gap-3">
          <Image
            src="/logo-header.png"
            alt="Respondly - Google Review Automation"
            width={350}
            height={50}
          />
          <Text variant="h2" className="mt-4">
            Reset your password
          </Text>
          <Text variant="body" className="text-center">
            Enter your email and we&apos;ll send you a link to reset your password.
          </Text>
        </div>

        {sent ? (
          <div className="space-y-4">
            <div className="text-green-700 text-sm text-center bg-green-50 p-3 rounded-lg border border-green-100">
              If an account exists for this email, you&apos;ll receive a password reset link shortly.
            </div>

            {devResetUrl && (
              <div className="text-sm text-center">
                <Link className="font-semibold text-blue-600 hover:text-blue-500 transition-colors" href={devResetUrl}>
                  Open reset link (dev)
                </Link>
              </div>
            )}

            <div className="text-center text-sm">
              <Link href="/login" className="font-semibold text-blue-600 hover:text-blue-500 transition-colors">
                Back to login
              </Link>
            </div>
          </div>
        ) : (
          <form className="mt-6 space-y-6" onSubmit={handleSubmit}>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              label="Email"
              placeholder="name@company.com"
              value={email}
              error={error}
              onChange={(e) => {
                setEmail(e.target.value);
                if (error) setError("");
              }}
            />

            <Button type="submit" isLoading={loading}>
              Send reset link
            </Button>

            <div className="text-center text-sm mt-4">
              <Link href="/login" className="font-semibold text-blue-600 hover:text-blue-500 transition-colors">
                Back to login
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
