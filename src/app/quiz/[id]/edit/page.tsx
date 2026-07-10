import dynamic from 'next/dynamic';
const EditClient = dynamic(() => import('./EditClient'), { ssr: false });

export function generateStaticParams() { return []; }

export default function Page() {
  return <EditClient />;
}
