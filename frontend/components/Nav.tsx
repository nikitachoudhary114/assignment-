"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { fetchCart } from "@/lib/api";

export function Nav() {
  const pathname = usePathname();
  const [itemCount, setItemCount] = useState(0);

  useEffect(() => {
    fetchCart()
      .then((cart) => setItemCount(cart.itemCount))
      .catch(() => setItemCount(0));
  }, [pathname]);

  return (
    <nav className="nav">
      <Link href="/" className="nav-brand">
        TechStore
      </Link>
      <div className="nav-links">
        <Link href="/" className={pathname === "/" ? "active" : ""}>
          Shop
        </Link>
        <Link href="/cart" className={pathname === "/cart" ? "active" : ""}>
          Cart
          {itemCount > 0 && <span className="badge">{itemCount}</span>}
        </Link>
        <Link href="/admin" className={pathname === "/admin" ? "active" : ""}>
          Admin
        </Link>
      </div>
    </nav>
  );
}
