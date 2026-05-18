"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { useToast } from "@/components/Toast";

type Business = {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  createdAt: string;
};

export default function OnboardingPage() {
  const router = useRouter();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [businesses, setBusinesses] = useState<Business[]>([]);
  const hasBusiness = useMemo(() => businesses.length > 0, [businesses]);

  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
  });

  async function loadBusinesses() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/businesses", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load businesses");
      const data = await res.json();
      setBusinesses(data.businesses ?? []);
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : "Unexpected error";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadBusinesses();
  }, []);

  async function onCreateBusiness(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const res = await fetch("/api/businesses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          phone: form.phone || undefined,
          email: form.email || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to create business");

      await loadBusinesses();
      showToast({
        type: "success",
        message: "Business criado com sucesso.",
      });
      router.push("/dashboard");
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : "Unexpected error";
      setError(errorMessage);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="flex-1 flex items-center justify-center py-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-lg w-full space-y-8">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Onboarding</h1>
            <p className="mt-2 text-gray-600">
              Let&apos;s create your business. Then you can connect your Google Business Profile.
            </p>
          </div>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700 text-sm text-center">
              {error}
            </div>
          )}

          <div className="bg-white py-8 px-4 shadow-xl rounded-2xl sm:px-10 border border-gray-100">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-8">
                <svg className="animate-spin h-8 w-8 text-blue-600 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <div className="text-gray-600 font-medium">Loading information...</div>
              </div>
            ) : hasBusiness ? (
              <div className="space-y-6">
                <div className="rounded-xl border border-blue-100 bg-blue-50 p-6 text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 mb-4">
                    <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-blue-900">Business already created!</h3>
                  <div className="mt-2 text-sm text-blue-700">
                    <p className="font-semibold text-lg">{businesses[0].name}</p>
                    {businesses[0].email && <p className="mt-1">{businesses[0].email}</p>}
                    {businesses[0].phone && <p>{businesses[0].phone}</p>}
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  <Button
                    onClick={() => router.push("/dashboard")}
                  >
                    Go to Dashboard
                  </Button>
                </div>
              </div>
            ) : (
              <form className="space-y-6" onSubmit={onCreateBusiness}>
                <Input
                  id="name"
                  name="name"
                  type="text"
                  required
                  label={<>Business Name <span className="text-red-500">*</span></>}
                  placeholder="e.g. My Business"
                  value={form.name}
                  onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
                />

                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <Input
                    id="phone"
                    name="phone"
                    type="tel"
                    label="Phone"
                    placeholder="+61 ..."
                    value={form.phone}
                    onChange={(e) => setForm((s) => ({ ...s, phone: e.target.value }))}
                  />

                  <Input
                    id="email"
                    name="email"
                    type="email"
                    label="Email"
                    placeholder="contact@..."
                    value={form.email}
                    onChange={(e) => setForm((s) => ({ ...s, email: e.target.value }))}
                  />
                </div>

                <div>
                  <Button
                    type="submit"
                    isLoading={saving}
                  >
                    Create Business
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
