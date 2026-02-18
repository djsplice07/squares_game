import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { writeFile, readdir } from 'fs/promises';
import path from 'path';
import { existsSync } from 'fs';

const UPLOADS_DIR = path.join(process.cwd(), 'public', 'uploads');
const IMAGES_DIR = path.join(process.cwd(), 'public', 'images');

const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/svg+xml'];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: 'Invalid file type. Allowed: PNG, JPEG, GIF, WebP, SVG' }, { status: 400 });
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: 'File too large. Max 5MB.' }, { status: 400 });
    }

    // Sanitize filename: keep only alphanumeric, hyphens, underscores, dots
    const ext = path.extname(file.name).toLowerCase();
    const baseName = path.basename(file.name, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
    const timestamp = Date.now();
    const fileName = `${baseName}_${timestamp}${ext}`;

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    await writeFile(path.join(UPLOADS_DIR, fileName), buffer);

    return NextResponse.json({ url: `/uploads/${fileName}` });
  } catch {
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const images: { url: string; name: string; category: string }[] = [];

    // List uploaded images
    if (existsSync(UPLOADS_DIR)) {
      const uploads = await readdir(UPLOADS_DIR);
      for (const file of uploads) {
        if (/\.(png|jpe?g|gif|webp|svg)$/i.test(file)) {
          images.push({ url: `/uploads/${file}`, name: file, category: 'uploads' });
        }
      }
    }

    // List stock images
    if (existsSync(IMAGES_DIR)) {
      const stock = await readdir(IMAGES_DIR);
      for (const file of stock) {
        if (/\.(png|jpe?g|gif|webp|svg)$/i.test(file)) {
          images.push({ url: `/images/${file}`, name: file, category: 'stock' });
        }
      }
    }

    return NextResponse.json({ images });
  } catch {
    return NextResponse.json({ error: 'Failed to list images' }, { status: 500 });
  }
}
