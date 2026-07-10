import { Suspense } from 'react';
import PlayerClient from './PlayerClient';
export default function Page() {
  return (
    <Suspense fallback={null}>
      <PlayerClient />
    </Suspense>
  );
}
