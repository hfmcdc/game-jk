'use client';
import dynamic from 'next/dynamic';

const Game = dynamic(() => import('../src/components/Game'), {
  ssr: false,
});

export default function Home() {
  return (
    <main className="min-h-screen bg-black">
      <Game />
    </main>
  );
}
