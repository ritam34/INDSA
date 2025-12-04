// import { PrismaClient } from "../generated/prisma/index.js";

// const globalForPrisma = globalThis;

// export const db = globalForPrisma.prisma || new PrismaClient();

// if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;

// Another option-->

import { PrismaClient } from "../generated/prisma/index.js";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
});

await client.connect();

export const db = new PrismaClient({
  adapter: new PrismaPg(client),
});
