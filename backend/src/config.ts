import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  DISCOUNT_EVERY_NTH_ORDER: z.coerce.number().int().positive().default(3),
  DISCOUNT_PERCENTAGE: z.coerce.number().min(1).max(100).default(10),
  PORT: z.coerce.number().int().positive().default(3001),
  CORS_ORIGIN: z.string().default("http://localhost:3000"),
});

export const config = envSchema.parse(process.env);
