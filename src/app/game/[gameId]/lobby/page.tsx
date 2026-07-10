import dynamic from 'next/dynamic';
const LobbyClient = dynamic(() => import('./LobbyClient'), { ssr: false });

export function generateStaticParams() { return []; }

export default function Page() {
  return <LobbyClient />;
}
