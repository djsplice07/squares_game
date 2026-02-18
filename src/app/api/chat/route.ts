import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const role = (session.user as any).role;
    if (role !== 'ADMIN' && role !== 'VIEWER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');

    if (type === 'blacklist') {
      const words = await prisma.chatBlacklist.findMany({
        orderBy: { word: 'asc' },
      });
      return NextResponse.json({ words });
    }

    // Default: get messages
    const messages = await prisma.chatMessage.findMany({
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: { user: { select: { name: true } } },
    });

    return NextResponse.json({ messages });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
  }
}

// Add blacklist word
export async function POST(request: Request) {
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

    if (body.type === 'blacklist' && body.word) {
      await prisma.chatBlacklist.create({
        data: { word: body.word.toLowerCase() },
      });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'Word already blacklisted' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

// Delete message or blacklist word
export async function DELETE(request: Request) {
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

    if (body.type === 'blacklist' && body.wordId) {
      await prisma.chatBlacklist.delete({ where: { id: body.wordId } });
      return NextResponse.json({ success: true });
    }

    if (body.messageId) {
      await prisma.chatMessage.update({
        where: { id: body.messageId },
        data: { deleted: true },
      });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  } catch {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
