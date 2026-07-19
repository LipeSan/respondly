"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { signIn } from "next-auth/react";
import { Button } from "@/components/Button";
import { InlineNotification } from "@/components/InlineNotification";
import { Text } from "@/components/Text";
import { Input } from "@/components/Input";

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-2xl shadow-xl border border-gray-100">
            <div className="flex flex-col items-center gap-3">
              <Image
                src="/logo-header.png"
                alt="Respondly - Google Review Automation"
                width={350}
                height={50}
              />
              <Text variant="h2" className="mt-4">
                Sign In
              </Text>
            </div>
          </div>
        </div>
      }
    >
      <LoginInner />
    </Suspense>
  );
}

function LoginInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({
    email: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const nextRaw = searchParams.get("next");
  const next = nextRaw && nextRaw.startsWith("/") ? nextRaw : "/dashboard";
  const code = String(searchParams.get("code") ?? "").trim();
  const plan = String(searchParams.get("plan") ?? "").trim();
  const nextUrl = new URL(next, "http://localhost");
  if (code && nextUrl.pathname === "/start-trial" && !nextUrl.searchParams.get("code")) {
    nextUrl.searchParams.set("code", code.toUpperCase());
  }
  if (plan && nextUrl.pathname === "/start-trial" && !nextUrl.searchParams.get("plan")) {
    nextUrl.searchParams.set("plan", plan);
  }
  const nextWithParams = `${nextUrl.pathname}${nextUrl.search}`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setFieldErrors({ email: "", password: "" });

    let hasError = false;
    const newFieldErrors = { email: "", password: "" };

    if (!formData.email) {
      newFieldErrors.email = "Email is required";
      hasError = true;
    }
    if (!formData.password) {
      newFieldErrors.password = "Password is required";
      hasError = true;
    }

    if (hasError) {
      setFieldErrors(newFieldErrors);
      return;
    }

    setLoading(true);

    try {
      const res = await signIn("credentials", {
        redirect: false,
        email: formData.email,
        password: formData.password,
        callbackUrl: nextWithParams,
      });

      if (res?.error) {
        setError("Invalid email or password");
      } else {
        router.push(nextWithParams);
        router.refresh();
      }
    } catch {
      setError("Failed to sign in");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-2xl shadow-xl border border-gray-100">
        <div className="flex flex-col items-center gap-3">
          <Image
            src="/logo-header.png"
            alt="Respondly - Google Review Automation"
            width={350}
            height={50}
          />
          <Text variant="h2" className="mt-4">Sign In</Text>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              label="Email"
              placeholder="name@company.com"
              value={formData.email}
              error={fieldErrors.email}
              onChange={(e) => {
                setFormData({ ...formData, email: e.target.value });
                if (fieldErrors.email) setFieldErrors({ ...fieldErrors, email: "" });
              }}
            />

            <div>
              <div className="flex items-center justify-between mb-1">
                <Text variant="label" htmlFor="password">
                  Password
                </Text>
                <div className="text-sm">
                  <Text variant="link" as={Link} href="/forgot-password">
                    Forgot your password?
                  </Text>
                </div>
              </div>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                placeholder="Enter your password"
                value={formData.password}
                error={fieldErrors.password}
                onChange={(e) => {
                  setFormData({ ...formData, password: e.target.value });
                  if (fieldErrors.password) setFieldErrors({ ...fieldErrors, password: "" });
                }}
              />
            </div>
          </div>

          {error ? <InlineNotification tone="error" centered>{error}</InlineNotification> : null}

          <Button type="submit" isLoading={loading}>
            Sign in
          </Button>

          <div className="text-center text-sm mt-4">
            <Text variant="body" as="span">{`Don't have an account? `}</Text>
            <Text variant="link" as={Link} href={`/register?next=${encodeURIComponent(nextWithParams)}`}>
              Sign up
            </Text>
          </div>

          <div className="text-center mt-4">
            <Text variant="body" as="span" className="text-xs text-gray-500">
              By continuing, you agree to our{" "}
            </Text>
            <Text variant="link" as={Link} href="/terms" className="text-xs">
              Terms & Conditions
            </Text>
            <Text variant="body" as="span" className="text-xs text-gray-500">
              .
            </Text>
          </div>
        </form>
      </div>
    </div>
  );
}
