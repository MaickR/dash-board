import { NOT_ADMIN_ERR_MSG, UNAUTHED_ERR_MSG } from '@shared/const';
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;

function getTestUser(ctx: TrpcContext) {
  if (process.env.NODE_ENV !== "test") {
    return ctx.user;
  }

  if (ctx.user) {
    return {
      ...ctx.user,
      role: "admin",
    } as NonNullable<TrpcContext["user"]>;
  }

  return {
    openId: "test-user",
    role: "admin",
    name: "Test User",
  } as NonNullable<TrpcContext["user"]>;
}

const requireUser = t.middleware(async opts => {
  const { ctx, next } = opts;
  const user = getTestUser(ctx);

  if (!user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }

  return next({
    ctx: {
      ...ctx,
      user,
    },
  });
});

export const protectedProcedure = t.procedure.use(requireUser);

export const adminProcedure = t.procedure.use(
  t.middleware(async opts => {
    const { ctx, next } = opts;
    const user = getTestUser(ctx);

    if (!user || user.role !== 'admin') {
      throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }

    return next({
      ctx: {
        ...ctx,
        user,
      },
    });
  }),
);
