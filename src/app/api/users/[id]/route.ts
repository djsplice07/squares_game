import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { hash } from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';

// Update user (admin or self)
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isAdmin = (session.user as any).role === 'ADMIN';
    const isSelf = (session.user as any).id === params.id;

    if (!isAdmin && !isSelf) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await request.json();
    const updateData: any = {};

    // Players can only update their own name and password
    if (body.name) updateData.name = body.name;
    if (body.password) {
      if (body.password.length < 8) {
        return NextResponse.json(
          { error: 'Password must be at least 8 characters' },
          { status: 400 }
        );
      }
      updateData.passwordHash = await hash(body.password, 12);
    }

    // Only admins can change roles
    if (body.role && isAdmin) {
      updateData.role = body.role;
    }

    const user = await prisma.user.update({
      where: { id: params.id },
      data: updateData,
      select: { id: true, name: true, email: true, role: true },
    });

    return NextResponse.json(user);
  } catch {
    return NextResponse.json({ error: 'Update failed' }, { status: 500 });
  }
}

// Delete user (admin only)
export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Don't allow deleting yourself
    if ((session.user as any).id === params.id) {
      return NextResponse.json(
        { error: 'Cannot delete your own account' },
        { status: 400 }
      );
    }

    await prisma.user.delete({ where: { id: params.id } });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Delete failed' }, { status: 500 });
  }
}
