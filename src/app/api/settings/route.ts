import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';

export async function GET() {
  try {
    const settings = await prisma.gameSettings.findUnique({
      where: { id: 'singleton' },
      include: { paymentMethods: true },
    });

    return NextResponse.json(settings || {});
  } catch {
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await request.json();
    const { paymentMethods, ...settingsData } = body;

    // Update settings
    await prisma.gameSettings.upsert({
      where: { id: 'singleton' },
      update: settingsData,
      create: { id: 'singleton', ...settingsData },
    });

    // Update payment methods
    if (paymentMethods) {
      // Delete existing
      await prisma.paymentMethod.deleteMany({
        where: { gameSettingsId: 'singleton' },
      });

      // Create new
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

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 });
  }
}
