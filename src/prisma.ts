import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function currentClient() {
  const cached = globalForPrisma.prisma;
  // Dev keeps this client on globalThis. After `prisma generate` that copy
  // is missing new models until the process is replaced.
  if (cached && "locktoberCard" in cached) return cached;
  const created = new PrismaClient();
  if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = created;
  return created;
}

export const prisma = currentClient();
