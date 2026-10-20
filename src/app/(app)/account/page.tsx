import Link from "next/link";
import { getCurrentUserAndBusiness } from "@/lib/currentBusiness";
import { Button } from "@/components/Button";
import { Card, CardHeader } from "@/components/Card";
import { Text } from "@/components/Text";

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-gray-50 px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">{label}</p>
      <p className="mt-1 truncate text-sm text-gray-900">{value}</p>
    </div>
  );
}

export default async function AccountPage() {
  const { user, business } = await getCurrentUserAndBusiness();
  const googleConnected = Boolean(business?.googleLocationId);

  return (
    <div className="pb-12">
      <main className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        <div>
          <Text variant="h1">Account</Text>
          <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-green-600">
            Manage your profile and account settings.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="flex flex-col">
            <CardHeader
              title="Profile"
              subtitle="The details you sign in with."
              action={
                <Link href="/forgot-password" className="shrink-0">
                  <Button variant="outline" className="!w-auto px-4 py-2">
                    Reset password
                  </Button>
                </Link>
              }
            />
            <p className="mt-5 truncate text-2xl font-bold tracking-tight text-gray-900">{user?.name || "—"}</p>
            <div className="mt-4 grid gap-3">
              <Field label="Email" value={user?.email || "—"} />
            </div>
          </Card>

          <Card className="flex flex-col">
            <CardHeader
              title="Business"
              subtitle="Used in your replies and templates."
              action={
                googleConnected ? (
                  <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">
                    Google connected
                  </span>
                ) : (
                  <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
                    Google not connected
                  </span>
                )
              }
            />
            <p className="mt-5 truncate text-2xl font-bold tracking-tight text-gray-900">{business?.name || "—"}</p>
            <div className="mt-4 grid flex-1 content-start gap-3">
              <Field label="Timezone" value={business?.timezone || "—"} />
            </div>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link href="/subscription" className="w-full sm:w-auto">
                <Button className="!w-full px-4 py-2 sm:!w-auto">Manage subscription</Button>
              </Link>
              <Link href="/configuration" className="w-full sm:w-auto">
                <Button variant="outline" className="!w-full px-4 py-2 sm:!w-auto">
                  Configuration
                </Button>
              </Link>
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
}
