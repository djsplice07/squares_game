import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import { sendEmail, renderTemplate } from '@/lib/email';

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

    if (type === 'templates') {
      const templates = await prisma.emailTemplate.findMany({
        orderBy: { name: 'asc' },
      });
      return NextResponse.json(templates);
    }

    if (type === 'smtp') {
      const settings = await prisma.emailSettings.findUnique({
        where: { id: 'singleton' },
      });
      return NextResponse.json(settings || {});
    }

    if (type === 'recipients') {
      // Get all unique recipients from squares
      const squares = await prisma.square.findMany({
        where: {
          OR: [
            { userId: { not: null } },
            { guestEmail: { not: null } },
          ],
        },
        include: { user: { select: { name: true, email: true } } },
      });

      const recipientMap = new Map<string, { name: string; email: string }>();
      for (const sq of squares) {
        const email = sq.user?.email || sq.guestEmail;
        const name = sq.user?.name || sq.guestName;
        if (email && name) {
          recipientMap.set(email, { name, email });
        }
      }

      return NextResponse.json(Array.from(recipientMap.values()));
    }

    return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
  }
}

// Send emails
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
    const { recipients, subject, body: emailBody } = body;

    if (!recipients?.length || !subject || !emailBody) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const settings = await prisma.gameSettings.findUnique({
      where: { id: 'singleton' },
      include: { paymentMethods: true },
    }) as any;

    const gameUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const enabledPayments = settings?.paymentMethods?.filter((pm: any) => pm.enabled) || [];
    const paymentMethodsText = enabledPayments.length > 0
      ? enabledPayments.map((pm: any) => `${pm.type}: ${pm.value}`).join('\n')
      : 'Contact the commissioner for payment details.';

    // Look up ALL squares (unfiltered) for winner lookup, and filtered for recipient matching
    const allSquares = await prisma.square.findMany({
      include: { user: { select: { name: true, email: true } } },
    });

    // Look up winners for game_results template
    const scores = await prisma.score.findUnique({ where: { id: 'singleton' } });
    const gridNumbers = await prisma.gridNumber.findMany({ orderBy: { position: 'asc' } });
    let winnersText = '';
    if (scores && gridNumbers.length === 10) {
      const { findWinnerPosition } = await import('@/lib/utils');
      const totalPot = (settings?.betAmount || 0) * 100;
      const quarters = [
        { key: 'first', nfc: scores.nfcFirst, afc: scores.afcFirst, label: 'Q1', pct: settings?.winFirstPct || 20 },
        { key: 'half', nfc: scores.nfcHalf, afc: scores.afcHalf, label: 'Q2 (Half)', pct: settings?.winSecondPct || 20 },
        { key: 'third', nfc: scores.nfcThird, afc: scores.afcThird, label: 'Q3', pct: settings?.winThirdPct || 20 },
        { key: 'final', nfc: scores.nfcFinal, afc: scores.afcFinal, label: 'Final', pct: settings?.winFinalPct || 30 },
      ];
      const lines: string[] = [];
      for (const q of quarters) {
        if (q.nfc !== null && q.afc !== null) {
          const pos = findWinnerPosition(q.nfc, q.afc, gridNumbers);
          if (pos) {
            const sq = allSquares.find((s) => s.position === pos);
            const winnerName = sq?.user?.name || sq?.guestName || 'Unknown';
            const prize = (totalPot * q.pct / 100).toFixed(2);
            lines.push(`${q.label}: ${winnerName} (Square ${pos}) - $${prize}`);
          }
        }
      }
      winnersText = lines.length > 0 ? lines.join('\n') : 'No winners determined yet.';
    }

    let sent = 0;
    for (const recipient of recipients) {
      // Find this recipient's squares
      const recipientSquares = allSquares.filter(
        (s) => (s.user?.email === recipient.email) || (s.guestEmail === recipient.email)
      );
      const positions = recipientSquares.map((s) => s.position);
      const amountDue = ((settings?.betAmount || 10) * positions.length).toFixed(2);

      const variables: Record<string, string> = {
        name: recipient.name,
        email: recipient.email,
        squares: positions.join(', ') || 'None',
        amountDue,
        commissioner: settings?.commissioner || '',
        eventName: settings?.eventName || '',
        gameUrl,
        graceHours: String(settings?.graceHours || 48),
        paymentInstructions: settings?.paymentInstructions || '',
        paymentMethods: paymentMethodsText,
        winners: winnersText,
        rulesText: settings?.rulesText || '',
      };

      const renderedSubject = renderTemplate(subject, variables);
      const renderedBody = renderTemplate(emailBody, variables);

      try {
        await sendEmail(recipient.email, renderedSubject, renderedBody);
        sent++;
      } catch (err) {
        console.error(`Failed to send to ${recipient.email}:`, err);
      }
    }

    return NextResponse.json({ sent });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Send failed' }, { status: 500 });
  }
}

// Send test email
export async function PATCH(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await request.json();
    const { to } = body;

    if (!to) {
      return NextResponse.json({ error: 'Recipient email required' }, { status: 400 });
    }

    await sendEmail(to, 'Super Bowl Squares - Test Email', 'This is a test email from your Super Bowl Squares app. If you received this, your SMTP settings are configured correctly!');
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Test email failed' }, { status: 500 });
  }
}

// Update templates or SMTP settings
export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await request.json();

    if (body.type === 'smtp') {
      await prisma.emailSettings.upsert({
        where: { id: 'singleton' },
        update: {
          smtpHost: body.smtpHost,
          smtpPort: body.smtpPort,
          smtpUser: body.smtpUser,
          smtpPass: body.smtpPass,
          useSsl: body.useSsl,
          fromEmail: body.fromEmail,
          fromName: body.fromName,
        },
        create: {
          id: 'singleton',
          smtpHost: body.smtpHost,
          smtpPort: body.smtpPort,
          smtpUser: body.smtpUser,
          smtpPass: body.smtpPass,
          useSsl: body.useSsl,
          fromEmail: body.fromEmail,
          fromName: body.fromName,
        },
      });

      return NextResponse.json({ success: true });
    }

    if (body.type === 'template') {
      if (body.id) {
        await prisma.emailTemplate.update({
          where: { id: body.id },
          data: {
            name: body.name,
            subject: body.subject,
            body: body.templateBody,
          },
        });
      } else {
        await prisma.emailTemplate.create({
          data: {
            name: body.name,
            subject: body.subject,
            body: body.templateBody,
          },
        });
      }

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
  } catch {
    return NextResponse.json({ error: 'Save failed' }, { status: 500 });
  }
}
