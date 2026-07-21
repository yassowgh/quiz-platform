import { Suspense } from "react";
import AssignmentClient from "./AssignmentClient";

export default function AssignmentPage() {
  return (
    <Suspense fallback={<div className="p-10 text-center text-gray-500 font-bold">Loading...</div>}>
      <AssignmentClient />
    </Suspense>
  );
}
