import { Suspense } from 'react';
import EditClient from './EditClient';
export default function Page() {
  return (
    <Suspense fallback={null}>
      <EditClient />
    </Suspense>
  );
}
