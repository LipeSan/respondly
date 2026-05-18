import Link from "next/link";
import { getCurrentUserAndBusiness } from "@/lib/currentBusiness";
import { Button } from "@/components/Button";
import { Text } from "@/components/Text";

export default async function AccountPage() {
  const { user, business } = await getCurrentUserAndBusiness();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="flex items-start justify-between gap-6">
          <div>
            <Text variant="h1">Account</Text>
            <Text variant="subtitle" className="mt-2">
              Manage your profile and account settings.
            </Text>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6">
            <Text variant="h2" className="!text-lg">
              Profile
            </Text>

            <div className="mt-4 space-y-3">
              <div>
                <Text
                  variant="body"
                  className="text-xs font-semibold text-gray-500 uppercase tracking-wider"
                >
                  Name
                </Text>
                <Text variant="body" className="mt-1 text-gray-900">
                  {user?.name || "—"}
                </Text>
              </div>
              <div>
                <Text
                  variant="body"
                  className="text-xs font-semibold text-gray-500 uppercase tracking-wider"
                >
                  Email
                </Text>
                <Text variant="body" className="mt-1 text-gray-900">
                  {user?.email || "—"}
                </Text>
              </div>
            </div>

            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              <Link href="/forgot-password" className="w-full sm:w-auto">
                <Button variant="outline" className="!w-full sm:!w-auto">
                  Reset password
                </Button>
              </Link>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6">
            <Text variant="h2" className="!text-lg">
              Business
            </Text>

            <div className="mt-4 space-y-3">
              <div>
                <Text
                  variant="body"
                  className="text-xs font-semibold text-gray-500 uppercase tracking-wider"
                >
                  Business name
                </Text>
                <Text variant="body" className="mt-1 text-gray-900">
                  {business?.name || "—"}
                </Text>
              </div>
              <div>
                <Text
                  variant="body"
                  className="text-xs font-semibold text-gray-500 uppercase tracking-wider"
                >
                  Timezone
                </Text>
                <Text variant="body" className="mt-1 text-gray-900">
                  {business?.timezone || "—"}
                </Text>
              </div>
              <div>
                <Text
                  variant="body"
                  className="text-xs font-semibold text-gray-500 uppercase tracking-wider"
                >
                  Google connection
                </Text>
                <Text variant="body" className="mt-1 text-gray-900">
                  {business?.googleLocationId ? "Connected" : "Not connected"}
                </Text>
              </div>
            </div>

            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              <Link href="/subscription" className="w-full sm:w-auto">
                <Button className="!w-full sm:!w-auto">Manage subscription</Button>
              </Link>
              <Link href="/configuration" className="w-full sm:w-auto">
                <Button variant="outline" className="!w-full sm:!w-auto">
                  Configuration
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
