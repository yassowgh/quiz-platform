import { Suspense } from "react";
import VideoQuizClient from "./VideoQuizClient";

export default function WatchPage() {
  return (
    <Suspense fallback={<div className="p-10 text-center text-gray-500 font-bold">Loading...</div>}>
      <VideoQuizClient />
    </Suspense>
  );
}
