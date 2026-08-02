import { Suspense } from "react";
import StudyClient from "./StudyClient";

export default function StudyPage() {
  return (
    <Suspense fallback={<div className="p-10 text-center text-gray-500 font-bold">Loading...</div>}>
      <StudyClient />
    </Suspense>
  );
}
