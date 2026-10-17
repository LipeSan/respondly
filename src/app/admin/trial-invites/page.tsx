import { PageHeader } from "../ui";
import { AdminTrialInvites } from "./AdminTrialInvites";

export default function AdminTrialInvitesPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Trial invites" subtitle="Codes that give a business an extended free trial." />
      <AdminTrialInvites />
    </div>
  );
}
