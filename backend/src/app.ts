import cors from "cors";
import express from "express";
import { ZodError } from "zod";
import { config } from "./config.js";
import { adminRouter } from "./routes/admin.routes.js";
import { storeRouter } from "./routes/store.routes.js";
import { CartError, CheckoutError } from "./services/store.service.js";

export function buildApp() {
  const app = express();

  app.use(cors({ origin: config.CORS_ORIGIN }));
  app.use(express.json());

  app.get("/health", (_req, res) => {
    res.json({
      status: "ok",
      timestamp: new Date().toISOString(),
    });
  });

  app.use(storeRouter);
  app.use(adminRouter);

  app.use(
    (
      error: unknown,
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction
    ) => {
      if (error instanceof ZodError) {
        return res.status(400).json({
          error: "Validation failed",
          details: error.errors,
        });
      }

      if (error instanceof CartError || error instanceof CheckoutError) {
        return res.status(error.statusCode).json({ error: error.message });
      }

      console.error(error);
      return res.status(500).json({ error: "Internal server error" });
    }
  );

  return app;
}
