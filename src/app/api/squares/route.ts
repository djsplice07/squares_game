import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import { sendPurchaseConfirmationEmail, sendSquareConfirmedEmail, sendSquareReleasedEmail } from '@/lib/autoEmail';

// Get all squares
export async function GET() {
  try {
    const squares = await prisma.square.findMany({
      include: { user: { select: { name: true, id: true, email: true } } },
      orderBy: { position: 'asc' },
    });

    return NextResponse.json(squares);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch squares' }, { status: 500 });
  }
}

// Purchase squares (guest or authenticated player)
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { positions, guestName, guestEmail, notes } = body;

    if (!positions || !Array.isArray(positions) || positions.length === 0) {
      return NextResponse.json({ error: 'No squares selected' }, { status: 400 });
    }

    if (positions.length > 10) {
      return NextResponse.json(
        { error: 'Maximum 10 squares per submission' },
        { status: 400 }
      );
    }

    const session = await getServerSession(authOptions);

    // Guest purchases require name and email
    if (!session && (!guestName || !guestEmail)) {
      return NextResponse.json(
        { error: 'Name and email are required for guest purchases' },
        { status: 400 }
      );
    }

    // Check all selected squares are available
    const existingSquares = await prisma.square.findMany({
      where: {
        position: { in: positions },
      },
    });

    const unavailable = existingSquares.filter(
      (s) => s.userId || s.guestName
    );

    if (unavailable.length > 0) {
      return NextResponse.json(
        {
          error: `Squares already taken: ${unavailable.map((s) => s.position).join(', ')}`,
        },
        { status: 400 }
      );
    }

    // Purchase the squares
    const now = new Date();
    for (const position of positions) {
      await prisma.square.update({
        where: { position },
        data: {
          userId: session ? (session.user as any).id : null,
          guestName: session ? null : guestName,
          guestEmail: session ? null : guestEmail,
          notes: notes || null,
          signupDate: now,
          confirmed: false,
        },
      });
    }

    // Send purchase confirmation email
    const buyerName = session ? session.user?.name || 'Player' : guestName;
    const buyerEmail = session ? session.user?.email : guestEmail;
    if (buyerEmail && buyerName) {
      sendPurchaseConfirmationEmail(buyerName, buyerEmail, positions);
    }

    return NextResponse.json({ success: true, count: positions.length });
  } catch {
    return NextResponse.json({ error: 'Purchase failed' }, { status: 500 });
  }
}

// Admin update square (confirm, release, edit)
export async function PATCH(request: Request) {
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
    const { position, action, guestName, guestEmail, notes } = body;

    if (action === 'bulk-reserve') {
      const { positions } = body;
      if (!positions || !Array.isArray(positions) || positions.length === 0) {
        return NextResponse.json({ error: 'Positions array required' }, { status: 400 });
      }

      // Validate all positions exist and are available
      const existingSquares = await prisma.square.findMany({
        where: { position: { in: positions } },
      });

      const unavailable = existingSquares.filter((s) => s.userId || s.guestName);
      if (unavailable.length > 0) {
        return NextResponse.json(
          { error: `Squares already taken: ${unavailable.map((s) => s.position).join(', ')}` },
          { status: 400 }
        );
      }

      const now = new Date();
      for (const pos of positions) {
        await prisma.square.update({
          where: { position: pos },
          data: {
            guestName: guestName || 'Reserved',
            guestEmail: guestEmail || null,
            notes: notes || null,
            confirmed: true,
            signupDate: now,
          },
        });
      }

      return NextResponse.json({ success: true, count: positions.length });
    }

    if (!position) {
      return NextResponse.json({ error: 'Position required' }, { status: 400 });
    }

    const square = await prisma.square.findUnique({
      where: { position },
      include: { user: { select: { name: true, email: true } } },
    });
    if (!square) {
      return NextResponse.json({ error: 'Square not found' }, { status: 404 });
    }

    if (action === 'confirm') {
      await prisma.square.update({
        where: { position },
        data: { confirmed: true },
      });
      sendSquareConfirmedEmail(position);
    } else if (action === 'release') {
      // Capture info before clearing
      const releaseName = square.user?.name || square.guestName;
      const releaseEmail = square.user?.email || square.guestEmail;

      await prisma.square.update({
        where: { position },
        data: {
          userId: null,
          guestName: null,
          guestEmail: null,
          notes: null,
          confirmed: false,
          signupDate: null,
          firstWin: false,
          halfWin: false,
          thirdWin: false,
          finalWin: false,
          reminderSent: false,
        },
      });

      if (releaseName && releaseEmail) {
        sendSquareReleasedEmail(releaseName, releaseEmail, position);
      }
    } else if (action === 'reserve') {
      await prisma.square.update({
        where: { position },
        data: {
          guestName: guestName || 'Reserved',
          guestEmail: guestEmail || null,
          notes: notes || null,
          confirmed: true,
          signupDate: new Date(),
        },
      });
    } else if (action === 'edit') {
      await prisma.square.update({
        where: { position },
        data: {
          guestName: guestName !== undefined ? guestName : undefined,
          guestEmail: guestEmail !== undefined ? guestEmail : undefined,
          notes: notes !== undefined ? notes : undefined,
        },
      });
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Update failed' }, { status: 500 });
  }
}
