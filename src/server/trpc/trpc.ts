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

// Middleware to ensure user is authenticated
const enforceUserIsAuthed = t.middleware(({ ctx, next }) => {
  if (!ctx.user || !ctx.organizationId) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next({
    ctx: {
      user: ctx.user,
      organizationId: ctx.organizationId,
      userRole: ctx.userRole!,
    },
  });
});

// Middleware to ensure user is admin or owner
const enforceUserIsAdmin = t.middleware(({ ctx, next }) => {
  if (!ctx.user || !ctx.organizationId) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  if (ctx.userRole !== "ADMIN" && ctx.userRole !== "OWNER") {
    throw new TRPCError({ code: "FORBIDDEN" });
  }
  return next({
    ctx: {
      user: ctx.user,
      organizationId: ctx.organizationId,
      userRole: ctx.userRole!,
    },
  });
});

export const protectedProcedure = t.procedure.use(enforceUserIsAuthed);
export const adminProcedure = t.procedure.use(enforceUserIsAdmin);

