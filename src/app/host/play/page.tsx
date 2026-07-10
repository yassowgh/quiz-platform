import { Suspense } from 'react';
import PlayClient from './PlayClient';
export default function Page() {
  return (
    <Suspense fallback={null}>
      <PlayClient />
    </Suspense>
  );
}
