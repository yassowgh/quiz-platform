import { Suspense } from "react";
import TriviaClient from "./TriviaClient";

export const metadata = {
  title: "Trivia — play solo vs the world or with family | QuizUps",
  description: "Free, joyful trivia. Play solo and climb the worldwide leaderboard, or invite your family by WhatsApp or QR. 10 categories, five languages, no sign-up to play.",
};

export default function Page() {
  return (
    <Suspense fallback={null}>
      <TriviaClient />
    </Suspense>
  );
}
