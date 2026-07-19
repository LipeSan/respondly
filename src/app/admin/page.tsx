import { Text } from "@/components/Text";
import { AdminDashboard } from "./AdminDashboard";

export default function AdminPage() {
  return (
    <div className="space-y-8">
      <div>
        <Text variant="h1">Admin Area</Text>
        <Text variant="subtitle" className="mt-2">
          Access customer accounts, inspect subscription health, and manage templates, rules, and configuration.
        </Text>
      </div>
      <AdminDashboard />
    </div>
  );
}
