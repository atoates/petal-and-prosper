import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { RoleProvider } from "@/components/auth/role-provider";
import { getCurrentRole } from "@/lib/auth/permissions-server";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const role = await getCurrentRole();

  return (
    <RoleProvider role={role}>
      <div className="bg-gray-50 min-h-screen">
        <Sidebar />
        <Header />
        <main className="pt-20 px-4 pb-8 sm:px-6 lg:ml-64 lg:px-8">{children}</main>
      </div>
    </RoleProvider>
  );
}
