import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { SquareGrid } from '@/components/grid/SquareGrid';
import { GridHeader } from '@/components/grid/GridHeader';
import { ChatWindow } from '@/components/chat/ChatWindow';
import { findWinnerPosition } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  // Redirect to setup if no admin account exists yet
  const adminCount = await prisma.user.count({ where: { role: 'ADMIN' } });
  if (adminCount === 0) {
    redirect('/setup');
  }

  const settings = await prisma.gameSettings.findUnique({
    where: { id: 'singleton' },
  });

  const squares = await prisma.square.findMany({
    include: { user: { select: { name: true, id: true } } },
    orderBy: { position: 'asc' },
  });

  const gridNumbers = await prisma.gridNumber.findMany({
    orderBy: { position: 'asc' },
  });

  const scores = await prisma.score.findUnique({
    where: { id: 'singleton' },
  });

  // Calculate winners for display
  let winners: Record<string, { position: string; name: string }> | null = null;
  if (scores && gridNumbers.length === 10) {
    winners = {};
    const quarters = [
      { key: 'first', nfc: scores.nfcFirst, afc: scores.afcFirst },
      { key: 'half', nfc: scores.nfcHalf, afc: scores.afcHalf },
      { key: 'third', nfc: scores.nfcThird, afc: scores.afcThird },
      { key: 'final', nfc: scores.nfcFinal, afc: scores.afcFinal },
    ];
    for (const q of quarters) {
      if (q.nfc !== null && q.afc !== null) {
        const pos = findWinnerPosition(q.nfc, q.afc, gridNumbers);
        if (pos) {
          const sq = squares.find((s) => s.position === pos);
          if (sq) {
            winners[q.key] = {
              position: pos,
              name: sq.user?.name || sq.guestName || 'Unknown',
            };
          }
        }
      }
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-950 to-black">
      <GridHeader settings={settings} />
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <SquareGrid
              squares={squares}
              gridNumbers={gridNumbers}
              settings={settings}
              scores={scores}
              winners={winners}
            />
          </div>
          <div className="lg:col-span-1">
            <ChatWindow />
          </div>
        </div>
      </div>
    </main>
  );
}
