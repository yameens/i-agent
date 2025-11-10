import { db } from "@/server/db";
import { createClient } from "@/lib/supabase/server";

export type UserMembership = {
  organizationId: string;
  organizationName: string;
  organizationSlug: string;
  role: "OWNER" | "ADMIN" | "MEMBER";
};

export async function createTRPCContext() {
  const supabase = await createClient();
  
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // If user is authenticated, fetch their memberships
  let memberships: UserMembership[] = [];

  if (user) {
    const userMemberships = await db.membership.findMany({
      where: { userId: user.id },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    memberships = userMemberships.map((m) => ({
      organizationId: m.organizationId,
      organizationName: m.organization.name,
      organizationSlug: m.organization.slug,
      role: m.role as "OWNER" | "ADMIN" | "MEMBER",
    }));
  }

  return {
    db,
    user,
    memberships,
  };
}

export type Context = Awaited<ReturnType<typeof createTRPCContext>>;

