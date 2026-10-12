import { requireAdminPage } from "@/lib/admin";
import { AdminNav } from "./admin-nav";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdminPage();

  return (
    <>
      <AdminNav />
      {children}
    </>
  );
}
