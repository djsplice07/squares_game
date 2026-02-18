import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import { findWinnerPosition } from '@/lib/utils';
import { sendGameResultsEmails } from '@/lib/autoEmail';

export async function GET() {
  try {
    const scores = await prisma.score.findUnique({
      where: { id: 'singleton' },
    });

    const gridNumbers = await prisma.gridNumber.findMany({
      orderBy: { position: 'asc' },
    });

    let winners = null;
    if (scores && gridNumbers.length === 10) {
      winners = await calculateWinners(scores, gridNumbers);
    }

    return NextResponse.json({ scores, winners });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch scores' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const role = (session.user as any).role;
    if (role !== 'ADMIN' && role !== 'VIEWER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await request.json();

    const scores = await prisma.score.upsert({
      where: { id: 'singleton' },
      update: body,
      create: { id: 'singleton', ...body },
    });

    // Calculate and mark winners
    const gridNumbers = await prisma.gridNumber.findMany({
      orderBy: { position: 'asc' },
    });

    let winners = null;
    if (gridNumbers.length === 10) {
      // Reset all wins first
      await prisma.square.updateMany({
        data: { firstWin: false, halfWin: false, thirdWin: false, finalWin: false },
      });

      winners = await calculateWinners(scores, gridNumbers);

      // Send game results email when final scores are entered
      if (body.nfcFinal !== undefined && body.afcFinal !== undefined && winners) {
        sendGameResultsEmails(winners);
      }
    }

    return NextResponse.json({ scores, winners });
  } catch {
    return NextResponse.json({ error: 'Failed to save scores' }, { status: 500 });
  }
}

async function calculateWinners(
  scores: any,
  gridNumbers: { position: number; nfcNumber: number; afcNumber: number }[]
) {
  const winners: any = {};

  const quarters = [
    { key: 'first', nfc: scores.nfcFirst, afc: scores.afcFirst, field: 'firstWin' },
    { key: 'half', nfc: scores.nfcHalf, afc: scores.afcHalf, field: 'halfWin' },
    { key: 'third', nfc: scores.nfcThird, afc: scores.afcThird, field: 'thirdWin' },
    { key: 'final', nfc: scores.nfcFinal, afc: scores.afcFinal, field: 'finalWin' },
  ];

  for (const q of quarters) {
    if (q.nfc !== null && q.afc !== null) {
      const pos = findWinnerPosition(q.nfc, q.afc, gridNumbers);
      if (pos) {
        const square = await prisma.square.findUnique({
          where: { position: pos },
          include: { user: { select: { name: true } } },
        });

        if (square) {
          await prisma.square.update({
            where: { position: pos },
            data: { [q.field]: true },
          });

          winners[q.key] = {
            position: pos,
            name: square.user?.name || square.guestName || 'Unknown',
          };
        }
      }
    }
  }

  return winners;
}
