"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";

export default function RouteTracker() {
  const pathname = usePathname();
  useEffect(() => {
    try {
      const w = window as any;
      w.dataLayer = w.dataLayer || [];
      w.dataLayer.push({ event: "pageview", page_path: pathname, page_location: window.location.href, page_title: document.title });
    } catch (e) {}
  }, [pathname]);
  return null;
}
