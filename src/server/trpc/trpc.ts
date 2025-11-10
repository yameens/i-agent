import { initTRPC, TRPCError } from "@trpc/server";
import { type Context } from "./context";
import superjson from "superjson";
import { ZodError } from "zod";

const t = initTRPC.context<Context>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

export const createTRPCRouter = t.router;
export const publicProcedure = t.procedure;

// Middleware to ensure user is authenticated and has at least one membership
const enforceUserIsAuthed = t.middleware(({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ 
      code: "UNAUTHORIZED",
      message: "You must be logged in to access this resource"
    });
  }
  
  if (ctx.memberships.length === 0) {
    throw new TRPCError({ 
      code: "FORBIDDEN",
      message: "You must be a member of an organization to access this resource"
    });
  }
  
  return next({
    ctx: {
      user: ctx.user,
      memberships: ctx.memberships,
    },
  });
});

// Middleware to ensure user has admin/owner role in at least one org
const enforceUserIsAdmin = t.middleware(({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ 
      code: "UNAUTHORIZED",
      message: "You must be logged in to access this resource"
    });
  }
  
  const hasAdminRole = ctx.memberships.some(
    (m) => m.role === "ADMIN" || m.role === "OWNER"
  );
  
  if (!hasAdminRole) {
    throw new TRPCError({ 
      code: "FORBIDDEN",
      message: "You must have admin or owner role to perform this action"
    });
  }
  
  return next({
    ctx: {
      user: ctx.user,
      memberships: ctx.memberships,
    },
  });
});

// Helper to check if user has access to a specific org
export function hasOrgAccess(
  memberships: Context["memberships"],
  organizationId: string
): boolean {
  return memberships.some((m) => m.organizationId === organizationId);
}

// Helper to check if user has admin/owner role in a specific org
export function hasOrgAdminAccess(
  memberships: Context["memberships"],
  organizationId: string
): boolean {
  return memberships.some(
    (m) =>
      m.organizationId === organizationId &&
      (m.role === "ADMIN" || m.role === "OWNER")
  );
}

export const protectedProcedure = t.procedure.use(enforceUserIsAuthed);
export const adminProcedure = t.procedure.use(enforceUserIsAdmin);

