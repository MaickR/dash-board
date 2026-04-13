import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { ENV } from "./env";
import { sdk } from "./sdk";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

function shouldUseDevelopmentAuthFallback() {
  return (
    (process.env.NODE_ENV === "development" || ENV.allowLocalFallback) &&
    (!ENV.oAuthServerUrl || !ENV.appId || !ENV.cookieSecret)
  );
}

function createDevelopmentUser(): User {
  const now = new Date();

  return {
    id: 0,
    openId: "local-dev-user",
    name: "Desarrollo Local",
    email: ENV.allowLocalFallback ? "demo@dashboard.local" : "local@dashboard.dev",
    loginMethod: "development",
    role: "admin",
    createdAt: now,
    updatedAt: now,
    lastSignedIn: now,
  };
}

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  if (shouldUseDevelopmentAuthFallback()) {
    return {
      req: opts.req,
      res: opts.res,
      user: createDevelopmentUser(),
    };
  }

  let user: User | null = null;

  try {
    user = await sdk.authenticateRequest(opts.req);
  } catch (error) {
    user = null;
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
