import { Suspense } from "react";
import PageClient from "./PageClient";

export const dynamic = "force-static";

export default function CustomPage() {
  return (
    <Suspense fallback={<div className="p-10 text-center text-gray-500 font-bold">Loading…</div>}>
      <PageClient />
    </Suspense>
  );
}
