import { Router } from "express";
import { z } from "zod";
import {
  addToCart,
  CartError,
  checkout,
  getCart,
  listProducts,
  removeFromCart,
  updateCartItem,
  validateDiscountCode,
} from "../services/store.service.js";

const sessionHeader = "x-session-id";

function getSessionId(headers: Record<string, string | string[] | undefined>): string {
  const sessionId = headers[sessionHeader];
  if (typeof sessionId !== "string" || !sessionId.trim()) {
    throw new CartError("Missing x-session-id header.", 400);
  }
  return sessionId.trim();
}

export const storeRouter = Router();

storeRouter.get("/api/products", async (_req, res, next) => {
  try {
    const products = await listProducts();
    res.json({ products });
  } catch (error) {
    next(error);
  }
});

storeRouter.get("/api/cart", async (req, res, next) => {
  try {
    const sessionId = getSessionId(req.headers);
    const cart = await getCart(sessionId);
    res.json({ cart });
  } catch (error) {
    next(error);
  }
});

storeRouter.post("/api/cart/items", async (req, res, next) => {
  try {
    const body = z
      .object({
        productId: z.string().min(1),
        quantity: z.number().int().positive().default(1),
      })
      .parse(req.body);

    const sessionId = getSessionId(req.headers);
    const cart = await addToCart(sessionId, body.productId, body.quantity);
    res.json({ cart });
  } catch (error) {
    next(error);
  }
});

storeRouter.patch("/api/cart/items/:productId", async (req, res, next) => {
  try {
    const params = z.object({ productId: z.string().min(1) }).parse(req.params);
    const body = z.object({ quantity: z.number().int() }).parse(req.body);

    const sessionId = getSessionId(req.headers);
    const cart = await updateCartItem(
      sessionId,
      params.productId,
      body.quantity
    );
    res.json({ cart });
  } catch (error) {
    next(error);
  }
});

storeRouter.delete("/api/cart/items/:productId", async (req, res, next) => {
  try {
    const params = z.object({ productId: z.string().min(1) }).parse(req.params);

    const sessionId = getSessionId(req.headers);
    const cart = await removeFromCart(sessionId, params.productId);
    res.json({ cart });
  } catch (error) {
    next(error);
  }
});

storeRouter.post("/api/discount/validate", async (req, res, next) => {
  try {
    const body = z.object({ code: z.string().min(1) }).parse(req.body);
    const result = await validateDiscountCode(body.code);
    if (!result.valid) {
      return res.status(400).json(result);
    }
    res.json(result);
  } catch (error) {
    next(error);
  }
});

storeRouter.post("/api/checkout", async (req, res, next) => {
  try {
    const body = z
      .object({
        discountCode: z.string().optional(),
      })
      .parse(req.body ?? {});

    const sessionId = getSessionId(req.headers);
    const result = await checkout(sessionId, body.discountCode);
    res.json(result);
  } catch (error) {
    next(error);
  }
});
