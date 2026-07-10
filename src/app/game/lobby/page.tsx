import { Suspense } from 'react';
import LobbyClient from './LobbyClient';
export default function Page() {
  return (
    <Suspense fallback={null}>
      <LobbyClient />
    </Suspense>
  );
}
