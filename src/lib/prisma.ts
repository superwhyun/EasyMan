// Prisma client singleton - Force re-load
import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

// Force a new instance to pick up schema changes
export const prisma = new PrismaClient();
globalForPrisma.prisma = prisma;
