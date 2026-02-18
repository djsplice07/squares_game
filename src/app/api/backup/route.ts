import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';

// Export backup
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'config';

    const backup: any = {
      version: '1.0',
      type,
      exportedAt: new Date().toISOString(),
    };

    // Config data (always included)
    backup.gameSettings = await prisma.gameSettings.findUnique({
      where: { id: 'singleton' },
      include: { paymentMethods: true },
    });

    backup.emailSettings = await prisma.emailSettings.findUnique({
      where: { id: 'singleton' },
    });

    backup.emailTemplates = await prisma.emailTemplate.findMany();

    if (type === 'full') {
      backup.squares = await prisma.square.findMany({
        include: { user: { select: { name: true, email: true } } },
      });

      backup.gridNumbers = await prisma.gridNumber.findMany();

      backup.scores = await prisma.score.findUnique({
        where: { id: 'singleton' },
      });

      backup.chatMessages = await prisma.chatMessage.findMany({
        include: { user: { select: { name: true } } },
      });

      backup.chatBlacklist = await prisma.chatBlacklist.findMany();

      // Users without passwords
      backup.users = await prisma.user.findMany({
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true,
        },
      });
    }

    return NextResponse.json(backup);
  } catch {
    return NextResponse.json({ error: 'Export failed' }, { status: 500 });
  }
}

// Restore backup
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const backup = await request.json();

    if (!backup.version || !backup.type) {
      return NextResponse.json({ error: 'Invalid backup format' }, { status: 400 });
    }

    // Restore game settings
    if (backup.gameSettings) {
      const { paymentMethods, ...settingsData } = backup.gameSettings;

      await prisma.gameSettings.upsert({
        where: { id: 'singleton' },
        update: {
          title: settingsData.title,
          commissioner: settingsData.commissioner,
          eventName: settingsData.eventName,
          eventDate: settingsData.eventDate,
          eventTime: settingsData.eventTime,
          sbLogo: settingsData.sbLogo,
          nfcTeam: settingsData.nfcTeam,
          nfcLogo: settingsData.nfcLogo,
          afcTeam: settingsData.afcTeam,
          afcLogo: settingsData.afcLogo,
          betAmount: settingsData.betAmount,
          winFirstPct: settingsData.winFirstPct,
          winSecondPct: settingsData.winSecondPct,
          winThirdPct: settingsData.winThirdPct,
          winFinalPct: settingsData.winFinalPct,
          donationPct: settingsData.donationPct,
          graceHours: settingsData.graceHours,
          rulesText: settingsData.rulesText,
        },
        create: { id: 'singleton', ...settingsData },
      });

      if (paymentMethods) {
        await prisma.paymentMethod.deleteMany({
          where: { gameSettingsId: 'singleton' },
        });

        for (const pm of paymentMethods) {
          await prisma.paymentMethod.create({
            data: {
              gameSettingsId: 'singleton',
              type: pm.type,
              value: pm.value,
              enabled: pm.enabled ?? true,
            },
          });
        }
      }
    }

    // Restore email settings
    if (backup.emailSettings) {
      const es = backup.emailSettings;
      await prisma.emailSettings.upsert({
        where: { id: 'singleton' },
        update: {
          smtpHost: es.smtpHost,
          smtpPort: es.smtpPort,
          smtpUser: es.smtpUser,
          smtpPass: es.smtpPass,
          useSsl: es.useSsl,
          fromEmail: es.fromEmail,
          fromName: es.fromName,
        },
        create: { id: 'singleton', ...es },
      });
    }

    // Restore email templates
    if (backup.emailTemplates) {
      for (const tmpl of backup.emailTemplates) {
        await prisma.emailTemplate.upsert({
          where: { name: tmpl.name },
          update: { subject: tmpl.subject, body: tmpl.body },
          create: { name: tmpl.name, subject: tmpl.subject, body: tmpl.body },
        });
      }
    }

    // Full backup restoration
    if (backup.type === 'full') {
      // Restore squares
      if (backup.squares) {
        for (const sq of backup.squares) {
          await prisma.square.upsert({
            where: { position: sq.position },
            update: {
              guestName: sq.guestName,
              guestEmail: sq.guestEmail,
              notes: sq.notes,
              confirmed: sq.confirmed,
              signupDate: sq.signupDate ? new Date(sq.signupDate) : null,
              firstWin: sq.firstWin,
              halfWin: sq.halfWin,
              thirdWin: sq.thirdWin,
              finalWin: sq.finalWin,
            },
            create: {
              position: sq.position,
              guestName: sq.guestName,
              guestEmail: sq.guestEmail,
              notes: sq.notes,
              confirmed: sq.confirmed,
              signupDate: sq.signupDate ? new Date(sq.signupDate) : null,
              firstWin: sq.firstWin,
              halfWin: sq.halfWin,
              thirdWin: sq.thirdWin,
              finalWin: sq.finalWin,
            },
          });
        }
      }

      // Restore grid numbers
      if (backup.gridNumbers) {
        await prisma.gridNumber.deleteMany();
        for (const gn of backup.gridNumbers) {
          await prisma.gridNumber.create({
            data: {
              position: gn.position,
              nfcNumber: gn.nfcNumber,
              afcNumber: gn.afcNumber,
            },
          });
        }
      }

      // Restore scores
      if (backup.scores) {
        const s = backup.scores;
        await prisma.score.upsert({
          where: { id: 'singleton' },
          update: {
            nfcFirst: s.nfcFirst,
            afcFirst: s.afcFirst,
            nfcHalf: s.nfcHalf,
            afcHalf: s.afcHalf,
            nfcThird: s.nfcThird,
            afcThird: s.afcThird,
            nfcFinal: s.nfcFinal,
            afcFinal: s.afcFinal,
          },
          create: { id: 'singleton', ...s },
        });
      }

      // Restore chat blacklist
      if (backup.chatBlacklist) {
        for (const bl of backup.chatBlacklist) {
          await prisma.chatBlacklist.upsert({
            where: { word: bl.word },
            update: {},
            create: { word: bl.word },
          });
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Restore error:', error);
    return NextResponse.json({ error: 'Restore failed' }, { status: 500 });
  }
}
