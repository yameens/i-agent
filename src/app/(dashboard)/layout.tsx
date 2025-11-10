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

  // Fetch user's organization
  const dbUser = await db.user.findUnique({
    where: { id: user.id },
    include: {
      organization: true,
    },
  });

  if (!dbUser) {
    // User exists in Supabase but not in our DB - redirect to setup
    redirect("/auth/setup-org");
  }

  return (
    <div className="min-h-screen bg-background">
      <Nav
        user={{ email: user.email! }}
        organizationName={dbUser.organization.name}
      />
      <main className="container mx-auto py-6 px-6">{children}</main>
    </div>
  );
}

