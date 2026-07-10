import dynamic from 'next/dynamic';
const PlayerClient = dynamic(() => import('./PlayerClient'), { ssr: false });

export function generateStaticParams() { return []; }

export default function Page() {
  return <PlayerClient />;
}
