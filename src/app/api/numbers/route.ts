import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import { generateShuffledNumbers } from '@/lib/utils';
import { sendNumbersAssignedEmails } from '@/lib/autoEmail';

export async function GET() {
  try {
    const gridNumbers = await prisma.gridNumber.findMany({
      orderBy: { position: 'asc' },
    });

    return NextResponse.json({ gridNumbers });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch numbers' }, { status: 500 });
  }
}

export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Check if numbers already exist
    const existing = await prisma.gridNumber.count();
    if (existing > 0) {
      return NextResponse.json(
        { error: 'Numbers have already been generated' },
        { status: 400 }
      );
    }

    // Check all 100 squares are claimed
    const squares = await prisma.square.findMany();
    const claimed = squares.filter((s) => s.userId || s.guestName).length;
    if (claimed < 100) {
      return NextResponse.json(
        { error: `Only ${claimed}/100 squares are filled. All must be filled first.` },
        { status: 400 }
      );
    }

    // Generate shuffled numbers
    const nfcNumbers = generateShuffledNumbers();
    const afcNumbers = generateShuffledNumbers();

    const gridNumbers = [];
    for (let i = 0; i < 10; i++) {
      const gn = await prisma.gridNumber.create({
        data: {
          position: i,
          nfcNumber: nfcNumbers[i],
          afcNumber: afcNumbers[i],
        },
      });
      gridNumbers.push(gn);
    }

    // Send numbers assigned emails to all participants
    sendNumbersAssignedEmails();

    return NextResponse.json({ gridNumbers });
  } catch {
    return NextResponse.json({ error: 'Failed to generate numbers' }, { status: 500 });
  }
}
