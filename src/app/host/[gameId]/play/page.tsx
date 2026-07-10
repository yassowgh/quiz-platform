import dynamic from 'next/dynamic';
const PlayClient = dynamic(() => import('./PlayClient'), { ssr: false });

export function generateStaticParams() { return []; }

export default function Page() {
  return <PlayClient />;
}
