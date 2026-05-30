"use client";

import { Suspense, useState } from "react";
import { useRouter } from "next/navigation";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { signIn } from "next-auth/react";

import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { Text } from "@/components/Text";

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="max-w-md w-full space-y-6 p-8 bg-white rounded-2xl shadow-xl border border-gray-100">
            <div className="flex flex-col items-center gap-3">
              <Image
                src="/logo-header.png"
                alt="Respondly - Google Review Automation"
                width={350}
                height={60}
              />
              <Text variant="h2" className="mt-4">
                Create your account
              </Text>
            </div>
          </div>
        </div>
      }
    >
      <RegisterInner />
    </Suspense>
  );
}

function RegisterInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({
    name: "",
    email: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setFieldErrors({ name: "", email: "", password: "" });

    let hasError = false;
    const newFieldErrors = { name: "", email: "", password: "" };

    if (!formData.name) {
      newFieldErrors.name = "Name is required";
      hasError = true;
    }
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
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        const nextRaw = searchParams.get("next");
        const next = nextRaw && nextRaw.startsWith("/") ? nextRaw : "/start-trial";
        const loginRes = await signIn("credentials", {
          redirect: false,
          email: formData.email,
          password: formData.password,
          callbackUrl: next,
        });

        if (loginRes?.error) {
          router.push(`/login?next=${encodeURIComponent(next)}`);
          return;
        }

        router.push(next);
        router.refresh();
      } else {
        const data = await res.json();
        setError(data.error || "Something went wrong");
      }
    } catch {
      setError("Failed to register");
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
            height={60}
          />
          <Text variant="h2" className="mt-4">Create your account</Text>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <Input
              id="name"
              name="name"
              type="text"
              label="Name"
              placeholder="Your full name"
              value={formData.name}
              error={fieldErrors.name}
              onChange={(e) => {
                setFormData({ ...formData, name: e.target.value });
                if (fieldErrors.name) setFieldErrors({ ...fieldErrors, name: "" });
              }}
            />

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

            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              label="Password"
              placeholder="Create a password"
              value={formData.password}
              error={fieldErrors.password}
              onChange={(e) => {
                setFormData({ ...formData, password: e.target.value });
                if (fieldErrors.password) setFieldErrors({ ...fieldErrors, password: "" });
              }}
            />
          </div>

          {error && (
            <div className="text-red-500 text-sm text-center bg-red-50 p-3 rounded-lg border border-red-100">
              {error}
            </div>
          )}

          <Button type="submit" isLoading={loading}>
            Send
          </Button>

          <div className="text-center text-sm mt-4">
            <span className="text-gray-500">Already have an account? </span>
            <Link href="/login" className="font-semibold text-blue-600 hover:text-blue-500 transition-colors">
              Sign in
            </Link>
          </div>

          <div className="text-center mt-4">
            <Text variant="body" as="span" className="text-xs text-gray-500">
              By creating an account, you agree to our{" "}
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
