import { Suspense } from "react";
import ReportsClient from "./ReportsClient";

export default function ReportsPage() {
  return (
    <Suspense fallback={<div className="p-10 text-center text-gray-500 font-bold">Loading report...</div>}>
      <ReportsClient />
    </Suspense>
  );
}
