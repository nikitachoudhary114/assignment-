import { Router } from "express";
import {
  generateDiscountIfEligible,
  getAdminStats,
} from "../services/store.service.js";

export const adminRouter = Router();

adminRouter.post("/api/admin/discount/generate", async (_req, res, next) => {
  try {
    const result = await generateDiscountIfEligible();
    res.json(result);
  } catch (error) {
    next(error);
  }
});

adminRouter.get("/api/admin/stats", async (_req, res, next) => {
  try {
    const stats = await getAdminStats();
    res.json({ stats });
  } catch (error) {
    next(error);
  }
});
