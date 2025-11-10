import { db } from "@/server/db";
import { createClient } from "@/lib/supabase/server";

export async function createTRPCContext() {
  const supabase = await createClient();
  
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // If user is authenticated, fetch their organization
  let organizationId: string | null = null;
  let userRole: string | null = null;

  if (user) {
    const dbUser = await db.user.findUnique({
      where: { id: user.id },
      select: { organizationId: true, role: true },
    });

    if (dbUser) {
      organizationId = dbUser.organizationId;
      userRole = dbUser.role;
    }
  }

  return {
    db,
    user,
    organizationId,
    userRole,
  };
}

export type Context = Awaited<ReturnType<typeof createTRPCContext>>;

