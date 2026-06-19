"use client";

import { useEffect, useState } from "react";
import {
  fetchAdminStats,
  formatCurrency,
  generateDiscount,
  type AdminStats,
} from "@/lib/api";

export default function AdminPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);
  const [generating, setGenerating] = useState(false);

  async function loadStats() {
    try {
      const data = await fetchAdminStats();
      setStats(data);
    } catch (err) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to load stats.",
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadStats();
  }, []);

  async function handleGenerate() {
    setGenerating(true);
    setMessage(null);
    try {
      const result = await generateDiscount();
      setMessage({
        type: result.generated ? "success" : "info",
        text: result.code
          ? `${result.message} Code: ${result.code}`
          : result.message,
      });
      await loadStats();
    } catch (err) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Generation failed.",
      });
    } finally {
      setGenerating(false);
    }
  }

  if (loading) {
    return <p className="page-subtitle">Loading admin dashboard...</p>;
  }

  return (
    <>
      <h1 className="page-title">Admin Dashboard</h1>
      <p className="page-subtitle">
        Store metrics and discount management. Discounts are issued every{" "}
        {stats?.discountEveryNthOrder ?? 3} orders at{" "}
        {stats?.discountPercentage ?? 10}% off.
      </p>

      {message && <div className={`alert ${message.type}`}>{message.text}</div>}

      <button onClick={handleGenerate} disabled={generating}>
        {generating ? "Checking..." : "Generate discount code (if eligible)"}
      </button>

      {stats && (
        <>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="label">Items purchased</div>
              <div className="value">{stats.totalItemsPurchased}</div>
            </div>
            <div className="stat-card">
              <div className="label">Total revenue</div>
              <div className="value">{formatCurrency(stats.totalRevenueCents)}</div>
            </div>
            <div className="stat-card">
              <div className="label">Total discounts given</div>
              <div className="value">{formatCurrency(stats.totalDiscountCents)}</div>
            </div>
            <div className="stat-card">
              <div className="label">Total orders</div>
              <div className="value">{stats.totalOrders}</div>
            </div>
            <div className="stat-card">
              <div className="label">Discount codes</div>
              <div className="value">{stats.discountCodes.length}</div>
            </div>
          </div>

          <section className="card">
            <h3>Discount codes</h3>
            {stats.discountCodes.length === 0 ? (
              <p className="empty-state">No discount codes yet.</p>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>% Off</th>
                    <th>Status</th>
                    <th>Earned by order</th>
                    <th>Created</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.discountCodes.map((dc) => (
                    <tr key={dc.code}>
                      <td><code>{dc.code}</code></td>
                      <td>{dc.percentage}%</td>
                      <td>
                        <span className={`tag ${dc.isUsed ? "used" : "available"}`}>
                          {dc.isUsed ? "Used" : "Available"}
                        </span>
                      </td>
                      <td>{dc.earnedByOrderNumber ?? "—"}</td>
                      <td>{new Date(dc.createdAt).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        </>
      )}
    </>
  );
}
