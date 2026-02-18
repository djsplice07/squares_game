import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { hash } from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import { sendWelcomeEmail } from '@/lib/autoEmail';

// Register a new player (public) or admin creates user (authenticated)
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, password, role } = body;

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: 'Name, email, and password are required' },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters' },
        { status: 400 }
      );
    }

    // Only admins can create non-PLAYER accounts
    const assignedRole = role || 'PLAYER';
    if (assignedRole !== 'PLAYER') {
      const session = await getServerSession(authOptions);
      if (!session || (session.user as any).role !== 'ADMIN') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
      }
    }

    const passwordHash = await hash(password, 12);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        role: assignedRole,
      },
    });

    // Send welcome email for new players
    if (user.role === 'PLAYER') {
      sendWelcomeEmail(user.name, user.email);
    }

    return NextResponse.json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: 'Registration failed' }, { status: 500 });
  }
}

// List all users (admin only)
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        _count: { select: { squares: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(users);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}
