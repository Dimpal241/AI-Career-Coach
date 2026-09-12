import { PrismaClient } from "../lib/generated/prisma";

export const db = globalThis.prisma || new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalThis.prisma = db;
}

// This is a workaround (globalThis.prisma AS Global Variable)to prevent the Prisma Client from being closed
// when the serverless function is invoked multiple times
// and to avoid the "PrismaClientInitializationError" error (development only)
 