import { PrismaClient } from "@prisma/client";

// Single shared Prisma client for the whole process. Creating one per request
// would exhaust database connections.
export const prisma = new PrismaClient();
