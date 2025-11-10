import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/server/db";
import { Nav } from "@/components/layout/nav";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch user's memberships
  const memberships = await db.membership.findMany({
    where: { userId: user.id },
    include: {
      organization: true,
    },
  });

  if (memberships.length === 0) {
    // User exists in Supabase but has no org memberships - redirect to setup
    redirect("/auth/setup-org");
  }

  // Use first membership's org for display (in future, add org switcher)
  const primaryMembership = memberships[0];

  return (
    <div className="min-h-screen bg-background">
      <Nav
        user={{ email: user.email! }}
        organizationName={primaryMembership.organization.name}
      />
      <main className="container mx-auto py-6 px-6">{children}</main>
    </div>
  );
}

