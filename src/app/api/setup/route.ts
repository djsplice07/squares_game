import { NextResponse } from 'next/server';
import { hash } from 'bcryptjs';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    // Check if any admin already exists
    const existingAdmin = await prisma.user.findFirst({
      where: { role: 'ADMIN' },
    });

    if (existingAdmin) {
      return NextResponse.json(
        { error: 'Setup has already been completed' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { admin, settings } = body;

    if (!admin?.name || !admin?.email || !admin?.password) {
      return NextResponse.json(
        { error: 'Admin name, email, and password are required' },
        { status: 400 }
      );
    }

    if (admin.password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters' },
        { status: 400 }
      );
    }

    const passwordHash = await hash(admin.password, 12);

    // Create admin user
    await prisma.user.create({
      data: {
        name: admin.name,
        email: admin.email,
        passwordHash,
        role: 'ADMIN',
      },
    });

    // Update game settings
    if (settings) {
      await prisma.gameSettings.upsert({
        where: { id: 'singleton' },
        update: {
          title: settings.title || 'Super Bowl Squares',
          commissioner: settings.commissioner || '',
          eventName: settings.eventName || 'Super Bowl',
          betAmount: settings.betAmount || 10,
        },
        create: {
          id: 'singleton',
          title: settings.title || 'Super Bowl Squares',
          commissioner: settings.commissioner || '',
          eventName: settings.eventName || 'Super Bowl',
          betAmount: settings.betAmount || 10,
        },
      });
    }

    // Ensure 100 squares exist
    for (let row = 0; row < 10; row++) {
      for (let col = 0; col < 10; col++) {
        const position = `${row}${col}`;
        await prisma.square.upsert({
          where: { position },
          update: {},
          create: { position },
        });
      }
    }

    // Ensure score row exists
    await prisma.score.upsert({
      where: { id: 'singleton' },
      update: {},
      create: { id: 'singleton' },
    });

    // Ensure email settings exist
    await prisma.emailSettings.upsert({
      where: { id: 'singleton' },
      update: {},
      create: { id: 'singleton' },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Setup error:', error);
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Setup failed' },
      { status: 500 }
    );
  }
}
