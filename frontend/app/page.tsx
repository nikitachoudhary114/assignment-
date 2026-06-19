"use client";

import { useEffect, useState } from "react";
import {
  addToCart,
  fetchProducts,
  formatCurrency,
  type Product,
} from "@/lib/api";

export default function ShopPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [addingId, setAddingId] = useState<string | null>(null);

  useEffect(() => {
    fetchProducts()
      .then(setProducts)
      .catch((err) => setMessage(err.message))
      .finally(() => setLoading(false));
  }, []);

  async function handleAdd(product: Product) {
    setAddingId(product.id);
    setMessage(null);
    try {
      await addToCart(product.id);
      setMessage(`${product.name} added to cart.`);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to add item.");
    } finally {
      setAddingId(null);
    }
  }

  if (loading) {
    return <p className="page-subtitle">Loading products...</p>;
  }

  return (
    <>
      <h1 className="page-title">Shop</h1>
      <p className="page-subtitle">
        Add items to your cart and checkout. Every 3rd order earns a discount
        code!
      </p>

      {message && (
        <div
          className={`alert ${message.includes("added") ? "success" : "error"}`}
        >
          {message}
        </div>
      )}

      <div className="grid">
        {products.map((product) => (
          <article key={product.id} className="card">
            <h3>{product.name}</h3>
            <p>{product.description}</p>
            <div className="price">{formatCurrency(product.priceCents)}</div>
            <p style={{ color: "var(--muted)", fontSize: "0.85rem" }}>
              {product.stock} in stock
            </p>
            <button
              onClick={() => handleAdd(product)}
              disabled={addingId === product.id || product.stock === 0}
            >
              {product.stock === 0 ? "Out of stock" : "Add to cart"}
            </button>
          </article>
        ))}
      </div>
    </>
  );
}
