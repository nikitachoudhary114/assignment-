"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  checkout,
  fetchCart,
  formatCurrency,
  removeFromCart,
  updateCartItem,
  validateDiscount,
  type Cart,
} from "@/lib/api";

export default function CartPage() {
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(true);
  const [discountCode, setDiscountCode] = useState("");
  const [appliedDiscount, setAppliedDiscount] = useState<{
    code: string;
    percentage: number;
  } | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function loadCart() {
    try {
      const data = await fetchCart();
      setCart(data);
    } catch (err) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to load cart.",
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCart();
  }, []);

  const discountCents = appliedDiscount
    ? Math.round((cart?.subtotalCents ?? 0) * appliedDiscount.percentage / 100)
    : 0;
  const totalCents = (cart?.subtotalCents ?? 0) - discountCents;

  async function handleApplyDiscount() {
    if (!discountCode.trim()) return;
    setBusy(true);
    setMessage(null);
    try {
      const result = await validateDiscount(discountCode.trim());
      if (result.valid && result.code && result.percentage) {
        setAppliedDiscount({ code: result.code, percentage: result.percentage });
        setMessage({ type: "success", text: `Code ${result.code} applied (${result.percentage}% off).` });
      }
    } catch (err) {
      setAppliedDiscount(null);
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Invalid discount code.",
      });
    } finally {
      setBusy(false);
    }
  }

  async function handleCheckout() {
    setBusy(true);
    setMessage(null);
    try {
      const result = await checkout(appliedDiscount?.code);
      let text = `Order #${result.order.orderNumber} placed! Total: ${formatCurrency(result.order.totalCents)}`;
      if (result.earnedDiscountCode) {
        text += ` You earned discount code: ${result.earnedDiscountCode}`;
      }
      setMessage({ type: "success", text });
      setAppliedDiscount(null);
      setDiscountCode("");
      await loadCart();
    } catch (err) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Checkout failed.",
      });
    } finally {
      setBusy(false);
    }
  }

  async function changeQty(productId: string, quantity: number) {
    setBusy(true);
    try {
      const updated = await updateCartItem(productId, quantity);
      setCart(updated);
    } catch (err) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Update failed.",
      });
    } finally {
      setBusy(false);
    }
  }

  async function handleRemove(productId: string) {
    setBusy(true);
    try {
      const updated = await removeFromCart(productId);
      setCart(updated);
    } catch (err) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Remove failed.",
      });
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return <p className="page-subtitle">Loading cart...</p>;
  }

  return (
    <>
      <h1 className="page-title">Your Cart</h1>

      {message && <div className={`alert ${message.type}`}>{message.text}</div>}

      {!cart || cart.items.length === 0 ? (
        <div className="empty-state card">
          <p>Your cart is empty.</p>
          <Link href="/" style={{ marginTop: "1rem", display: "inline-block" }}>
            <button>Continue shopping</button>
          </Link>
        </div>
      ) : (
        <div className="grid" style={{ gridTemplateColumns: "1fr 340px", alignItems: "start" }}>
          <section className="card">
            {cart.items.map((item) => (
              <div key={item.id} className="cart-item">
                <div>
                  <strong>{item.name}</strong>
                  <div style={{ color: "var(--muted)", fontSize: "0.9rem" }}>
                    {formatCurrency(item.priceCents)} each
                  </div>
                </div>
                <div className="qty-controls">
                  <button
                    className="secondary"
                    disabled={busy}
                    onClick={() => changeQty(item.productId, item.quantity - 1)}
                  >
                    −
                  </button>
                  <span>{item.quantity}</span>
                  <button
                    className="secondary"
                    disabled={busy}
                    onClick={() => changeQty(item.productId, item.quantity + 1)}
                  >
                    +
                  </button>
                  <button
                    className="danger"
                    disabled={busy}
                    onClick={() => handleRemove(item.productId)}
                  >
                    Remove
                  </button>
                </div>
                <div>{formatCurrency(item.lineTotalCents)}</div>
              </div>
            ))}
          </section>

          <section className="card">
            <h3 style={{ marginBottom: "1rem" }}>Order summary</h3>
            <div className="summary-row">
              <span>Subtotal</span>
              <span>{formatCurrency(cart.subtotalCents)}</span>
            </div>
            {appliedDiscount && (
              <div className="summary-row discount-row">
                <span>Discount ({appliedDiscount.percentage}%)</span>
                <span>−{formatCurrency(discountCents)}</span>
              </div>
            )}
            <div className="summary-row total">
              <span>Total</span>
              <span>{formatCurrency(totalCents)}</span>
            </div>

            <div className="checkout-form">
              <input
                placeholder="Discount code"
                value={discountCode}
                onChange={(e) => setDiscountCode(e.target.value.toUpperCase())}
              />
              <button className="secondary" disabled={busy} onClick={handleApplyDiscount}>
                Apply
              </button>
            </div>

            <button
              style={{ width: "100%", marginTop: "1rem" }}
              disabled={busy}
              onClick={handleCheckout}
            >
              {busy ? "Processing..." : "Checkout"}
            </button>
          </section>
        </div>
      )}
    </>
  );
}
