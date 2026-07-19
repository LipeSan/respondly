"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { InlineNotification } from "@/components/InlineNotification";
import { Text } from "@/components/Text";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [token, setToken] = useState("");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get("token") ?? "";
    setToken(t);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!token) {
      setError("Missing token");
      return;
    }
    if (!password) {
      setError("Password is required");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok) {
        setError(data.error || "Invalid or expired token");
        return;
      }

      setDone(true);
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
            Choose a new password
          </Text>
        </div>

        {done ? (
          <div className="space-y-4">
            <InlineNotification tone="success" centered>
              Your password has been reset. You can now sign in.
            </InlineNotification>
            <Button
              type="button"
              onClick={() => {
                router.push("/login");
                router.refresh();
              }}
            >
              Go to login
            </Button>
          </div>
        ) : (
          <form className="mt-6 space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-4">
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                label="New password"
                placeholder="Enter a new password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError("");
                }}
              />
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                label="Confirm password"
                placeholder="Confirm your new password"
                value={confirmPassword}
                error={error}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  if (error) setError("");
                }}
              />
            </div>

            <Button type="submit" isLoading={loading} disabled={!token}>
              Reset password
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
